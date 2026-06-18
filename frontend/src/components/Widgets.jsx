import React, { useState, useEffect } from 'react';
import {
  Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, Snowflake, CloudLightning,
  Wind, Navigation, Sunrise, Sunset, Droplets, Gauge, Compass, ShieldAlert, AlertCircle, Trash2, GripHorizontal, Info, Loader2
} from 'lucide-react';
import WeatherChart from './WeatherCharts';

// Helper to find index of current hour in hourly time array
export function findCurrentHourIndex(timeArray) {
  if (!timeArray || timeArray.length === 0) return 0;
  const now = new Date();
  let closestIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < timeArray.length; i++) {
    const diff = Math.abs(new Date(timeArray[i]) - now);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }
  return closestIdx;
}

// Helper to find index of today in daily time array
export function findTodayDailyIndex(timeArray) {
  if (!timeArray || timeArray.length === 0) return 0;
  const todayStr = new Date().toDateString();
  for (let i = 0; i < timeArray.length; i++) {
    if (new Date(timeArray[i]).toDateString() === todayStr) {
      return i;
    }
  }
  return 0;
}

// Helper: map WMO Weather Codes to Descriptions & Icons
export function getWeatherInfo(code, isDay = 1) {
  const codeMap = {
    0: { label: 'Clear Sky', icon: Sun, color: '#f59e0b' },
    1: { label: 'Mainly Clear', icon: CloudSun, color: '#fbbf24' },
    2: { label: 'Partly Cloudy', icon: CloudSun, color: '#9ca3af' },
    3: { label: 'Overcast', icon: Cloud, color: '#6b7280' },
    45: { label: 'Fog', icon: CloudFog, color: '#9ca3af' },
    48: { label: 'Depositing Rime Fog', icon: CloudFog, color: '#9ca3af' },
    51: { label: 'Light Drizzle', icon: CloudDrizzle, color: '#60a5fa' },
    53: { label: 'Moderate Drizzle', icon: CloudDrizzle, color: '#3b82f6' },
    55: { label: 'Dense Drizzle', icon: CloudDrizzle, color: '#2563eb' },
    56: { label: 'Light Freezing Drizzle', icon: Snowflake, color: '#a5f3fc' },
    57: { label: 'Dense Freezing Drizzle', icon: Snowflake, color: '#a5f3fc' },
    61: { label: 'Slight Rain', icon: CloudRain, color: '#60a5fa' },
    63: { label: 'Moderate Rain', icon: CloudRain, color: '#3b82f6' },
    65: { label: 'Heavy Rain', icon: CloudRain, color: '#1d4ed8' },
    66: { label: 'Light Freezing Rain', icon: Snowflake, color: '#a5f3fc' },
    67: { label: 'Heavy Freezing Rain', icon: Snowflake, color: '#a5f3fc' },
    71: { label: 'Slight Snow Fall', icon: Snowflake, color: '#e5e7eb' },
    73: { label: 'Moderate Snow Fall', icon: Snowflake, color: '#f3f4f6' },
    75: { label: 'Heavy Snow Fall', icon: Snowflake, color: '#ffffff' },
    77: { label: 'Snow Grains', icon: Snowflake, color: '#ffffff' },
    80: { label: 'Slight Rain Showers', icon: CloudRain, color: '#60a5fa' },
    81: { label: 'Moderate Rain Showers', icon: CloudRain, color: '#3b82f6' },
    82: { label: 'Violent Rain Showers', icon: CloudRain, color: '#1d4ed8' },
    85: { label: 'Slight Snow Showers', icon: Snowflake, color: '#ffffff' },
    86: { label: 'Heavy Snow Showers', icon: Snowflake, color: '#ffffff' },
    95: { label: 'Thunderstorm', icon: CloudLightning, color: '#8b5cf6' },
    96: { label: 'Thunderstorm with Hail', icon: CloudLightning, color: '#8b5cf6' },
    99: { label: 'Thunderstorm with Heavy Hail', icon: CloudLightning, color: '#7c3aed' }
  };

  const defaultInfo = { label: 'Unknown', icon: Cloud, color: '#9ca3af' };
  const info = codeMap[code] || defaultInfo;

  return {
    ...info,
    color: isDay ? info.color : '#93c5fd'
  };
}

// Helpers for formatted values with null checks
const formatTemp = (val, unit) => val != null ? `${Math.round(val)}${unit === 'imperial' ? '°F' : '°C'}` : 'N/A';
const formatWind = (val, unit) => val != null ? `${Math.round(val)} ${unit === 'metric' ? 'km/h' : 'mph'}` : 'N/A';
const formatPrecip = (val, unit) => val != null ? `${val.toFixed(1)} ${unit === 'imperial' ? 'in' : 'mm'}` : `0.0 ${unit === 'imperial' ? 'in' : 'mm'}`;

// Widget Header Component with per-widget font customizer
function WidgetHeader({ title, type, isEditMode, onDelete, font, onUpdateFont, onDragStart }) {
  return (
    <div 
      className="widget-header" 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px 8px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
        userSelect: 'none',
        height: '40px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
        {isEditMode && (
          <span className="widget-drag-handle" onMouseDown={onDragStart} style={{ display: 'flex', color: 'var(--text-muted)' }}>
            <GripHorizontal size={16} />
          </span>
        )}
        <span 
          style={{ 
            fontSize: '11px', 
            fontWeight: '600', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em', 
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
          }}
        >
          {title}
        </span>
        
        {/* Info indicator */}
        <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-muted)' }} title="Click card for details">
          <Info size={12} style={{ cursor: 'pointer' }} />
        </span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {isEditMode && (
          <select
            value={font || ''}
            onChange={(e) => onUpdateFont(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              fontSize: '10px',
              padding: '2px 4px',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)'
            }}
          >
            <option value="" style={{ background: '#111827', color: '#fff' }}>Default Font</option>
            <option value="Outfit" style={{ background: '#111827', color: '#fff' }}>Outfit</option>
            <option value="Inter" style={{ background: '#111827', color: '#fff' }}>Inter</option>
            <option value="JetBrains Mono" style={{ background: '#111827', color: '#fff' }}>JetBrains Mono</option>
            <option value="Lora" style={{ background: '#111827', color: '#fff' }}>Lora</option>
            <option value="Playfair Display" style={{ background: '#111827', color: '#fff' }}>Playfair Display</option>
            <option value="Syne" style={{ background: '#111827', color: '#fff' }}>Syne</option>
          </select>
        )}

        {isEditMode && (
          <button 
            onClick={onDelete} 
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-red)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              borderRadius: '4px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------
   WIDGET COMPONENTS
---------------------------------------------------- */

// 1. Current Weather Widget
function CurrentWeatherWidget({ data, units }) {
  const current = data.current;
  const daily = data.daily;
  const weatherInfo = getWeatherInfo(current.weather_code, current.is_day);
  const WeatherIcon = weatherInfo.icon;

  const todayIdx = findTodayDailyIndex(daily.time);
  const highTemp = daily.temperature_2m_max ? daily.temperature_2m_max[todayIdx] : null;
  const lowTemp = daily.temperature_2m_min ? daily.temperature_2m_min[todayIdx] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '2px' }}>Current</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{weatherInfo.label}</p>
        </div>
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '8px' }}>
          <WeatherIcon size={36} strokeWidth={1.5} style={{ color: weatherInfo.color }} />
        </div>
      </div>

      <div style={{ margin: '4px 0' }}>
        <h1 className="temperature" style={{ fontSize: '48px', fontWeight: '800', lineHeight: '1', display: 'flex', alignItems: 'flex-start' }}>
          {current.temperature_2m != null ? Math.round(current.temperature_2m) : '--'}
          <span style={{ fontSize: '20px', fontWeight: '400', marginTop: '4px', color: 'var(--text-secondary)' }}>
            {units === 'imperial' ? '°F' : '°C'}
          </span>
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '10px' }}>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Feels: </span>
          <span style={{ fontWeight: '600' }}>{formatTemp(current.apparent_temperature, units)}</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>H/L: </span>
          <span style={{ fontWeight: '600' }}>
            {highTemp != null ? `${Math.round(highTemp)}°` : '--°'}/
            {lowTemp != null ? `${Math.round(lowTemp)}°` : '--°'}
          </span>
        </div>
      </div>
    </div>
  );
}

// 2. Hourly Forecast Widget
function HourlyForecastWidget({ data, units }) {
  const hourly = data.hourly;
  const daily = data.daily;
  const [activeMetrics, setActiveMetrics] = useState({
    temperature: true,
    precipitation: true,
    uv: false,
    wind: false
  });
  const [showSun, setShowSun] = useState(false);
  const todayIdx = hourly?.time ? Math.max(0, findCurrentHourIndex(hourly.time) - new Date().getHours()) : 0;
  const currentHourIndex = new Date().getHours();

  const handleToggleMetric = (m) => {
    setActiveMetrics(prev => {
      const next = { ...prev, [m]: !prev[m] };
      // Keep at least one active
      if (Object.values(next).filter(Boolean).length === 0) return prev;
      return next;
    });
  };

  const tempData = hourly?.temperature_2m ? hourly.temperature_2m.slice(todayIdx, todayIdx + 24) : [];
  const rainData = hourly?.precipitation ? hourly.precipitation.slice(todayIdx, todayIdx + 24) : [];
  const uvData = hourly?.uv_index ? hourly.uv_index.slice(todayIdx, todayIdx + 24) : [];
  const windData = hourly?.wind_speed_10m ? hourly.wind_speed_10m.slice(todayIdx, todayIdx + 24) : [];

  const times = hourly && hourly.time ? hourly.time.slice(todayIdx, todayIdx + 24).map(t => {
    const d = new Date(t);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }) : [];

  const series = [];
  if (activeMetrics.temperature && tempData.length > 0) {
    series.push({ name: 'temp', label: 'Temp', data: tempData, color: 'var(--accent-orange)', unit: units === 'imperial' ? '°F' : '°C' });
  }
  if (activeMetrics.precipitation && rainData.length > 0) {
    series.push({ name: 'rain', label: 'Rain', data: rainData, color: 'var(--accent-teal)', unit: units === 'imperial' ? ' in' : ' mm' });
  }
  if (activeMetrics.uv && uvData.length > 0) {
    series.push({ name: 'uv', label: 'UV', data: uvData, color: 'var(--accent-blue)', unit: ' UV' });
  }
  if (activeMetrics.wind && windData.length > 0) {
    series.push({ name: 'wind', label: 'Wind', data: windData, color: 'var(--accent-purple)', unit: units === 'metric' ? ' km/h' : ' mph' });
  }

  // Find matching sunrise/sunset times
  const sunMarkers = [];
  if (showSun && daily && daily.sunrise && daily.sunset) {
    const todayDailyIdx = findTodayDailyIndex(daily.time);
    const riseDate = new Date(daily.sunrise[todayDailyIdx]);
    const setDate = new Date(daily.sunset[todayDailyIdx]);

    const hourlyTimes = hourly && hourly.time ? hourly.time.slice(todayIdx, todayIdx + 24) : [];
    hourlyTimes.forEach((t, idx) => {
      const d = new Date(t);
      if (d.getDate() === riseDate.getDate() && d.getHours() === riseDate.getHours()) {
        sunMarkers.push({ index: idx, type: 'sunrise' });
      }
      if (d.getDate() === setDate.getDate() && d.getHours() === setDate.getHours()) {
        sunMarkers.push({ index: idx, type: 'sunset' });
      }
    });
  }

  return (
    <div style={{ flex: 1, padding: '12px 16px 16px 16px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Selector controls for active chart type */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '8px',
          paddingBottom: '6px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexWrap: 'wrap',
          gap: '6px'
        }}
      >
        <div style={{ display: 'flex', gap: '4px' }}>
          {['temperature', 'precipitation', 'uv', 'wind'].map((m) => {
            const isActive = activeMetrics[m];
            const label = {
              temperature: 'Temp',
              precipitation: 'Rain',
              uv: 'UV',
              wind: 'Wind'
            }[m];
            
            return (
              <button
                key={m}
                onClick={() => handleToggleMetric(m)}
                style={{
                  background: isActive ? 'var(--accent-blue-glow)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? 'var(--accent-blue)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '6px',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '10px',
                  padding: '3px 8px',
                  cursor: 'pointer',
                  fontWeight: isActive ? 'bold' : 'normal',
                  transition: 'all 0.2s'
                }}
              >
                {isActive ? '✓ ' : ''}{label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowSun(!showSun)}
          title="Toggle Sun Markers"
          style={{
            background: showSun ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${showSun ? 'var(--accent-orange)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: '6px',
            color: showSun ? 'var(--accent-orange)' : 'var(--text-secondary)',
            fontSize: '10px',
            padding: '3px 8px',
            cursor: 'pointer',
            fontWeight: showSun ? 'bold' : 'normal',
            transition: 'all 0.2s'
          }}
        >
          ☀️ Sun Markers
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <WeatherChart 
          labels={times} 
          series={series}
          sunMarkers={sunMarkers}
          currentHourMarker={currentHourIndex}
        />
      </div>
    </div>
  );
}

// 3. Daily Forecast Widget
function DailyForecastWidget({ data, units, daysCount = 7, showWind = false, showUV = false, showRain = false, showSun = false, onUpdateProps }) {
  const daily = data.daily;
  const limit = daysCount || 7;
  
  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const todayStartIdx = findTodayDailyIndex(daily.time);
  const days = daily.time ? daily.time.slice(todayStartIdx, todayStartIdx + limit).map((t, idx) => {
    const actualIdx = todayStartIdx + idx;
    const date = new Date(t);
    const dayName = idx === 0 ? 'Today' : date.toLocaleDateString([], { weekday: 'short' });
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const code = daily.weather_code ? daily.weather_code[actualIdx] : 0;
    const max = daily.temperature_2m_max ? daily.temperature_2m_max[actualIdx] : null;
    const min = daily.temperature_2m_min ? daily.temperature_2m_min[actualIdx] : null;
    const rainProb = daily.precipitation_probability_max ? daily.precipitation_probability_max[actualIdx] : 0;
    
    const wind = daily.wind_speed_10m_max ? daily.wind_speed_10m_max[actualIdx] : null;
    const uv = daily.uv_index_max ? daily.uv_index_max[actualIdx] : null;
    const rainAmt = daily.precipitation_sum ? daily.precipitation_sum[actualIdx] : null;
    const sunrise = daily.sunrise ? daily.sunrise[actualIdx] : null;
    const sunset = daily.sunset ? daily.sunset[actualIdx] : null;

    return { dayName, dateStr, code, max, min, rainProb, wind, uv, rainAmt, sunrise, sunset };
  }) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px 16px', overflowY: 'auto' }}>
      {/* Control row for range select & toggle features */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '10px', 
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <select
          value={limit}
          onChange={(e) => onUpdateProps({ daysCount: parseInt(e.target.value, 10) })}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '11px',
            padding: '2px 4px',
            outline: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)'
          }}
        >
          <option value={3} style={{ background: '#111827', color: '#fff' }}>3 Days</option>
          <option value={7} style={{ background: '#111827', color: '#fff' }}>7 Days</option>
          <option value={14} style={{ background: '#111827', color: '#fff' }}>14 Days</option>
          <option value={16} style={{ background: '#111827', color: '#fff' }}>16 Days</option>
        </select>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onUpdateProps({ showWind: !showWind })}
            title="Toggle Wind Speed"
            style={{
              background: showWind ? 'var(--accent-purple-glow)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${showWind ? 'var(--accent-purple)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '6px',
              color: showWind ? 'var(--accent-purple)' : 'var(--text-secondary)',
              padding: '3px 6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              gap: '3px',
              transition: 'all 0.2s'
            }}
          >
            <Wind size={12} />
            <span>Wind</span>
          </button>

          <button
            onClick={() => onUpdateProps({ showUV: !showUV })}
            title="Toggle UV Index"
            style={{
              background: showUV ? 'var(--accent-orange-glow)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${showUV ? 'var(--accent-orange)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '6px',
              color: showUV ? 'var(--accent-orange)' : 'var(--text-secondary)',
              padding: '3px 6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              gap: '3px',
              transition: 'all 0.2s'
            }}
          >
            <Sun size={12} />
            <span>UV</span>
          </button>

          <button
            onClick={() => onUpdateProps({ showRain: !showRain })}
            title="Toggle Rain Expected"
            style={{
              background: showRain ? 'var(--accent-teal-glow)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${showRain ? 'var(--accent-teal)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '6px',
              color: showRain ? 'var(--accent-teal)' : 'var(--text-secondary)',
              padding: '3px 6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              gap: '3px',
              transition: 'all 0.2s'
            }}
          >
            <Droplets size={12} />
            <span>Rain</span>
          </button>

          <button
            onClick={() => onUpdateProps({ showSun: !showSun })}
            title="Toggle Sun Timings"
            style={{
              background: showSun ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${showSun ? 'var(--accent-orange)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '6px',
              color: showSun ? 'var(--accent-orange)' : 'var(--text-secondary)',
              padding: '3px 6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              gap: '3px',
              transition: 'all 0.2s'
            }}
          >
            <Sunrise size={12} />
            <span>Sun</span>
          </button>
        </div>
      </div>

      {days.map((day, idx) => {
        const info = getWeatherInfo(day.code);
        const DayIcon = info.icon;
        return (
          <div 
            key={idx} 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              padding: '6px 0', 
              borderBottom: idx === days.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.04)'
            }}
          >
            {/* ROW 1: Primary Parameters (Always fits) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', width: '55px', flexShrink: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>{day.dayName}</span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{day.dateStr}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '60px', flexShrink: 0 }}>
                <DayIcon size={16} style={{ color: info.color }} />
                {day.rainProb > 15 && (
                  <span style={{ fontSize: '10px', color: 'var(--accent-teal)', fontWeight: '500' }}>
                    {day.rainProb}%
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginLeft: 'auto', flexShrink: 0 }}>
                <span style={{ color: 'var(--text-secondary)', width: '24px', textAlign: 'right' }}>{day.min != null ? Math.round(day.min) : '--'}°</span>
                
                <div style={{ width: '35px', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', position: 'relative' }}>
                  <div 
                    style={{
                      position: 'absolute',
                      left: '20%',
                      right: '20%',
                      top: 0,
                      bottom: 0,
                      background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-orange))',
                      borderRadius: '2px'
                    }}
                  />
                </div>

                <span style={{ fontWeight: '600', width: '24px', textAlign: 'right' }}>{day.max != null ? Math.round(day.max) : '--'}°</span>
              </div>
            </div>

            {/* ROW 2: Optional Parameters (Flows below primary line if active) */}
            {(showWind || showUV || showRain || showSun) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: '9px', color: 'var(--text-secondary)', marginTop: '4px', paddingLeft: '55px' }}>
                {showWind && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--accent-purple)' }}>
                    💨 {day.wind != null ? `${Math.round(day.wind)}` : '--'}<span style={{ fontSize: '8px', opacity: 0.7 }}>{units === 'metric' ? 'km/h' : 'mph'}</span>
                  </span>
                )}
                {showUV && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--accent-orange)' }}>
                    ☀️ UV {day.uv != null ? Math.round(day.uv) : '--'}
                  </span>
                )}
                {showRain && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--accent-teal)' }}>
                    💧 {day.rainAmt != null ? `${day.rainAmt.toFixed(1)}` : '0.0'}<span style={{ fontSize: '8px', opacity: 0.7 }}>{units === 'imperial' ? 'in' : 'mm'}</span>
                  </span>
                )}
                {showSun && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--accent-orange)' }}>
                    🌅 {formatTime(day.sunrise)} / 🌇 {formatTime(day.sunset)}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 4. UV Index Widget
function UVIndexWidget({ data }) {
  const current = data.current;
  const uv = current.uv_index;
  
  let level = 'Low';
  let color = 'var(--accent-green)';
  let advice = 'Safe to be outdoors.';

  if (uv != null) {
    if (uv >= 3 && uv <= 5) {
      level = 'Moderate';
      color = 'var(--accent-orange)';
      advice = 'Wear sunscreen & sunglasses.';
    } else if (uv >= 6 && uv <= 7) {
      level = 'High';
      color = 'var(--accent-orange)';
      advice = 'Limit time in midday sun.';
    } else if (uv >= 8 && uv <= 10) {
      level = 'Very High';
      color = 'var(--accent-red)';
      advice = 'Seek shade. Sunscreen is key.';
    } else if (uv >= 11) {
      level = 'Extreme';
      color = 'var(--accent-purple)';
      advice = 'Take full precautions now.';
    }
  }

  const pct = uv != null ? Math.min(100, (uv / 12) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', lineHeight: '1' }}>
            {uv != null ? uv.toFixed(1) : '--'}
          </h1>
          <span style={{ fontSize: '13px', fontWeight: '600', color: color, display: 'block', marginTop: '2px' }}>
            {uv != null ? level : 'Unknown'}
          </span>
        </div>
        <ShieldAlert size={30} style={{ color: color, opacity: 0.8 }} />
      </div>

      <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', position: 'relative', margin: '8px 0' }}>
        <div 
          style={{ 
            height: '100%', 
            width: `${pct}%`, 
            background: color, 
            borderRadius: '3px', 
            boxShadow: `0 0 8px ${color}`,
            transition: 'width 0.5s ease-out'
          }} 
        />
      </div>

      <p style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
        {uv != null ? advice : 'No UV details available.'}
      </p>
    </div>
  );
}

// 5. Wind Status Widget
function WindStatusWidget({ data, units }) {
  const current = data.current;
  const speed = current.wind_speed_10m;
  const dir = current.wind_direction_10m;
  const gusts = current.wind_gusts_10m;

  const getCardinal = (angle) => {
    if (angle == null) return '--';
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(angle / 45) % 8];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', lineHeight: '1' }}>
            {formatWind(speed, units)}
          </h1>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
            Dir: {dir != null ? `${dir}°` : '--°'} ({getCardinal(dir)})
          </span>
        </div>

        <div 
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.1)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.15)'
          }}
        >
          <span style={{ position: 'absolute', top: '1px', fontSize: '8px', fontWeight: 'bold', color: 'var(--text-muted)' }}>N</span>
          <div 
            style={{ 
              transform: `rotate(${dir || 0}deg)`, 
              transition: 'transform 0.8s ease-in-out',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Navigation size={18} style={{ color: 'var(--accent-purple)', fill: 'var(--accent-purple)', transform: 'rotate(-45deg)' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Gusts: </span>
          <span style={{ fontWeight: '600' }}>{formatWind(gusts, units)}</span>
        </div>
      </div>
    </div>
  );
}

// 6. Precipitation & Humidity Widget
function HumidityWidget({ data, units }) {
  const current = data.current;
  const daily = data.daily;
  const humidity = current.relative_humidity_2m;
  const todayIdx = findTodayDailyIndex(daily.time);
  const rainToday = daily.precipitation_sum ? daily.precipitation_sum[todayIdx] : null;
  const { latitude, longitude, timezone } = data;

  const [climateData, setClimateData] = useState(null);
  const [loadingClimate, setLoadingClimate] = useState(false);

  useEffect(() => {
    async function fetchClimateComparison() {
      if (latitude == null || longitude == null) return;
      try {
        setLoadingClimate(true);
        const query = new URLSearchParams({
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          timezone: timezone || 'auto'
        }).toString();
        const res = await fetch(`/api/climate_comparison?${query}`);
        if (res.ok) {
          const payload = await res.json();
          setClimateData(payload.data);
        }
      } catch (err) {
        console.error('Failed to load climate comparison data:', err);
      } finally {
        setLoadingClimate(false);
      }
    }

    fetchClimateComparison();
  }, [latitude, longitude, timezone]);

  const getComparisonValues = () => {
    if (!climateData) return null;
    const { avgHumidity, avgPrecipitation } = climateData;

    let humDiffText = 'typical';
    if (humidity != null && avgHumidity != null) {
      const diff = humidity - avgHumidity;
      if (diff > 8) humDiffText = 'humid';
      else if (diff < -8) humDiffText = 'dry';
    }

    let rainDiffText = 'typical';
    if (rainToday != null && avgPrecipitation != null) {
      const diff = rainToday - avgPrecipitation;
      if (rainToday > 0 && avgPrecipitation === 0) {
        rainDiffText = 'wet';
      } else if (diff > 1.5) {
        rainDiffText = 'wet';
      } else if (diff < -1.5) {
        rainDiffText = 'dry';
      }
    }

    const avgPrecipFormatted = formatPrecip(avgPrecipitation, units);

    return {
      humDiffText: humDiffText.charAt(0).toUpperCase() + humDiffText.slice(1),
      avgHumidity: Math.round(avgHumidity),
      rainDiffText: rainDiffText.charAt(0).toUpperCase() + rainDiffText.slice(1),
      avgPrecipFormatted
    };
  };

  const comp = getComparisonValues();

  // Active weather condition checks
  const isThunderstorm = current.weather_code != null && [95, 96, 99].includes(current.weather_code);
  const isRain = current.weather_code != null && ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(current.weather_code) || (current.precipitation && current.precipitation > 0));
  const isSnow = current.weather_code != null && ([71, 73, 75, 77, 85, 86].includes(current.weather_code) || (current.snowfall && current.snowfall > 0));
  const isFog = current.weather_code != null && [45, 48].includes(current.weather_code);

  const WeatherBadge = ({ active, label, color, icon: Icon }) => (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 6px',
        borderRadius: '6px',
        fontSize: '9px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        background: active ? `${color}15` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${active ? color : 'rgba(255,255,255,0.04)'}`,
        color: active ? color : 'var(--text-muted)',
        opacity: active ? 1 : 0.4,
        transition: 'all 0.3s',
        boxShadow: active ? `0 0 10px ${color}10` : 'none'
      }}
    >
      <Icon size={10} />
      <span>{label}</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px 16px', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Humidity</span>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>
            {humidity != null ? `${humidity}%` : '--%'}
          </h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '12px' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Rain Today</span>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>
            {formatPrecip(rainToday, units)}
          </h1>
        </div>
      </div>

      {/* Badges indicators for Precipitation widget */}
      <div style={{ display: 'flex', gap: '4px', justifyContent: 'space-between', margin: '4px 0' }}>
        <WeatherBadge active={isThunderstorm} label="Storm" color="var(--accent-purple)" icon={CloudLightning} />
        <WeatherBadge active={isRain} label="Rain" color="var(--accent-blue)" icon={CloudRain} />
        <WeatherBadge active={isSnow} label="Snow" color="var(--accent-teal)" icon={Snowflake} />
        <WeatherBadge active={isFog} label="Fog" color="#9ca3af" icon={CloudFog} />
      </div>

      {/* Structured Climate Comparison Footer */}
      {comp ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '10px', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '6px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>💧 Humidity:</span>
            <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{comp.humDiffText} (avg {comp.avgHumidity}%)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>🌧️ Precipitation:</span>
            <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{comp.rainDiffText} (avg {comp.avgPrecipFormatted})</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '9px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '6px' }}>
          <Droplets size={10} />
          <span>{loadingClimate ? 'Comparing with historical averages...' : 'Historical climate comparison offline.'}</span>
        </div>
      )}
    </div>
  );
}

// 7. Barometric Pressure Widget
function PressureWidget({ data }) {
  const current = data.current;
  const pressure = current.pressure_msl;
  const hourly = data.hourly;

  const currentHourIdx = hourly && hourly.time ? findCurrentHourIndex(hourly.time) : 0;
  const startIdx = hourly && hourly.pressure_msl ? Math.max(0, currentHourIdx - 72) : 0;
  const endIdx = hourly && hourly.pressure_msl ? Math.min(hourly.pressure_msl.length - 1, currentHourIdx + 72) : 0;
  const pressureTrace = hourly && hourly.pressure_msl ? hourly.pressure_msl.slice(startIdx, endIdx + 1) : [];
  const nowIdxInTrace = currentHourIdx - startIdx;

  let tendency = 'Steady';
  let tendencyColor = 'var(--text-secondary)';
  let minP = 1013;
  let maxP = 1013;
  let points = [];
  let dPath = '';

  if (pressureTrace.length > 0) {
    minP = Math.min(...pressureTrace);
    maxP = Math.max(...pressureTrace);
    const rangeP = maxP - minP === 0 ? 1 : maxP - minP;

    points = pressureTrace.map((val, idx) => {
      const x = (idx / (pressureTrace.length - 1)) * 220 + 10;
      const y = 30 - ((val - minP) / rangeP) * 22; // 8 to 30 range
      return { x, y, value: val };
    });
    
    dPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const currentP = pressureTrace[nowIdxInTrace] || pressure || 1013;
    const pastP = pressureTrace[Math.max(0, nowIdxInTrace - 3)] || currentP;
    const diff = currentP - pastP;

    if (diff > 0.5) {
      tendency = 'Rising';
      tendencyColor = 'var(--accent-orange)';
    } else if (diff < -0.5) {
      tendency = 'Falling';
      tendencyColor = 'var(--accent-teal)';
    }
  } else if (pressure != null) {
    if (pressure > 1015) {
      tendency = 'High Pressure';
      tendencyColor = 'var(--accent-orange)';
    } else if (pressure < 1009) {
      tendency = 'Low Pressure';
      tendencyColor = 'var(--accent-teal)';
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px 16px', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', lineHeight: '1' }}>
            {pressure != null ? Math.round(pressure) : '--'} <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--text-secondary)' }}>hPa</span>
          </h1>
          <span style={{ fontSize: '11px', fontWeight: '600', color: tendencyColor, display: 'block', marginTop: '2px' }}>
            {pressure != null ? tendency : 'Unknown'}
          </span>
        </div>
        <Gauge size={30} style={{ color: tendencyColor, opacity: 0.8 }} />
      </div>

      {pressureTrace.length > 0 && (
        <div style={{ position: 'relative', height: '35px', margin: '4px 0', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '4px' }}>
          <svg width="100%" height="100%" viewBox="0 0 240 35" preserveAspectRatio="none">
            <path 
              d={dPath} 
              fill="none" 
              stroke="var(--accent-blue)" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 0 3px rgba(59,130,246,0.4))' }}
            />
            {points[nowIdxInTrace] && (
              <line 
                x1={points[nowIdxInTrace].x} 
                y1="0" 
                x2={points[nowIdxInTrace].x} 
                y2="35" 
                stroke="rgba(255,255,255,0.25)" 
                strokeDasharray="2,2" 
              />
            )}
            {points[nowIdxInTrace] && (
              <circle 
                cx={points[nowIdxInTrace].x} 
                cy={points[nowIdxInTrace].y} 
                r="3.5" 
                fill="var(--accent-orange)" 
                style={{ filter: 'drop-shadow(0 0 4px var(--accent-orange))' }}
              />
            )}
          </svg>
          <span style={{ position: 'absolute', left: '10px', top: '22px', fontSize: '7.5px', color: 'var(--text-muted)' }}>Min: {Math.round(minP)}</span>
          <span style={{ position: 'absolute', right: '10px', top: '22px', fontSize: '7.5px', color: 'var(--text-muted)' }}>Max: {Math.round(maxP)}</span>
        </div>
      )}

      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', lineHeight: '1.2' }}>
        Standard sea-level is 1013 hPa.
      </div>
    </div>
  );
}

// 8. Sunrise & Sunset Widget
function SunriseSunsetWidget({ data }) {
  const daily = data.daily;
  const todayIdx = findTodayDailyIndex(daily.time);
  const sunriseStr = daily.sunrise ? daily.sunrise[todayIdx] : null;
  const sunsetStr = daily.sunset ? daily.sunset[todayIdx] : null;

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const sunTimePercent = () => {
    if (!sunriseStr || !sunsetStr) return 0;
    const now = new Date();
    const rise = new Date(sunriseStr);
    const set = new Date(sunsetStr);
    if (now < rise) return 0;
    if (now > set) return 100;
    const total = set - rise;
    const current = now - rise;
    return (current / total) * 100;
  };

  const sunPct = sunTimePercent();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sunrise size={18} style={{ color: 'var(--accent-orange)' }} />
          <div>
            <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block' }}>Rise</span>
            <span style={{ fontSize: '12px', fontWeight: '600' }}>{formatTime(sunriseStr)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sunset size={18} style={{ color: 'var(--accent-purple)' }} />
          <div>
            <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block' }}>Set</span>
            <span style={{ fontSize: '12px', fontWeight: '600' }}>{formatTime(sunsetStr)}</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', height: '30px', overflow: 'hidden', borderBottom: '1px dashed rgba(255, 255, 255, 0.15)', margin: '4px 0' }}>
        <svg width="100%" height="100%" viewBox="0 0 200 30" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, top: 0 }}>
          <path d="M 10,30 A 90,25 0 0,1 190,30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
          {sunPct > 0 && sunPct < 100 && (
            <circle 
              cx={10 + (sunPct / 100) * 180} 
              cy={30 - Math.sin((sunPct / 100) * Math.PI) * 22} 
              r="3.5" 
              fill="var(--accent-orange)" 
              style={{ filter: 'drop-shadow(0 0 5px var(--accent-orange))' }}
            />
          )}
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)' }}>
        <span>Daylight Active</span>
        <span>Localized</span>
      </div>
    </div>
  );
}

// 9. Air Quality Widget
function AirQualityWidget({ aqi }) {
  if (!aqi || !aqi.current) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <AlertCircle size={20} style={{ color: 'var(--text-secondary)', marginBottom: '6px' }} />
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>AQI Unavailable</span>
      </div>
    );
  }

  const current = aqi.current;
  const usAqi = current.us_aqi || 0;
  
  const pollenTypes = [
    { label: 'Grass', value: current.grass_pollen },
    { label: 'Birch', value: current.birch_pollen },
    { label: 'Alder', value: current.alder_pollen },
    { label: 'Ragweed', value: current.ragweed_pollen },
    { label: 'Olive', value: current.olive_pollen },
    { label: 'Mugwort', value: current.mugwort_pollen }
  ];
  const maxPollen = pollenTypes.reduce((max, p) => (p.value > (max?.value || 0) ? p : max), null);
  
  let aqiLabel = 'Good';
  let aqiColor = 'var(--accent-green)';
  let advice = 'Air is satisfactory.';

  if (usAqi >= 51 && usAqi <= 100) {
    aqiLabel = 'Moderate';
    aqiColor = '#fbbf24';
    advice = 'Sensitive groups active warning.';
  } else if (usAqi >= 101 && usAqi <= 150) {
    aqiLabel = 'Unhealthy Sensitive';
    aqiColor = 'var(--accent-orange)';
    advice = 'Sensitive limit outdoors.';
  } else if (usAqi >= 151) {
    aqiLabel = 'Unhealthy';
    aqiColor = 'var(--accent-red)';
    advice = 'Avoid outdoor exposure.';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div 
          style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '10px', 
            border: `2px solid ${aqiColor}`, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.2)',
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1' }}>{Math.round(usAqi)}</span>
          <span style={{ fontSize: '7px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>AQI</span>
        </div>
        <div style={{ overflow: 'hidden' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: aqiColor, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{aqiLabel}</span>
          <p style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{advice}</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', fontSize: '9px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>PM2.5:</span>
            <span style={{ fontWeight: '600' }}>{current.pm2_5 != null ? current.pm2_5.toFixed(1) : '0.0'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>PM10:</span>
            <span style={{ fontWeight: '600' }}>{current.pm10 != null ? current.pm10.toFixed(1) : '0.0'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Ozone:</span>
            <span style={{ fontWeight: '600' }}>{current.ozone != null ? Math.round(current.ozone) : '0'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>NO₂:</span>
            <span style={{ fontWeight: '600' }}>{current.nitrogen_dioxide != null ? Math.round(current.nitrogen_dioxide) : '0'}</span>
          </div>
        </div>
        {maxPollen && maxPollen.value > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '4px', marginTop: '2px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Pollen Risk:</span>
            <span style={{ fontWeight: '600', color: 'var(--accent-blue)' }}>
              {maxPollen.label} ({Math.round(maxPollen.value)}/m³)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// 10. Historical Weather Widget ("This Time Last Year")
function HistoricalWeatherWidget({ data, units }) {
  const { latitude, longitude, timezone } = data;
  const [histData, setHistData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get date 1 year ago
  const targetDate = new Date();
  targetDate.setFullYear(targetDate.getFullYear() - 1);
  const dateStr = targetDate.toISOString().split('T')[0];
  const formattedDate = targetDate.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });

  useEffect(() => {
    async function fetchHistorical() {
      if (latitude == null || longitude == null) return;
      try {
        setLoading(true);
        setError(null);

        const query = new URLSearchParams({
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          date: dateStr,
          timezone: timezone || 'auto'
        }).toString();

        const response = await fetch(`/api/historical?${query}`);
        if (!response.ok) throw new Error('Historical weather retrieval failed');
        const payload = await response.json();
        
        setHistData(payload.data);
      } catch (err) {
        console.error(err);
        setError('History offline');
      } finally {
        setLoading(false);
      }
    }

    fetchHistorical();
  }, [latitude, longitude, timezone, dateStr]);

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
        <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite', marginRight: '6px' }} />
        Retrieving archive records...
      </div>
    );
  }

  if (error || !histData || !histData.daily) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <AlertCircle size={20} style={{ color: 'var(--text-secondary)', marginBottom: '6px' }} />
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>Archive data currently unavailable</span>
      </div>
    );
  }

  const hist = histData.daily;
  const code = hist.weather_code ? hist.weather_code[0] : 0;
  const maxTemp = hist.temperature_2m_max ? hist.temperature_2m_max[0] : null;
  const minTemp = hist.temperature_2m_min ? hist.temperature_2m_min[0] : null;
  const rain = hist.precipitation_sum ? hist.precipitation_sum[0] : null;
  
  const weatherInfo = getWeatherInfo(code, 1);
  const WeatherIcon = weatherInfo.icon;

  const getTempUnitLabel = () => units === 'imperial' ? '°F' : '°C';
  const getPrecipUnitLabel = () => units === 'imperial' ? 'in' : 'mm';

  const getComparisonText = () => {
    if (maxTemp == null || !data.daily || !data.daily.temperature_2m_max) return '';
    const todayIdx = findTodayDailyIndex(data.daily.time);
    const todayMax = data.daily.temperature_2m_max[todayIdx];
    if (todayMax == null) return '';

    let diff = maxTemp - todayMax;
    let label = '';
    
    if (Math.abs(diff) < 1.0) {
      label = 'similar temperature';
    } else {
      const displayDiff = units === 'imperial' ? diff * 1.8 : diff;
      const rounded = Math.round(Math.abs(displayDiff));
      label = `${rounded}${getTempUnitLabel()} ${diff > 0 ? 'warmer' : 'cooler'}`;
    }

    let rainLabel = '';
    const todayRain = data.daily.precipitation_sum ? data.daily.precipitation_sum[todayIdx] : 0;
    if (rain > 0.5 && todayRain <= 0.5) {
      rainLabel = ' and rainier';
    } else if (rain <= 0.5 && todayRain > 0.5) {
      rainLabel = ' and drier';
    }

    return `This day last year was ${label}${rainLabel} compared to today's forecast.`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-blue)' }}>{formattedDate}</h2>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{weatherInfo.label}</p>
        </div>
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px', padding: '6px' }}>
          <WeatherIcon size={24} style={{ color: weatherInfo.color }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', margin: '4px 0', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Temp Range</span>
          <span style={{ fontSize: '18px', fontWeight: '800', marginTop: '2px' }}>
            {maxTemp != null ? `${Math.round(maxTemp)}°` : '--°'} / {minTemp != null ? `${Math.round(minTemp)}°` : '--°'}
            <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '4px' }}>{getTempUnitLabel()}</span>
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '16px' }}>
          <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Precipitation</span>
          <span style={{ fontSize: '18px', fontWeight: '800', marginTop: '2px' }}>
            {rain != null ? `${rain.toFixed(1)}` : '0.0'}
            <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '4px' }}>{getPrecipUnitLabel()}</span>
          </span>
        </div>
      </div>

      <p style={{ fontSize: '10px', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', lineHeight: '1.4' }}>
        {getComparisonText()}
      </p>
    </div>
  );
}

/* ----------------------------------------------------
   WIDGET FACTORY MAIN CONTAINER
---------------------------------------------------- */
export default function WeatherWidget({ type, weatherData, aqiData, units, isEditMode, onDelete, font, onUpdateFont, onDragStart, widgetProps, onUpdateProps }) {
  const [isFlipped, setIsFlipped] = useState(false);
  
  const widgetConfigs = {
    current: { title: 'Current Weather', component: CurrentWeatherWidget },
    hourly: { title: 'Hourly Forecast', component: HourlyForecastWidget },
    daily: { title: widgetProps?.daysCount ? `${widgetProps.daysCount}-Day Forecast` : '7-Day Forecast', component: DailyForecastWidget },
    uv: { title: 'UV Index', component: UVIndexWidget },
    wind: { title: 'Wind Status', component: WindStatusWidget },
    humidity: { title: 'Precipitation & Moisture', component: HumidityWidget },
    pressure: { title: 'Barometric Pressure', component: PressureWidget },
    sun: { title: 'Sunrise / Sunset', component: SunriseSunsetWidget },
    aqi: { title: 'Air Quality Index', component: AirQualityWidget },
    historical: { title: 'This Time Last Year', component: HistoricalWeatherWidget }
  };

  const config = widgetConfigs[type];

  if (!config) {
    return <div className="glass-card" style={{ padding: '16px', color: 'var(--text-secondary)' }}>Unknown Widget Type</div>;
  }

  const WidgetContent = config.component;

  const fontStyle = font ? { 
    fontFamily: `'${font}', sans-serif`,
    '--font-title': `'${font}', sans-serif`,
    '--font-body': `'${font}', sans-serif`
  } : {};

  // Card Flip Click Handler
  const handleCardClick = (e) => {
    if (isEditMode) return;
    const targetTag = e.target.tagName.toLowerCase();
    // Don't flip if clicking interactive controls
    if (
      targetTag === 'select' || 
      targetTag === 'button' || 
      targetTag === 'option' || 
      targetTag === 'input' || 
      e.target.closest('button') || 
      e.target.closest('select')
    ) {
      return;
    }
    setIsFlipped(!isFlipped);
  };

  // Helper to resolve cardinal direction
  const getCardinal = (angle) => {
    if (angle == null) return '--';
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(angle / 45) % 8];
  };

  // Dynamic Meteorological Explanations for each widget type
  const getDynamicExplanation = () => {
    if (!weatherData) return 'No weather data available to analyze.';

    const current = weatherData.current;
    const daily = weatherData.daily;
    const hourly = weatherData.hourly;

    switch (type) {
      case 'current': {
        const info = getWeatherInfo(current?.weather_code, current?.is_day);
        return `Current temperature is ${current?.temperature_2m != null ? Math.round(current.temperature_2m) : '--'}°${units === 'imperial' ? 'F' : 'C'} (feels like ${current?.apparent_temperature != null ? Math.round(current.apparent_temperature) : '--'}°${units === 'imperial' ? 'F' : 'C'}) with "${info.label.toLowerCase()}" conditions. This box updates every 10 minutes to show real-time station metrics.`;
      }
      case 'hourly': {
        const currentHourIdx = findCurrentHourIndex(hourly?.time);
        const temps = hourly?.temperature_2m ? hourly.temperature_2m.slice(currentHourIdx, currentHourIdx + 12) : [];
        const minTemp = temps.length > 0 ? Math.min(...temps) : null;
        const maxTemp = temps.length > 0 ? Math.max(...temps) : null;
        return `The hourly forecast maps out temperature trends for the next 12 hours. Temperatures are projected to range from a low of ${minTemp != null ? Math.round(minTemp) : '--'}° to a high of ${maxTemp != null ? Math.round(maxTemp) : '--'}°.`;
      }
      case 'daily': {
        const limit = widgetProps?.daysCount || 7;
        const todayIdx = findTodayDailyIndex(daily?.time);
        const maxToday = daily?.temperature_2m_max ? daily.temperature_2m_max[todayIdx] : null;
        const minToday = daily?.temperature_2m_min ? daily.temperature_2m_min[todayIdx] : null;
        return `This outlook displays weather forecasts for the next ${limit} days. Today's temperatures will range from a low of ${minToday != null ? Math.round(minToday) : '--'}° to a high of ${maxToday != null ? Math.round(maxToday) : '--'}° with precipitation probability values.`;
      }
      case 'uv': {
        const uv = current?.uv_index;
        if (uv == null) return 'No UV index details are currently available.';
        if (uv < 3) {
          return `A UV rating of ${uv.toFixed(1)} is classified as low. At this level there is minimal danger from the sun's rays for the average person, and no special sun protection is required. It is perfectly safe to spend time outdoors without needing sunscreen or protective clothing.`;
        } else if (uv < 6) {
          return `A UV rating of ${uv.toFixed(1)} is classified as moderate. Protection is needed. Seek shade during midday hours, wear a wide-brimmed hat, sunglasses, and apply SPF 15+ sunscreen.`;
        } else if (uv < 8) {
          return `A UV rating of ${uv.toFixed(1)} is classified as high. Protection is required. Reduce time in the sun between 10 a.m. and 4 p.m. Wear protective clothing, a hat, sunglasses, and SPF 30+ sunscreen.`;
        } else if (uv < 11) {
          return `A UV rating of ${uv.toFixed(1)} is classified as very high. Extra protection is needed. Avoid sun exposure during midday. Wear protective clothing, SPF 30+ sunscreen, a wide-brimmed hat, and sunglasses.`;
        } else {
          return `A UV rating of ${uv.toFixed(1)} is classified as extreme. Take all precautions. Unprotected skin and eyes can burn in minutes. Avoid the sun between 10 a.m. and 4 p.m., seek shade, and wear protective clothing and sunscreen.`;
        }
      }
      case 'wind': {
        const speed = current?.wind_speed_10m;
        const gusts = current?.wind_gusts_10m;
        const dir = current?.wind_direction_10m;
        return `Wind is blowing at ${speed != null ? Math.round(speed) : '--'} ${units === 'metric' ? 'km/h' : 'mph'} from the ${getCardinal(dir)} (${dir != null ? dir : '--'}°), with recent gusts measuring up to ${gusts != null ? Math.round(gusts) : '--'} ${units === 'metric' ? 'km/h' : 'mph'}.`;
      }
      case 'humidity': {
        const humidity = current?.relative_humidity_2m;
        const todayIdx = findTodayDailyIndex(daily?.time);
        const rainToday = daily?.precipitation_sum ? daily.precipitation_sum[todayIdx] : 0;
        return `Humidity measures the percentage of water vapor in the air (currently ${humidity != null ? humidity : '--'}%). Total precipitation today stands at ${rainToday != null ? rainToday.toFixed(1) : '0.0'} ${units === 'imperial' ? 'in' : 'mm'}. Click card to view historical climate comparisons.`;
      }
      case 'pressure': {
        const pressure = current?.pressure_msl;
        return `Atmospheric pressure is ${pressure != null ? Math.round(pressure) : '--'} hPa. Standard sea level pressure is 1013 hPa. Higher pressure generally brings stable weather, while lower pressure indicates storms. The sparkline displays trends from 72 hours ago to 72 hours in the future.`;
      }
      case 'sun': {
        const todayIdx = findTodayDailyIndex(daily?.time);
        const rise = daily?.sunrise ? daily.sunrise[todayIdx] : null;
        const set = daily?.sunset ? daily.sunset[todayIdx] : null;
        const formatTime = (isoString) => {
          if (!isoString) return '--:--';
          const d = new Date(isoString);
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };
        return `Sunrise occurs at ${formatTime(rise)} and sunset is at ${formatTime(set)}. The solar path tracker shows the relative altitude of the sun in the sky based on station coordinates.`;
      }
      case 'aqi': {
        if (!aqiData || !aqiData.current) return 'No air quality details are available.';
        const aqiVal = aqiData.current.us_aqi || 0;
        let aqiLabel = 'Good';
        let laymanMeaning = 'Air quality is satisfactory, and air pollution poses little or no risk. It is perfectly safe to open windows and spend time outdoors.';
        
        if (aqiVal >= 51 && aqiVal <= 100) {
          aqiLabel = 'Moderate';
          laymanMeaning = 'Air quality is acceptable; however, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.';
        } else if (aqiVal >= 101 && aqiVal <= 150) {
          aqiLabel = 'Unhealthy for Sensitive Groups';
          laymanMeaning = 'Members of sensitive groups (like asthmatics, children, or the elderly) may experience health effects. The general public is less likely to be affected.';
        } else if (aqiVal >= 151) {
          aqiLabel = 'Unhealthy';
          laymanMeaning = 'Everyone may begin to experience health effects, and members of sensitive groups may experience more serious health effects. Outdoor activities should be limited.';
        }
        
        const cur = aqiData.current;
        let pollenInfo = '';
        const activeList = [];
        if (cur.grass_pollen > 0) activeList.push(`Grass: ${Math.round(cur.grass_pollen)}/m³`);
        if (cur.birch_pollen > 0) activeList.push(`Birch: ${Math.round(cur.birch_pollen)}/m³`);
        if (cur.alder_pollen > 0) activeList.push(`Alder: ${Math.round(cur.alder_pollen)}/m³`);
        if (cur.ragweed_pollen > 0) activeList.push(`Ragweed: ${Math.round(cur.ragweed_pollen)}/m³`);
        if (cur.olive_pollen > 0) activeList.push(`Olive: ${Math.round(cur.olive_pollen)}/m³`);
        if (cur.mugwort_pollen > 0) activeList.push(`Mugwort: ${Math.round(cur.mugwort_pollen)}/m³`);
        
        if (activeList.length > 0) {
          pollenInfo = ` Active Pollen counts: ${activeList.join(', ')}.`;
        } else {
          pollenInfo = ` No active pollen counts detected.`;
        }
        
        return `The Air Quality Index is ${Math.round(aqiVal)} (US EPA AQI), which is classified as "${aqiLabel}". In layman's terms: ${laymanMeaning} (PM2.5: ${cur.pm2_5 != null ? cur.pm2_5.toFixed(1) : '0.0'} µg/m³, PM10: ${cur.pm10 != null ? cur.pm10.toFixed(1) : '0.0'} µg/m³).${pollenInfo}`;
      }
      case 'historical': {
        const date = new Date();
        date.setFullYear(date.getFullYear() - 1);
        const formattedDate = date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
        return `This card compares today's current forecast parameters with archived weather conditions logged at this exact location one year ago today (${formattedDate}).`;
      }
      default:
        return 'Details about this weather parameter are displayed here.';
    }
  };

  return (
    <div className={`card-flip-container ${isFlipped ? 'flipped' : ''}`} style={fontStyle} onClick={handleCardClick}>
      <div className="card-flipper">
        
        {/* FRONT SIDE */}
        <div className="card-front glass-card">
          <WidgetHeader 
            title={config.title} 
            type={type}
            isEditMode={isEditMode} 
            onDelete={onDelete} 
            font={font}
            onUpdateFont={onUpdateFont}
            onDragStart={onDragStart}
          />
          <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', borderRadius: '0 0 20px 20px' }}>
            {weatherData ? (
              <WidgetContent 
                data={weatherData} 
                aqi={aqiData} 
                units={units} 
                daysCount={widgetProps?.daysCount}
                showWind={widgetProps?.showWind}
                showUV={widgetProps?.showUV}
                showRain={widgetProps?.showRain}
                showSun={widgetProps?.showSun}
                onUpdateProps={onUpdateProps}
              />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                Loading data...
              </div>
            )}
          </div>
        </div>

        {/* BACK SIDE */}
        <div className="card-back glass-card">
          <WidgetHeader 
            title={`${config.title} - Info`} 
            type={type}
            isEditMode={false} 
          />
          <div 
            style={{ 
              flex: 1, 
              padding: '16px', 
              fontSize: '11px', 
              lineHeight: '1.4', 
              color: 'var(--text-secondary)', 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              userSelect: 'none',
              borderRadius: '0 0 20px 20px',
              overflow: 'hidden'
            }}
          >
            <p style={{ color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '12px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              💡 Quick Analysis
            </p>
            <p style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>
              {getDynamicExplanation()}
            </p>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              🔄 Click anywhere to flip back
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
