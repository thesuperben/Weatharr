import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';

export default function LocationSearch({ onSelectCity }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);
  const timeoutRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search API fetch
  const performSearch = async (val) => {
    if (!val || val.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/geocoding?name=${encodeURIComponent(val)}&count=8`);
      if (response.ok) {
        const body = await response.json();
        setResults(body.data?.results || []);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Error searching location:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce typing
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 400);
  };

  const handleSelect = (item) => {
    const cityObj = {
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone,
      country: item.country || item.admin1 || ''
    };
    onSelectCity(cityObj);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div className="location-search-container" ref={searchRef} style={{ position: 'relative', width: '100%', maxWidth: '380px', zIndex: 100 }}>
      <div className="search-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
          {loading ? <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} /> : <Search size={18} />}
        </span>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Search location (e.g. Paris, Tokyo...)"
          className="input-text"
          style={{ paddingLeft: '38px', paddingRight: '38px' }}
        />
        {query && (
          <button
            onClick={clearSearch}
            style={{
              position: 'absolute',
              right: '12px',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (query.trim().length >= 2) && (
        <div
          className="search-results-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
            borderRadius: '14px',
            maxHeight: '280px',
            overflowY: 'auto',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            padding: '6px'
          }}
        >
          {results.length === 0 && !loading && (
            <div style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '14px' }}>
              No results found
            </div>
          )}
          {results.map((item) => (
            <button
              key={`${item.id}-${item.latitude}`}
              onClick={() => handleSelect(item)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background 0.2s',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <MapPin size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontWeight: '500' }}>{item.name}</span>
                {item.admin1 && <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>, {item.admin1}</span>}
                {item.country && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}> ({item.country})</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
