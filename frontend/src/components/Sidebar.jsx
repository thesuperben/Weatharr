import React, { useState, useEffect } from 'react';
import { 
  Lock, Unlock, ShieldAlert, Plus, Globe, Settings, Sun, Wind, Gauge, Droplets, Calendar, Watch, ListPlus, Trash2
} from 'lucide-react';

export default function Sidebar({
  isOpen,
  onClose,
  isMobile = false,
  units,
  setUnits,
  globalFont,
  setGlobalFont,
  isEditMode,
  setEditMode,
  activeCity,
  timezone,
  widgets,
  onAddWidget,
  profiles,
  onSaveProfile,
  onLoadProfile,
  onDeleteProfile,
  onAutoArrange,
  owmApiKey,
  onSaveOwmApiKey,
  onExportSetup,
  onImportSetup
}) {
  const [profileName, setProfileName] = useState('');
  const [localApiKey, setLocalApiKey] = useState(owmApiKey || '');

  useEffect(() => {
    setLocalApiKey(owmApiKey || '');
  }, [owmApiKey]);
  
  const allAvailableWidgets = [
    { type: 'current', title: 'Current Weather', icon: Sun, desc: 'Temperature & conditions' },
    { type: 'hourly', title: 'Hourly Forecast', icon: Watch, desc: '24-hour temperature trend' },
    { type: 'daily', title: '7-Day Forecast', icon: Calendar, desc: 'Weekly temperature bars' },
    { type: 'uv', title: 'UV Index', icon: ShieldAlert, desc: 'Solar UV levels & safety advice' },
    { type: 'wind', title: 'Wind Status', icon: Wind, desc: 'Compass, speed & gusts' },
    { type: 'humidity', title: 'Humidity & Rain', icon: Droplets, desc: 'Precipitation sums' },
    { type: 'pressure', title: 'Barometric Pressure', icon: Gauge, desc: 'Barometer & tendency' },
    { type: 'sun', title: 'Sunrise / Sunset', icon: Sun, desc: 'Animated sun tracking path' },
    { type: 'aqi', title: 'Air Quality Index', icon: ShieldAlert, desc: 'PM2.5, PM10 & EPA health indices' },
    { type: 'historical', title: 'This Time Last Year', icon: Calendar, desc: 'Compare weather from one year ago' }
  ];

  return (
    <div 
      className="sidebar-container"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: '320px',
        background: 'rgba(10, 15, 30, 0.85)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderRight: '1px solid var(--glass-border)',
        boxShadow: '10px 0 30px rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: '20px'
      }}
    >
      {/* Sidebar Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={22} style={{ color: 'var(--accent-blue)' }} />
          <h2 style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-title)' }}>Control Center</h2>
        </div>
        <button 
          onClick={onClose} 
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: '8px',
            fontSize: '12px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
        >
          Close
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingRight: '4px' }}>
        
        {/* 1. Dashboard Layout Lock */}
        {!isMobile && (
          <>
            <div>
              <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', fontWeight: 'bold' }}>
                Dashboard State
              </h4>
              <button 
                onClick={() => setEditMode(!isEditMode)}
                className={`btn ${isEditMode ? 'btn-primary' : ''}`}
                style={{ 
                  width: '100%', 
                  justifyContent: 'center',
                  background: isEditMode ? 'var(--accent-blue)' : 'rgba(255,255,255,0.03)',
                  boxShadow: isEditMode ? '0 0 12px var(--accent-blue-glow)' : 'none'
                }}
              >
                {isEditMode ? (
                  <>
                    <Unlock size={16} />
                    <span>Lock Dashboard (Edit Active)</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>Unlock & Edit Widgets</span>
                  </>
                )}
              </button>
            </div>

            {/* 1b. Auto-Arrange Layout */}
            <div>
              <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', fontWeight: 'bold' }}>
                Auto-Arrange Canvas
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => onAutoArrange('pack')}
                  className="btn"
                  style={{ fontSize: '11px', justifyContent: 'center', padding: '8px' }}
                >
                  Dense Grid Pack
                </button>
                <button
                  onClick={() => onAutoArrange('portrait')}
                  className="btn"
                  style={{ fontSize: '11px', justifyContent: 'center', padding: '8px' }}
                >
                  Portrait Stack (9:16)
                </button>
              </div>
            </div>
          </>
        )}

        {/* 2. Global Units Selector */}
        <div>
          <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', fontWeight: 'bold' }}>
            Measurement Units
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            {['metric', 'imperial', 'uk'].map((u) => (
              <button
                key={u}
                onClick={() => setUnits(u)}
                style={{
                  padding: '8px 4px',
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: units === u ? 'var(--accent-blue)' : 'var(--glass-border)',
                  background: units === u ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.02)',
                  color: units === u ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: units === u ? 'bold' : 'normal',
                  fontSize: '11px',
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {u === 'uk' ? 'UK Metric' : u}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Global Font Selector */}
        <div>
          <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', fontWeight: 'bold' }}>
            Global Typography
          </h4>
          <select
            value={globalFont}
            onChange={(e) => setGlobalFont(e.target.value)}
            disabled={!isEditMode}
            className="input-text"
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--glass-border)',
              borderRadius: '12px',
              color: 'var(--text-primary)',
              padding: '10px',
              fontFamily: 'var(--font-body)',
              width: '100%',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="Outfit" style={{ background: '#111827', color: '#fff' }}>Outfit (Default)</option>
            <option value="Inter" style={{ background: '#111827', color: '#fff' }}>Inter (Clean)</option>
            <option value="JetBrains Mono" style={{ background: '#111827', color: '#fff' }}>JetBrains Mono (Tech)</option>
            <option value="Lora" style={{ background: '#111827', color: '#fff' }}>Lora (Classic Serif)</option>
            <option value="Playfair Display" style={{ background: '#111827', color: '#fff' }}>Playfair Display (Elegant)</option>
            <option value="Syne" style={{ background: '#111827', color: '#fff' }}>Syne (Modern Art)</option>
          </select>
        </div>

        {/* 3b. API Integration Settings */}
        <div>
          <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', fontWeight: 'bold' }}>
            API Integrations
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="password"
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                disabled={!isEditMode}
                className="input-text"
                placeholder={isEditMode ? "OpenWeatherMap API Key..." : "Unlock layout to edit..."}
                style={{ padding: '8px 12px', fontSize: '12px' }}
              />
              <button
                onClick={() => onSaveOwmApiKey(localApiKey)}
                disabled={!isEditMode}
                className="btn btn-primary"
                style={{ padding: '8px 12px', fontSize: '11px', flexShrink: 0 }}
              >
                Save
              </button>
            </div>
            <p style={{ fontSize: '9px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
              If provided, current weather measurements (temp, humidity, pressure, wind) will pull live observations from OpenWeatherMap instead of GFS model estimates.
            </p>
          </div>
        </div>

        {/* 4. Location Details */}
        <div>
          <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', fontWeight: 'bold' }}>
            Active Station Details
          </h4>
          <div 
            style={{ 
              background: 'rgba(0,0,0,0.2)', 
              borderRadius: '12px', 
              padding: '12px', 
              fontSize: '13px', 
              display: 'flex', 
              flexDirection: 'column',
              gap: '8px',
              border: '1px solid rgba(255,255,255,0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Location:</span>
              <span style={{ fontWeight: '500', textAlign: 'right' }}>{activeCity.name}, {activeCity.country}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Coordinates:</span>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${activeCity.latitude},${activeCity.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  color: 'var(--accent-blue)', 
                  textDecoration: 'none', 
                  fontWeight: '500',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                {activeCity.latitude.toFixed(4)}°, {activeCity.longitude.toFixed(4)}° ↗
              </a>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Timezone:</span>
              <span style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Globe size={12} style={{ color: 'var(--accent-blue)' }} />
                {timezone}
              </span>
            </div>
          </div>
        </div>

        {/* 4b. Layout Profiles Manager */}
        <div>
          <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', fontWeight: 'bold' }}>
            Layout Profiles
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                disabled={!isEditMode}
                className="input-text"
                placeholder={isEditMode ? "New profile..." : "Unlock layout to manage..."}
                style={{ padding: '8px 12px', fontSize: '12px' }}
              />
              <button
                onClick={() => {
                  if (profileName.trim()) {
                    onSaveProfile(profileName);
                    setProfileName('');
                  }
                }}
                disabled={!isEditMode}
                className="btn btn-primary"
                style={{ padding: '8px 12px', fontSize: '11px', flexShrink: 0 }}
              >
                Save
              </button>
            </div>
            
            {profiles && profiles.length > 0 && (
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '6px', 
                  maxHeight: '150px', 
                  overflowY: 'auto',
                  background: 'rgba(0,0,0,0.15)',
                  borderRadius: '10px',
                  padding: '6px',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}
              >
                {profiles.map((p) => (
                  <div 
                    key={p.id}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.02)',
                      fontSize: '11px',
                      gap: '6px'
                    }}
                  >
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{p.city?.name || 'Saved location'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => onLoadProfile(p)}
                        disabled={!isEditMode}
                        style={{
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: 'none',
                          color: 'var(--accent-blue)',
                          cursor: isEditMode ? 'pointer' : 'not-allowed',
                          opacity: isEditMode ? 1 : 0.5,
                          padding: '4px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 'bold'
                        }}
                      >
                        Load
                      </button>
                      <button
                        onClick={() => onDeleteProfile(p.id)}
                        disabled={!isEditMode}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: 'none',
                          color: 'var(--accent-red)',
                          cursor: isEditMode ? 'pointer' : 'not-allowed',
                          opacity: isEditMode ? 1 : 0.5,
                          padding: '4px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 'bold'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4c. Share Dashboard */}
        <div>
          <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', fontWeight: 'bold' }}>
            Share Dashboard
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              onClick={onExportSetup}
              className="btn"
              style={{ fontSize: '11px', justifyContent: 'center', padding: '8px' }}
            >
              Export JSON
            </button>
            <button
              onClick={onImportSetup}
              className="btn"
              style={{ fontSize: '11px', justifyContent: 'center', padding: '8px' }}
            >
              Import JSON
            </button>
          </div>
        </div>

        {/* 5. Widget List Factory (Add new widgets) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <ListPlus size={16} style={{ color: 'var(--accent-blue)' }} />
            <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
              Add Widgets to Canvas
            </h4>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allAvailableWidgets.map((w) => {
              const alreadyInGrid = widgets.some(gw => gw.type === w.type);
              return (
                <button
                  key={w.type}
                  disabled={alreadyInGrid || !isEditMode}
                  onClick={() => onAddWidget(w.type)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    background: (alreadyInGrid || !isEditMode) ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.03)',
                    color: (alreadyInGrid || !isEditMode) ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: (alreadyInGrid || !isEditMode) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    width: '100%',
                    textAlign: 'left',
                    opacity: isEditMode ? 1 : 0.6
                  }}
                  onMouseEnter={(e) => {
                    if (!alreadyInGrid && isEditMode) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.borderColor = 'var(--glass-border-focus)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!alreadyInGrid && isEditMode) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.borderColor = 'var(--glass-border)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        display: 'flex', 
                        padding: '6px', 
                        borderRadius: '8px', 
                        background: (alreadyInGrid || !isEditMode) ? 'rgba(255,255,255,0.01)' : 'rgba(59, 130, 246, 0.08)',
                        color: (alreadyInGrid || !isEditMode) ? 'var(--text-muted)' : 'var(--accent-blue)' 
                      }}
                    >
                      <w.icon size={16} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <span style={{ fontSize: '13px', fontWeight: '500', display: 'block' }}>{w.title}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {w.desc}
                      </span>
                    </div>
                  </div>
                  {!alreadyInGrid && isEditMode && (
                    <Plus size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Sidebar Footer */}
      <div 
        style={{ 
          borderTop: '1px solid rgba(255,255,255,0.05)', 
          paddingTop: '14px', 
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--text-muted)' 
        }}
      >
        Weatharr self-hosted release v1.0.0
      </div>
    </div>
  );
}
