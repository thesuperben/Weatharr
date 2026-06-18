import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Lock, Unlock, RefreshCw, AlertTriangle, CloudSun, MapPin } from 'lucide-react';
import LocationSearch from './components/LocationSearch';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';

// Helper to generate SEO slugs for cities
function getCitySlug(name) {
  return name.toLowerCase()
             .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric except space and dash
             .trim()
             .replace(/\s+/g, '-'); // replace spaces with dashes
}

// Auto-Arrange Packing Helpers
const autoPackLayout = (widgets, cols = 12) => {
  const occupied = [];
  return widgets.map(w => {
    let width = 4;
    let height = 3;
    if (w.type === 'hourly') {
      width = 8;
      height = 4;
    } else if (w.type === 'daily') {
      width = 4;
      height = 5;
    } else {
      width = 4;
      height = 3;
    }

    let found = false;
    let x = 0;
    let y = 0;

    while (!found) {
      if (x + width > cols) {
        x = 0;
        y++;
        continue;
      }

      let overlap = false;
      for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
          const checkY = y + dy;
          const checkX = x + dx;
          if (occupied[checkY] && occupied[checkY][checkX]) {
            overlap = true;
            break;
          }
        }
        if (overlap) break;
      }

      if (!overlap) {
        found = true;
        for (let dy = 0; dy < height; dy++) {
          if (!occupied[y + dy]) occupied[y + dy] = [];
          for (let dx = 0; dx < width; dx++) {
            occupied[y + dy][x + dx] = true;
          }
        }
      } else {
        x++;
        if (x >= cols) {
          x = 0;
          y++;
        }
      }
    }

    return { ...w, x, y, w: width, h: height };
  });
};

const portraitLayout = (widgets) => {
  let currentY = 0;
  return widgets.map(w => {
    let height = 3;
    if (w.type === 'hourly') height = 4;
    else if (w.type === 'daily') height = 5;

    const packedWidget = {
      ...w,
      x: 0,
      y: currentY,
      w: 12,
      h: height
    };
    currentY += height;
    return packedWidget;
  });
};

export default function App() {
  // Global configurations & state
  const [widgets, setWidgets] = useState([]);
  const [owmApiKey, setOwmApiKey] = useState('');
  const [units, setUnitsState] = useState('metric');
  const [timezone, setTimezone] = useState('auto');
  const [globalFont, setGlobalFontState] = useState('Outfit');
  const [city, setCity] = useState({
    name: 'London',
    latitude: 51.5085,
    longitude: -0.1257,
    timezone: 'Europe/London',
    country: 'United Kingdom'
  });
  const [adminPin, setAdminPin] = useState('');
  const [pinRequired, setPinRequired] = useState(false);

  // Tabbed locations state
  const [tabs, setTabs] = useState([
    {
      id: 'tab-default',
      city: {
        name: 'London',
        latitude: 51.5085,
        longitude: -0.1257,
        timezone: 'Europe/London',
        country: 'United Kingdom'
      }
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-default');

  // Layout profiles state
  const [profiles, setProfiles] = useState([]);

  // Last updated timestamp
  const [lastUpdated, setLastUpdated] = useState('');

  // Layout invalidate key state
  const [layoutKey, setLayoutKey] = useState(0);

  // Clock state for selected station timezone
  const [localTime, setLocalTime] = useState('');

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditMode, setEditModeState] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [aqiData, setAqiData] = useState(null);
  
  // Status state
  const [loading, setLoading] = useState(true);
  const [fetchingData, setFetchingData] = useState(false);
  const [error, setError] = useState(null);

  // Synchronize configuration with Backend
  const saveConfig = async (updatedWidgets, updatedUnits, updatedCity, updatedFont, updatedTabs, updatedActiveTabId, updatedOwmApiKey) => {
    try {
      const payload = {
        theme: 'dark',
        units: updatedUnits !== undefined ? updatedUnits : units,
        timezone: timezone,
        city: updatedCity !== undefined ? updatedCity : city,
        widgets: updatedWidgets !== undefined ? updatedWidgets : widgets,
        globalFont: updatedFont !== undefined ? updatedFont : globalFont,
        tabs: updatedTabs !== undefined ? updatedTabs : tabs,
        activeTabId: updatedActiveTabId !== undefined ? updatedActiveTabId : activeTabId,
        owmApiKey: updatedOwmApiKey !== undefined ? updatedOwmApiKey : owmApiKey
      };

      const headers = { 'Content-Type': 'application/json' };
      if (adminPin) {
        headers['x-admin-pin'] = adminPin;
      }

      const response = await fetch('/api/config', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error('Failed to save dashboard configuration');
      }
      const data = await response.json();
      if (data && data.config) {
        if (data.config.owmApiKey) setOwmApiKey(data.config.owmApiKey);
        if (data.config.pinRequired !== undefined) setPinRequired(data.config.pinRequired);
      }
    } catch (err) {
      console.warn('Backend save error:', err.message);
    }
  };

  // Helper to resolve SEO slugs
  const resolveSlug = async (slug, currentTabs = tabs) => {
    const slugLower = slug.toLowerCase();
    
    // Check if we already have a tab with this city slug
    const existingTab = currentTabs.find(t => getCitySlug(t.city.name) === slugLower);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      setCity(existingTab.city);
      return;
    }
    
    // Otherwise geocode it
    try {
      setFetchingData(true);
      const cleanedName = slug.replace(/-/g, ' ');
      const res = await fetch(`/api/geocoding?name=${encodeURIComponent(cleanedName)}`);
      if (!res.ok) throw new Error('Geocoding search failed');
      const payload = await res.json();
      
      if (payload.data && payload.data.results && payload.data.results.length > 0) {
        const match = payload.data.results[0];
        const newCity = {
          name: match.name,
          latitude: match.latitude,
          longitude: match.longitude,
          timezone: match.timezone || 'auto',
          country: match.country || ''
        };
        
        const newTab = {
          id: `tab-${Date.now()}`,
          city: newCity
        };
        
        const updatedTabs = [...currentTabs, newTab];
        setTabs(updatedTabs);
        setActiveTabId(newTab.id);
        setCity(newCity);
        saveConfig(widgets, units, newCity, globalFont, updatedTabs, newTab.id);
      } else {
        // Fallback to the first tab if geocoding fails
        const activeTab = currentTabs[0];
        if (activeTab) {
          setCity(activeTab.city);
          setActiveTabId(activeTab.id);
          window.history.replaceState(null, '', '/' + getCitySlug(activeTab.city.name));
        }
      }
    } catch (err) {
      console.error('Failed to resolve slug:', err);
      // Fallback
      const activeTab = currentTabs[0];
      if (activeTab) {
        setCity(activeTab.city);
        setActiveTabId(activeTab.id);
        window.history.replaceState(null, '', '/' + getCitySlug(activeTab.city.name));
      }
    } finally {
      setFetchingData(false);
    }
  };

  // Fetch dashboard settings from Backend
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Could not connect to settings API');
        const config = await response.json();
        
        if (config) {
          if (config.widgets) setWidgets(config.widgets);
          if (config.units) setUnitsState(config.units);
          if (config.timezone) setTimezone(config.timezone);
          if (config.globalFont) setGlobalFontState(config.globalFont);
          if (config.owmApiKey) setOwmApiKey(config.owmApiKey);
          if (config.pinRequired !== undefined) setPinRequired(config.pinRequired);
          
          let initialCity = config.city;
          let initialTabs = config.tabs || [];
          let initialActiveTabId = config.activeTabId || '';
          
          if (initialTabs.length === 0 && initialCity) {
            initialTabs = [{ id: 'tab-default', city: initialCity }];
            initialActiveTabId = 'tab-default';
          }
          
          setTabs(initialTabs);
          setActiveTabId(initialActiveTabId);
          
          // Determine starting city based on URL slug or active tab
          const pathSlug = window.location.pathname.substring(1);
          if (pathSlug && pathSlug !== 'index.html') {
            await resolveSlug(pathSlug, initialTabs);
          } else {
            const activeTab = initialTabs.find(t => t.id === initialActiveTabId) || initialTabs[0];
            if (activeTab) {
              setCity(activeTab.city);
              window.history.replaceState(null, '', '/' + getCitySlug(activeTab.city.name));
            }
          }
        }
      } catch (err) {
        setError('Connection to Weatharr backend offline. Running in offline/fallback mode.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  // Fetch layout profiles on mount
  useEffect(() => {
    async function fetchProfiles() {
      try {
        const res = await fetch('/api/profiles');
        if (res.ok) {
          const data = await res.json();
          setProfiles(data);
        }
      } catch (err) {
        console.error('Failed to load profiles:', err);
      }
    }
    fetchProfiles();
  }, []);

  // Update clock for station timezone
  useEffect(() => {
    const tick = () => {
      try {
        const options = {
          timeZone: city.timezone || 'UTC',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        };
        setLocalTime(new Date().toLocaleTimeString([], options));
      } catch (e) {
        // Fallback to client local time on parse warning
        setLocalTime(new Date().toLocaleTimeString([], { hour12: false }));
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [city.timezone]);

  // Synchronize history routes on back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const pathSlug = window.location.pathname.substring(1);
      if (pathSlug && pathSlug !== 'index.html') {
        const slugLower = pathSlug.toLowerCase();
        const foundTab = tabs.find(t => getCitySlug(t.city.name) === slugLower);
        if (foundTab) {
          setActiveTabId(foundTab.id);
          setCity(foundTab.city);
        } else {
          resolveSlug(pathSlug, tabs);
        }
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [tabs]);

  // Fetch weather and AQI data from backend proxies
  const fetchWeather = useCallback(async (targetCity, targetUnits, targetOwmApiKey) => {
    if (!targetCity) return;
    
    setFetchingData(true);
    const resolvedTimezone = targetCity.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Determine units
    const tempUnit = targetUnits === 'imperial' ? 'fahrenheit' : 'celsius';
    const windUnit = targetUnits === 'metric' ? 'kmh' : 'mph';
    const precipUnit = targetUnits === 'imperial' ? 'inch' : 'mm';

    // Omit OWM API key parameters in client URL queries to prevent credentials exposure in network panels
    const weatherParams = new URLSearchParams({
      latitude: targetCity.latitude,
      longitude: targetCity.longitude,
      timezone: resolvedTimezone,
      past_days: '3',
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index',
      hourly: 'temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,pressure_msl,wind_speed_10m,uv_index',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max',
      temperature_unit: tempUnit,
      wind_speed_unit: windUnit,
      precipitation_unit: precipUnit,
      forecast_days: '16'
    });

    const aqiParams = new URLSearchParams({
      latitude: targetCity.latitude,
      longitude: targetCity.longitude,
      timezone: resolvedTimezone,
      current: 'european_aqi,us_aqi,pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen'
    });

    try {
      // Fetch Forecast Data
      const weatherResponse = await fetch(`/api/weather?${weatherParams.toString()}`);
      if (!weatherResponse.ok) throw new Error('Weather forecast retrieval failed');
      const weatherPayload = await weatherResponse.json();
      setWeatherData(weatherPayload.data);

      // Fetch AQI Data
      const aqiResponse = await fetch(`/api/air_quality?${aqiParams.toString()}`);
      if (aqiResponse.ok) {
        const aqiPayload = await aqiResponse.json();
        setAqiData(aqiPayload.data);
      }

      // Record lastUpdated time
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to refresh latest weather records. Re-trying shortly.');
    } finally {
      setFetchingData(false);
    }
  }, []);

  // Fetch on mount or state modifications
  useEffect(() => {
    if (!loading) {
      fetchWeather(city, units);
    }
  }, [loading, city, units, fetchWeather]);

  // Periodic polling for weather data updates (every 10 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchWeather(city, units);
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [city, units, fetchWeather]);

  // Layout Modification Handler
  const handleLayoutChange = (updatedWidgets) => {
    setWidgets(updatedWidgets);
    saveConfig(updatedWidgets, units, city, globalFont, tabs, activeTabId);
  };

  // Widget Deletion Handler
  const handleDeleteWidget = (id) => {
    const updated = widgets.filter(w => w.id !== id);
    setWidgets(updated);
    saveConfig(updated, units, city, globalFont, tabs, activeTabId);
  };

  // Widget Properties Update Handler
  const handleUpdateWidgetProps = (id, newProps) => {
    const updated = widgets.map(w => w.id === id ? { ...w, ...newProps } : w);
    setWidgets(updated);
    saveConfig(updated, units, city, globalFont, tabs, activeTabId);
  };

  // Add Widget Handler (positions at bottom of canvas)
  const handleAddWidget = (type) => {
    const maxY = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);
    
    let w = 4;
    let h = 3;
    if (type === 'hourly') { w = 8; h = 4; }
    else if (type === 'daily') { w = 4; h = 6; }
    else if (type === 'current') { w = 4; h = 4; }

    const newWidget = {
      id: `widget-${type}-${Date.now()}`,
      type,
      x: (widgets.length * 4) % 12,
      y: maxY,
      w,
      h,
      font: '' // inherit global font by default
    };

    const updated = [...widgets, newWidget];
    setWidgets(updated);
    saveConfig(updated, units, city, globalFont, tabs, activeTabId);
  };

  // Location Selection Handler
  const handleSelectCity = (selectedCity) => {
    const slug = getCitySlug(selectedCity.name);
    const existingTab = tabs.find(t => getCitySlug(t.city.name) === slug);
    
    if (existingTab) {
      setActiveTabId(existingTab.id);
      setCity(existingTab.city);
      window.history.pushState(null, '', '/' + slug);
      saveConfig(widgets, units, existingTab.city, globalFont, tabs, existingTab.id);
    } else {
      const newTab = {
        id: `tab-${Date.now()}`,
        city: selectedCity
      };
      const updatedTabs = [...tabs, newTab];
      setTabs(updatedTabs);
      setActiveTabId(newTab.id);
      setCity(selectedCity);
      window.history.pushState(null, '', '/' + slug);
      saveConfig(widgets, units, selectedCity, globalFont, updatedTabs, newTab.id);
    }
  };

  // Switch between tabs
  const handleSwitchTab = (tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setActiveTabId(tabId);
      setCity(tab.city);
      window.history.pushState(null, '', '/' + getCitySlug(tab.city.name));
      saveConfig(widgets, units, tab.city, globalFont, tabs, tabId);
    }
  };

  // Close a location tab
  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    
    const updatedTabs = tabs.filter(t => t.id !== tabId);
    setTabs(updatedTabs);
    
    if (activeTabId === tabId) {
      const nextTab = updatedTabs[0];
      setActiveTabId(nextTab.id);
      setCity(nextTab.city);
      window.history.pushState(null, '', '/' + getCitySlug(nextTab.city.name));
      saveConfig(widgets, units, nextTab.city, globalFont, updatedTabs, nextTab.id);
    } else {
      saveConfig(widgets, units, city, globalFont, updatedTabs, activeTabId);
    }
  };

  // Auto-Arrange Layout Handler
  const handleAutoArrange = (mode) => {
    let arranged;
    if (mode === 'pack') {
      arranged = autoPackLayout(widgets, 12);
    } else if (mode === 'portrait') {
      arranged = portraitLayout(widgets);
    }
    if (arranged) {
      setWidgets(arranged);
      setLayoutKey(prev => prev + 1);
      saveConfig(arranged, units, city, globalFont, tabs, activeTabId);
    }
  };

  // Save named profile to DB
  const handleSaveProfile = async (name) => {
    if (!name || !name.trim()) return;
    try {
      const payload = {
        name: name.trim(),
        city: city,
        widgets: widgets,
        units: units,
        globalFont: globalFont
      };
      const headers = { 'Content-Type': 'application/json' };
      if (adminPin) {
        headers['x-admin-pin'] = adminPin;
      }
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updatedProfiles = await res.json();
        setProfiles(updatedProfiles);
      } else {
        throw new Error('Failed to save layout profile');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to save layout profile.');
    }
  };

  // Load profile from DB
  const handleLoadProfile = async (profile) => {
    try {
      if (profile.widgets) setWidgets(profile.widgets);
      if (profile.units) setUnitsState(profile.units);
      if (profile.globalFont) setGlobalFontState(profile.globalFont);
      setLayoutKey(prev => prev + 1);
      if (profile.city) {
        setCity(profile.city);
        
        const slug = getCitySlug(profile.city.name);
        const existingTab = tabs.find(t => getCitySlug(t.city.name) === slug);
        let updatedTabs = tabs;
        let newTabId = activeTabId;
        if (!existingTab) {
          const newTab = { id: `tab-${Date.now()}`, city: profile.city };
          updatedTabs = [...tabs, newTab];
          newTabId = newTab.id;
          setTabs(updatedTabs);
          setActiveTabId(newTabId);
        } else {
          newTabId = existingTab.id;
          setActiveTabId(newTabId);
        }
        
        window.history.pushState(null, '', '/' + slug);
        saveConfig(profile.widgets, profile.units, profile.city, profile.globalFont, updatedTabs, newTabId);
      } else {
        saveConfig(profile.widgets, profile.units, city, profile.globalFont, tabs, activeTabId);
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load profile.');
    }
  };

  // Delete profile from DB
  const handleDeleteProfile = async (profileId) => {
    try {
      const headers = {};
      if (adminPin) {
        headers['x-admin-pin'] = adminPin;
      }
      const res = await fetch(`/api/profiles/${profileId}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        const updatedProfiles = await res.json();
        setProfiles(updatedProfiles);
      } else {
        throw new Error('Failed to delete profile');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to delete layout profile.');
    }
  };

  // Save OpenWeatherMap API Key
  const handleSaveOwmApiKey = async (key) => {
    setOwmApiKey(key);
    await saveConfig(widgets, units, city, globalFont, tabs, activeTabId, key);
    fetchWeather(city, units);
  };

  // Export dashboard setup as JSON to clipboard
  const handleExportSetup = () => {
    const setup = {
      widgets,
      units,
      city,
      globalFont,
      owmApiKey
    };
    const jsonString = JSON.stringify(setup, null, 2);
    navigator.clipboard.writeText(jsonString)
      .then(() => {
        setError('✓ Dashboard configuration copied to clipboard! You can share it now.');
        setTimeout(() => setError(null), 5000);
      })
      .catch((err) => {
        console.error('Failed to copy setup:', err);
        alert('Failed to copy automatically. Here is the configuration JSON:\n\n' + jsonString);
      });
  };

  // Import dashboard setup from pasted JSON
  const handleImportSetup = () => {
    const jsonInput = prompt('Paste your shared dashboard setup JSON here:');
    if (!jsonInput) return;
    try {
      const parsed = JSON.parse(jsonInput);
      if (!parsed.widgets || !Array.isArray(parsed.widgets)) {
        throw new Error('Invalid setup JSON: missing widgets array');
      }

      if (parsed.widgets) setWidgets(parsed.widgets);
      if (parsed.units) setUnitsState(parsed.units);
      if (parsed.globalFont) setGlobalFontState(parsed.globalFont);
      if (parsed.owmApiKey) setOwmApiKey(parsed.owmApiKey);

      if (parsed.city) {
        setCity(parsed.city);
        const slug = getCitySlug(parsed.city.name);
        window.history.pushState(null, '', '/' + slug);
      }

      setLayoutKey(prev => prev + 1);

      saveConfig(
        parsed.widgets,
        parsed.units || units,
        parsed.city || city,
        parsed.globalFont || globalFont,
        tabs,
        activeTabId,
        parsed.owmApiKey || owmApiKey
      );

      fetchWeather(parsed.city || city, parsed.units || units, parsed.owmApiKey || owmApiKey);

      setError('✓ Dashboard configuration successfully imported!');
      setTimeout(() => setError(null), 5000);
    } catch (err) {
      console.error(err);
      setError('Import failed: ' + err.message);
      setTimeout(() => setError(null), 6000);
    }
  };

  // Auto detect location from browser GPS coords
  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation service is disabled or unsupported in this browser.');
      return;
    }

    setFetchingData(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          if (!res.ok) throw new Error('Reverse geocoding request failed');
          const data = await res.json();
          
          const resolvedName = data.city || data.locality || data.principalSubdivision || 'Detected Station';
          const resolvedCountry = data.countryName || '';
          
          const detectedCity = {
            name: resolvedName,
            latitude,
            longitude,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            country: resolvedCountry
          };

          setCity(detectedCity);
          
          const slug = getCitySlug(detectedCity.name);
          const existingTab = tabs.find(t => getCitySlug(t.city.name) === slug);
          let updatedTabs = tabs;
          let newTabId = activeTabId;
          if (!existingTab) {
            const newTab = { id: `tab-${Date.now()}`, city: detectedCity };
            updatedTabs = [...tabs, newTab];
            newTabId = newTab.id;
            setTabs(updatedTabs);
            setActiveTabId(newTabId);
          } else {
            newTabId = existingTab.id;
            setActiveTabId(newTabId);
          }
          
          window.history.pushState(null, '', '/' + slug);
          saveConfig(widgets, units, detectedCity, globalFont, updatedTabs, newTabId);
          setError(null);
        } catch (err) {
          console.error(err);
          // Fallback to coordinates
          const fallbackCity = {
            name: `Coords (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
            latitude,
            longitude,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            country: 'GPS Location'
          };
          setCity(fallbackCity);
          
          const slug = getCitySlug(fallbackCity.name);
          const existingTab = tabs.find(t => getCitySlug(t.city.name) === slug);
          let updatedTabs = tabs;
          let newTabId = activeTabId;
          if (!existingTab) {
            const newTab = { id: `tab-${Date.now()}`, city: fallbackCity };
            updatedTabs = [...tabs, newTab];
            newTabId = newTab.id;
            setTabs(updatedTabs);
            setActiveTabId(newTabId);
          } else {
            newTabId = existingTab.id;
            setActiveTabId(newTabId);
          }
          
          window.history.pushState(null, '', '/' + slug);
          saveConfig(widgets, units, fallbackCity, globalFont, updatedTabs, newTabId);
        } finally {
          setFetchingData(false);
        }
      },
      (err) => {
        setError(`Failed to retrieve coordinates: ${err.message}`);
        setFetchingData(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Unit State modifier
  const setUnits = (selectedUnits) => {
    setUnitsState(selectedUnits);
    saveConfig(widgets, selectedUnits, city, globalFont, tabs, activeTabId);
  };

  // Global Font State modifier
  const setGlobalFont = (selectedFont) => {
    setGlobalFontState(selectedFont);
    saveConfig(widgets, units, city, selectedFont, tabs, activeTabId);
  };

  // Toggle Edit Lock
  const setEditMode = (mode) => {
    if (mode === true) {
      if (pinRequired && !adminPin) {
        const pin = prompt('Enter Admin PIN to unlock layout modifications:');
        if (pin === null) return; // user cancelled

        fetch('/api/verify-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        })
        .then(async (res) => {
          if (res.ok) {
            setAdminPin(pin);
            setEditModeState(true);
            setError('✓ Layout successfully unlocked.');
            setTimeout(() => setError(null), 3000);
          } else {
            const data = await res.json();
            setError('Unlock failed: ' + (data.error || 'Invalid Admin PIN'));
            setTimeout(() => setError(null), 5000);
          }
        })
        .catch((err) => {
          console.error(err);
          setError('Failed to verify Admin PIN. Verify server connection.');
          setTimeout(() => setError(null), 5000);
        });
      } else {
        setEditModeState(true);
      }
    } else {
      setEditModeState(false);
      setAdminPin(''); // secure lock
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-gradient)' }}>
        <RefreshCw size={44} className="animate-spin" style={{ color: 'var(--accent-blue)', animation: 'spin 1.5s linear infinite', marginBottom: '16px' }} />
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'var(--font-title)' }}>Initializing Weatharr Engine...</span>
      </div>
    );
  }

  // Dynamic global font-family override
  const fontStyle = globalFont ? { fontFamily: `'${globalFont}', sans-serif` } : {};

  return (
    <div className="app-container" style={fontStyle}>
      {/* Sliding Control Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        units={units}
        setUnits={setUnits}
        globalFont={globalFont}
        setGlobalFont={setGlobalFont}
        isEditMode={isEditMode}
        setEditMode={setEditMode}
        activeCity={city}
        timezone={city.timezone || 'UTC'}
        widgets={widgets}
        onAddWidget={handleAddWidget}
        profiles={profiles}
        onSaveProfile={handleSaveProfile}
        onLoadProfile={handleLoadProfile}
        onDeleteProfile={handleDeleteProfile}
        onAutoArrange={handleAutoArrange}
        owmApiKey={owmApiKey}
        onSaveOwmApiKey={handleSaveOwmApiKey}
        onExportSetup={handleExportSetup}
        onImportSetup={handleImportSetup}
      />

      {/* Main Page Layout */}
      <main className="main-content" style={{ paddingLeft: isSidebarOpen ? '340px' : '24px' }}>
        
        {/* Dynamic Warning/Error Toast */}
        {error && (
          <div 
            className="fade-in"
            style={{
              background: error.startsWith('✓') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${error.startsWith('✓') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '14px',
              padding: '12px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '13px',
              color: error.startsWith('✓') ? '#a7f3d0' : '#fca5a5'
            }}
          >
            {error.startsWith('✓') ? (
              <span style={{ color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '16px' }}>✓</span>
            ) : (
              <AlertTriangle size={18} style={{ color: 'var(--accent-red)' }} />
            )}
            <span>{error}</span>
          </div>
        )}

        {/* Dashboard Header Bar */}
        <header 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '28px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            paddingBottom: '20px'
          }}
        >
          {/* Logo & City Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div 
              style={{ 
                background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                borderRadius: '14px',
                padding: '10px',
                display: 'flex',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
              }}
            >
              <CloudSun size={28} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'var(--font-title)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Weatharr
                {fetchingData && (
                  <RefreshCw size={14} className="animate-spin" style={{ color: 'var(--text-secondary)', animation: 'spin 1.5s linear infinite' }} />
                )}
              </h1>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '2px' }}>
                <span>Station: <strong style={{ color: 'var(--text-primary)' }}>{city.name}, {city.country}</strong></span>
                {localTime && (
                  <span style={{ paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.15)', color: 'var(--accent-blue)', fontWeight: '500' }}>
                    🕒 {localTime}
                  </span>
                )}
                {lastUpdated && (
                  <span style={{ paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.15)', color: 'var(--accent-teal)', fontWeight: '500' }}>
                    🔄 Updated: {lastUpdated}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Autocomplete Search & GPS Detect */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '440px', justifyContent: 'center' }}>
            <LocationSearch onSelectCity={handleSelectCity} />
            <button
              onClick={handleAutoDetectLocation}
              className="btn"
              title="Detect Current Location"
              style={{ padding: '10px 12px', flexShrink: 0 }}
            >
              <MapPin size={18} style={{ color: 'var(--accent-blue)' }} />
            </button>
          </div>

          {/* Configuration Trigger Buttons */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            
            {/* Quick Edit-Mode Toggle Button */}
            <button 
              onClick={() => setEditMode(!isEditMode)}
              className="btn"
              title={isEditMode ? "Lock Canvas Layout" : "Unlock Canvas Layout"}
              style={{
                borderColor: isEditMode ? 'var(--accent-orange)' : 'var(--glass-border)',
                background: isEditMode ? 'var(--accent-orange-glow)' : 'transparent',
                color: isEditMode ? 'var(--accent-orange)' : 'var(--text-primary)'
              }}
            >
              {isEditMode ? <Unlock size={16} /> : <Lock size={16} />}
              <span>{isEditMode ? "Layout Unlocked" : "Lock Layout"}</span>
            </button>

            {/* Main Menu Button */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="btn btn-primary"
            >
              <Settings size={16} />
              <span>Control Center</span>
            </button>
          </div>
        </header>

        {/* Horizontal Tab Bar for Multiple Locations */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            overflowX: 'auto',
            paddingBottom: '8px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => handleSwitchTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'var(--glass-bg)',
                  border: '1px solid',
                  borderColor: isActive ? 'var(--accent-blue)' : 'var(--glass-border)',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: isActive ? '600' : 'normal',
                  fontSize: '13px',
                  transition: 'all var(--transition-speed) var(--ease)',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 0 12px rgba(59, 130, 246, 0.2)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--glass-bg-hover)';
                    e.currentTarget.style.borderColor = 'var(--glass-border-focus)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--glass-bg)';
                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                  }
                }}
              >
                <MapPin size={12} style={{ color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
                <span>{tab.city.name}</span>
                {tabs.length > 1 && (
                  <span
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    style={{
                      marginLeft: '4px',
                      color: 'var(--text-muted)',
                      fontSize: '14px',
                      lineHeight: '1',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      e.currentTarget.style.color = 'var(--accent-red)';
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.stopPropagation();
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    ×
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Drag-and-Drop Responsive Grid Canvas */}
        <Dashboard 
          widgets={widgets}
          weatherData={weatherData}
          aqiData={aqiData}
          units={units}
          isEditMode={isEditMode}
          onDeleteWidget={handleDeleteWidget}
          onUpdateWidgetProps={handleUpdateWidgetProps}
          onLayoutChange={handleLayoutChange}
          layoutKey={layoutKey}
        />
      </main>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
}
