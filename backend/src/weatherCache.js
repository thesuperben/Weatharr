class WeatherCache {
  constructor(ttlMs = 15 * 60 * 1000) { // Default 15 minutes TTL
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }

  generateKey(type, params) {
    // Generate a unique cache key based on query parameters
    const keys = Object.keys(params).sort();
    const parts = keys.map(k => `${k}=${params[k]}`);
    return `${type}:${parts.join('&')}`;
  }
}

module.exports = new WeatherCache();
