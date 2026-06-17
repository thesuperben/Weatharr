const fs = require('fs').promises;
const path = require('path');

const configPath = process.env.CONFIG_PATH || '/app/data/weatharr_config.json';
const profilesPath = process.env.PROFILES_PATH || '/app/data/weatharr_profiles.json';

async function ensureDir(filePath) {
  const dirname = path.dirname(filePath);
  try {
    await fs.mkdir(dirname, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function loadConfig() {
  try {
    await ensureDir(configPath);
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Default beautiful layout
      return {
        theme: 'dark',
        units: 'metric', // metric, imperial, uk
        timezone: 'auto',
        city: {
          name: 'London',
          latitude: 51.5085,
          longitude: -0.1257,
          timezone: 'Europe/London',
          country: 'United Kingdom'
        },
        widgets: [
          { id: 'widget-current', type: 'current', x: 0, y: 0, w: 4, h: 4 },
          { id: 'widget-hourly', type: 'hourly', x: 4, y: 0, w: 8, h: 4 },
          { id: 'widget-daily', type: 'daily', x: 0, y: 4, w: 4, h: 6 },
          { id: 'widget-uv', type: 'uv', x: 4, y: 4, w: 4, h: 3 },
          { id: 'widget-wind', type: 'wind', x: 8, y: 4, w: 4, h: 3 },
          { id: 'widget-humidity', type: 'humidity', x: 4, y: 7, w: 4, h: 3 },
          { id: 'widget-pressure', type: 'pressure', x: 8, y: 7, w: 4, h: 3 },
          { id: 'widget-aqi', type: 'aqi', x: 0, y: 10, w: 6, h: 3 },
          { id: 'widget-sun', type: 'sun', x: 6, y: 10, w: 6, h: 3 }
        ]
      };
    }
    throw err;
  }
}

async function saveConfig(config) {
  await ensureDir(configPath);
  const tempPath = `${configPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(config, null, 2), 'utf8');
  await fs.rename(tempPath, configPath);
}

async function loadProfiles() {
  try {
    await ensureDir(profilesPath);
    const data = await fs.readFile(profilesPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

async function saveProfiles(profiles) {
  await ensureDir(profilesPath);
  const tempPath = `${profilesPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(profiles, null, 2), 'utf8');
  await fs.rename(tempPath, profilesPath);
}

module.exports = {
  loadConfig,
  saveConfig,
  loadProfiles,
  saveProfiles
};
