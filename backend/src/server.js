require('dotenv').config();
const express = require('express');
const cors = require('cors');
const configStore = require('./configStore');
const weatherCache = require('./weatherCache');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Endpoints
// 1. Configuration Storage
app.get('/api/config', async (req, res) => {
  try {
    const config = await configStore.loadConfig();
    const hasKey = config.owmApiKey && config.owmApiKey.trim() !== '';
    const clientConfig = {
      ...config,
      owmApiKey: hasKey ? '••••••••' : '',
      pinRequired: !!process.env.ADMIN_PIN
    };
    res.json(clientConfig);
  } catch (error) {
    console.error('Failed to load config:', error);
    res.status(500).json({ error: 'Failed to load configuration' });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const adminPin = process.env.ADMIN_PIN;
    const incomingConfig = req.body;
    const existingConfig = await configStore.loadConfig();

    if (adminPin) {
      // Check if layout or security-sensitive fields are being modified
      const isWidgetsChanged = JSON.stringify(incomingConfig.widgets) !== JSON.stringify(existingConfig.widgets);
      const isFontChanged = incomingConfig.globalFont !== existingConfig.globalFont;
      const isApiKeyChanged = incomingConfig.owmApiKey !== '••••••••' && incomingConfig.owmApiKey !== existingConfig.owmApiKey;
      const isUnitsChanged = incomingConfig.units !== existingConfig.units;

      if (isWidgetsChanged || isFontChanged || isApiKeyChanged || isUnitsChanged) {
        const clientPin = req.headers['x-admin-pin'];
        if (clientPin !== adminPin) {
          return res.status(401).json({ error: 'Unauthorized: Invalid Admin PIN for dashboard layout modifications' });
        }
      }
    }

    // Preserve the actual API key if the client sent the mask
    if (incomingConfig.owmApiKey === '••••••••') {
      incomingConfig.owmApiKey = existingConfig.owmApiKey || '';
    }

    await configStore.saveConfig(incomingConfig);

    const hasKey = incomingConfig.owmApiKey && incomingConfig.owmApiKey.trim() !== '';
    res.json({
      success: true,
      config: {
        ...incomingConfig,
        owmApiKey: hasKey ? '••••••••' : '',
        pinRequired: !!adminPin
      }
    });
  } catch (error) {
    console.error('Failed to save config:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

function canUseLocal(reqQuery) {
  if (!process.env.OPEN_METEO_URL && !process.env.AIR_QUALITY_URL) {
    return false;
  }
  
  const localSyncVarsEnv = process.env.LOCAL_SYNC_VARIABLES;
  if (localSyncVarsEnv === 'all' || localSyncVarsEnv === '*') {
    return true;
  }
  
  const syncedVars = (localSyncVarsEnv || 'temperature_2m,relative_humidity_2m')
    .split(',')
    .map(v => v.trim());
    
  if (reqQuery.current) {
    const requested = reqQuery.current.split(',');
    for (const v of requested) {
      if (!syncedVars.includes(v)) return false;
    }
  }
  
  if (reqQuery.hourly) {
    const requested = reqQuery.hourly.split(',');
    for (const v of requested) {
      if (!syncedVars.includes(v)) return false;
    }
  }
  
  if (reqQuery.daily) {
    const requested = reqQuery.daily.split(',');
    for (const v of requested) {
      if (!syncedVars.includes(v)) return false;
    }
  }
  
  return true;
}

function hasMissingData(data, reqQuery) {
  if (!data) return true;
  
  // Check current variables
  if (reqQuery.current) {
    if (!data.current) return true;
    const requested = reqQuery.current.split(',');
    for (const v of requested) {
      if (data.current[v] === undefined || data.current[v] === null) {
        return true;
      }
    }
  }

  // Check hourly variables
  if (reqQuery.hourly) {
    if (!data.hourly) return true;
    const requested = reqQuery.hourly.split(',');
    for (const v of requested) {
      if (!data.hourly[v] || data.hourly[v][0] === null || data.hourly[v][0] === undefined) {
        return true;
      }
    }
  }

  // Check daily variables
  if (reqQuery.daily) {
    if (!data.daily) return true;
    const requested = reqQuery.daily.split(',');
    for (const v of requested) {
      if (!data.daily[v] || data.daily[v][0] === null || data.daily[v][0] === undefined) {
        return true;
      }
    }
  }

  return false;
}

// Helper for fetching with local/public fallback validating data completeness
async function fetchWithFallback(localBase, publicBase, queryParams, parsedQuery, useLocal = true) {
  const localUrl = `${localBase}?${queryParams}`;
  const publicUrl = `${publicBase}?${queryParams}`;

  // Try local first if permitted
  if (useLocal) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000); // 3 second timeout for local

      const response = await fetch(localUrl, { signal: controller.signal });
      clearTimeout(id);

      if (response.ok) {
        const data = await response.json();
        if (!hasMissingData(data, parsedQuery)) {
          return { data, source: 'local' };
        }
        console.log(`Local Open-Meteo returned incomplete data structure for this query. Using public API fallback...`);
      } else {
        console.warn(`Local API responded with status: ${response.status}. Falling back...`);
      }
    } catch (error) {
      console.warn(`Local Open-Meteo failed (${error.message || 'Timeout'}). Falling back to public API...`);
    }
  }

  // Fallback to public
  const response = await fetch(publicUrl);
  if (!response.ok) {
    throw new Error(`Public API responded with status: ${response.status}`);
  }
  const data = await response.json();
  return { data, source: 'public' };
}

// 2. Weather Proxy & Cache
app.get('/api/weather', async (req, res) => {
  const params = req.query;
  
  if (!params.latitude || !params.longitude) {
    return res.status(400).json({ error: 'latitude and longitude are required parameters' });
  }

  const cacheKey = weatherCache.generateKey('weather', params);
  const cachedData = weatherCache.get(cacheKey);

  if (cachedData) {
    return res.json({ ...cachedData, cached: true });
  }

  try {
    const openMeteoParams = { ...params };
    delete openMeteoParams.owm_api_key;
    const queryParamsString = new URLSearchParams(openMeteoParams).toString();
    const localBase = process.env.OPEN_METEO_URL || 'http://open-meteo:8080/v1/forecast';
    const publicBase = 'https://api.open-meteo.com/v1/forecast';

    let { data, source } = await fetchWithFallback(localBase, publicBase, queryParamsString, openMeteoParams, canUseLocal(openMeteoParams));
    
    // Retrieve saved OpenWeatherMap API Key from backend storage to protect key leakage
    let owmApiKey = null;
    try {
      const savedConfig = await configStore.loadConfig();
      if (savedConfig && savedConfig.owmApiKey && savedConfig.owmApiKey.trim() !== '') {
        owmApiKey = savedConfig.owmApiKey.trim();
      }
    } catch (err) {
      console.warn('Failed to load saved configuration to check OWM key:', err.message);
    }

    if (owmApiKey && owmApiKey !== '••••••••') {
      try {
        const tempUnit = params.temperature_unit === 'fahrenheit' ? 'imperial' : 'metric';
        const owmUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${params.latitude}&lon=${params.longitude}&appid=${owmApiKey}&units=${tempUnit}`;
        
        const owmResponse = await fetch(owmUrl);
        if (owmResponse.ok) {
          const owmData = await owmResponse.json();
          
          if (owmData && owmData.main && data.current) {
            // Helper to map OWM weather ID to WMO weather code
            const mapOwmToWmo = (id) => {
              if (id >= 200 && id < 300) return 95; // Thunderstorm
              if (id >= 300 && id < 400) return 51; // Drizzle
              if (id >= 500 && id < 600) return 61; // Rain
              if (id >= 600 && id < 700) return 71; // Snow
              if (id === 701 || id === 741) return 45; // Fog
              if (id === 800) return 0; // Clear
              if (id === 801) return 1; // Mainly clear
              if (id === 802) return 2; // Partly cloudy
              if (id >= 803) return 3; // Overcast
              return 0; // Default
            };

            // Map and merge OWM data into Open-Meteo current weather object
            data.current.temperature_2m = owmData.main.temp;
            data.current.relative_humidity_2m = owmData.main.humidity;
            data.current.apparent_temperature = owmData.main.feels_like != null ? owmData.main.feels_like : owmData.main.temp;
            data.current.pressure_msl = owmData.main.pressure;
            
            // Wind speed: OWM returns m/s for metric, miles/hour for imperial.
            // Open-Meteo expects km/h for metric, miles/hour for imperial.
            let windSpeed = owmData.wind ? owmData.wind.speed : null;
            if (windSpeed != null && tempUnit === 'metric') {
              windSpeed = windSpeed * 3.6; // Convert m/s to km/h
            }
            data.current.wind_speed_10m = windSpeed;
            data.current.wind_direction_10m = owmData.wind ? owmData.wind.deg : null;

            let windGusts = owmData.wind && owmData.wind.gust ? owmData.wind.gust : null;
            if (windGusts != null && tempUnit === 'metric') {
              windGusts = windGusts * 3.6;
            }
            data.current.wind_gusts_10m = windGusts;

            if (owmData.weather && owmData.weather[0]) {
              data.current.weather_code = mapOwmToWmo(owmData.weather[0].id);
            }
            
            if (owmData.clouds) {
              data.current.cloud_cover = owmData.clouds.all;
            }
            
            // Mark source as OWM enhanced
            source = `${source} + OpenWeatherMap`;
          }
        } else {
          console.warn(`OpenWeatherMap API returned status: ${owmResponse.status}`);
        }
      } catch (owmErr) {
        console.warn(`Failed to merge OpenWeatherMap observations, falling back to standard data:`, owmErr.message);
      }
    }
    
    const responsePayload = { data, source };
    weatherCache.set(cacheKey, responsePayload);

    res.json({ ...responsePayload, cached: false });
  } catch (error) {
    console.error('Failed to fetch weather:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// 3. Air Quality Proxy & Cache
app.get('/api/air_quality', async (req, res) => {
  const params = req.query;

  if (!params.latitude || !params.longitude) {
    return res.status(400).json({ error: 'latitude and longitude are required parameters' });
  }

  const cacheKey = weatherCache.generateKey('air_quality', params);
  const cachedData = weatherCache.get(cacheKey);

  if (cachedData) {
    return res.json({ ...cachedData, cached: true });
  }

  try {
    const queryParamsString = new URLSearchParams(params).toString();
    const localBase = process.env.AIR_QUALITY_URL || 'http://open-meteo:8080/v1/air-quality';
    const publicBase = 'https://air-quality-api.open-meteo.com/v1/air-quality';

    const { data, source } = await fetchWithFallback(localBase, publicBase, queryParamsString, params, canUseLocal(params));

    const responsePayload = { data, source };
    weatherCache.set(cacheKey, responsePayload);

    res.json({ ...responsePayload, cached: false });
  } catch (error) {
    console.error('Failed to fetch air quality:', error);
    res.status(500).json({ error: 'Failed to fetch air quality data' });
  }
});

// 4. Geocoding Proxy (cached for 24 hours since cities don't move)
const geocodingCache = new (require('./weatherCache').constructor)(24 * 60 * 60 * 1000);

app.get('/api/geocoding', async (req, res) => {
  const params = req.query;

  if (!params.name) {
    return res.status(400).json({ error: 'name query parameter is required' });
  }

  const cacheKey = geocodingCache.generateKey('geocoding', params);
  const cachedData = geocodingCache.get(cacheKey);

  if (cachedData) {
    return res.json({ ...cachedData, cached: true });
  }

  try {
    const queryParamsString = new URLSearchParams(params).toString();
    const geocodingUrl = `${process.env.GEOCODING_URL || 'https://geocoding-api.open-meteo.com/v1/search'}?${queryParamsString}`;

    console.log(`Fetching geocoding: ${geocodingUrl}`);
    const response = await fetch(geocodingUrl);
    if (!response.ok) {
      throw new Error(`Geocoding API responded with status: ${response.status}`);
    }
    const data = await response.json();
    
    const responsePayload = { data };
    geocodingCache.set(cacheKey, responsePayload);

    res.json({ ...responsePayload, cached: false });
  } catch (error) {
    console.error('Failed to fetch geocoding data:', error);
    res.status(500).json({ error: 'Failed to fetch geocoding data' });
  }
});

// 5. Historical Weather Proxy (cached for 30 days since history doesn't change)
const historicalCache = new (require('./weatherCache').constructor)(30 * 24 * 60 * 60 * 1000);

app.get('/api/historical', async (req, res) => {
  const params = req.query;

  if (!params.latitude || !params.longitude || !params.date) {
    return res.status(400).json({ error: 'latitude, longitude, and date are required' });
  }

  const cacheKey = historicalCache.generateKey('historical', params);
  const cachedData = historicalCache.get(cacheKey);

  if (cachedData) {
    return res.json({ ...cachedData, cached: true });
  }

  try {
    const queryParamsString = new URLSearchParams({
      latitude: params.latitude,
      longitude: params.longitude,
      start_date: params.date,
      end_date: params.date,
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
      timezone: params.timezone || 'auto'
    }).toString();

    const url = `https://archive-api.open-meteo.com/v1/archive?${queryParamsString}`;
    console.log(`Fetching historical weather: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Historical API responded with status: ${response.status}`);
    }
    const data = await response.json();
    
    const responsePayload = { data };
    historicalCache.set(cacheKey, responsePayload);

    res.json({ ...responsePayload, cached: false });
  } catch (error) {
    console.error('Failed to fetch historical weather:', error);
    res.status(500).json({ error: 'Failed to fetch historical weather' });
  }
});

// 6. Climate Comparison Proxy (humidity and rain over past 3 years)
app.get('/api/climate_comparison', async (req, res) => {
  const params = req.query;

  if (!params.latitude || !params.longitude) {
    return res.status(400).json({ error: 'latitude and longitude are required' });
  }

  const cacheKey = historicalCache.generateKey('climate_comparison', params);
  const cachedData = historicalCache.get(cacheKey);

  if (cachedData) {
    return res.json({ ...cachedData, cached: true });
  }

  try {
    const { latitude, longitude, timezone } = params;
    
    // Calculate past 3 years dates
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const curYear = today.getFullYear();
    
    const targetDates = [1, 2, 3].map(y => `${curYear - y}-${mm}-${dd}`);

    // Fetch archive data in parallel
    const fetches = targetDates.map(async (date) => {
      const query = new URLSearchParams({
        latitude,
        longitude,
        start_date: date,
        end_date: date,
        hourly: 'relative_humidity_2m,precipitation',
        timezone: timezone || 'auto'
      }).toString();
      
      const response = await fetch(`https://archive-api.open-meteo.com/v1/archive?${query}`);
      if (!response.ok) return null;
      return response.json();
    });

    const results = await Promise.all(fetches);

    // Compute averages
    let totalHumidity = 0;
    let totalPrecipitation = 0;
    let validHumidityCount = 0;
    let validPrecipitationCount = 0;

    results.forEach(result => {
      if (!result || !result.hourly) return;
      
      const rh = result.hourly.relative_humidity_2m;
      if (rh && rh.length > 0) {
        const sum = rh.reduce((acc, val) => acc + (val != null ? val : 0), 0);
        totalHumidity += sum / rh.length;
        validHumidityCount++;
      }

      const prec = result.hourly.precipitation;
      if (prec && prec.length > 0) {
        const sum = prec.reduce((acc, val) => acc + (val != null ? val : 0), 0);
        totalPrecipitation += sum; // Sum hourly precipitation to get daily total
        validPrecipitationCount++;
      }
    });

    const climateData = {
      avgHumidity: validHumidityCount > 0 ? totalHumidity / validHumidityCount : null,
      avgPrecipitation: validPrecipitationCount > 0 ? totalPrecipitation / validPrecipitationCount : null,
      yearsCompared: validHumidityCount
    };

    const responsePayload = { data: climateData };
    historicalCache.set(cacheKey, responsePayload);

    res.json({ ...responsePayload, cached: false });
  } catch (error) {
    console.error('Failed to fetch climate comparison:', error);
    res.status(500).json({ error: 'Failed to fetch climate comparison' });
  }
});

// 7. Layout Profiles Manager
app.get('/api/profiles', async (req, res) => {
  try {
    const profiles = await configStore.loadProfiles();
    res.json(profiles);
  } catch (error) {
    console.error('Failed to load profiles:', error);
    res.status(500).json({ error: 'Failed to load layout profiles' });
  }
});

app.post('/api/profiles', async (req, res) => {
  try {
    const adminPin = process.env.ADMIN_PIN;
    if (adminPin) {
      const clientPin = req.headers['x-admin-pin'];
      if (clientPin !== adminPin) {
        return res.status(401).json({ error: 'Unauthorized: Invalid Admin PIN' });
      }
    }
    const profiles = await configStore.loadProfiles();
    const newProfile = {
      id: req.body.id || `profile-${Date.now()}`,
      name: req.body.name || 'Unnamed Layout',
      city: req.body.city,
      widgets: req.body.widgets,
      units: req.body.units,
      globalFont: req.body.globalFont
    };
    
    // Replace if same id or name, or add new
    const idx = profiles.findIndex(p => p.id === newProfile.id || p.name === newProfile.name);
    if (idx >= 0) {
      profiles[idx] = newProfile;
    } else {
      profiles.push(newProfile);
    }
    
    await configStore.saveProfiles(profiles);
    res.json(profiles);
  } catch (error) {
    console.error('Failed to save profile:', error);
    res.status(500).json({ error: 'Failed to save layout profile' });
  }
});

app.delete('/api/profiles/:id', async (req, res) => {
  try {
    const adminPin = process.env.ADMIN_PIN;
    if (adminPin) {
      const clientPin = req.headers['x-admin-pin'];
      if (clientPin !== adminPin) {
        return res.status(401).json({ error: 'Unauthorized: Invalid Admin PIN' });
      }
    }
    let profiles = await configStore.loadProfiles();
    profiles = profiles.filter(p => p.id !== req.params.id);
    await configStore.saveProfiles(profiles);
    res.json(profiles);
  } catch (error) {
    console.error('Failed to delete profile:', error);
    res.status(500).json({ error: 'Failed to delete layout profile' });
  }
});

// 8. Verify Admin PIN Endpoint
app.post('/api/verify-pin', (req, res) => {
  const { pin } = req.body;
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    return res.json({ success: true, message: 'No PIN protection enabled' });
  }
  if (pin === adminPin) {
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, error: 'Invalid Admin PIN' });
});

const path = require('path');
const fs = require('fs');

// Serve static frontend files if compiled inside the container bundle
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  console.log(`Bundled frontend found at ${frontendDistPath}. Serving static assets.`);
  app.use(express.static(frontendDistPath));
  
  // SPA routing fallback for React history navigation
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  console.log(`Running in API-only mode. Frontend dist folder not found.`);
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Weatharr Backend listening on http://0.0.0.0:${PORT}`);
});
