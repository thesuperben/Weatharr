import React, { useState, useRef, useEffect } from 'react';

// Helper to generate smooth cubic bezier path
function getBezierPath(points) {
  if (points.length < 2) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    
    // Control points
    const cpX1 = p0.x + (p1.x - p0.x) / 3;
    const cpY1 = p0.y;
    const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
    const cpY2 = p1.y;
    
    path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }
  return path;
}

export default function WeatherChart({ 
  data, 
  labels, 
  unitLabel = '°C', 
  type = 'temperature', 
  sunMarkers = [],
  series = [],
  currentHourMarker = null
}) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 160 });

  // Update SVG sizing dynamically based on bounding container
  useEffect(() => {
    if (!containerRef.current) return;
    
    const handleResize = () => {
      setDimensions({
        width: containerRef.current.clientWidth || 500,
        height: containerRef.current.clientHeight || 160
      });
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if ((!data || data.length === 0) && (!series || series.length === 0)) {
    return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No data available</div>;
  }

  // Configuration based on chart type for single series mode
  let strokeColor = 'var(--accent-blue)';
  if (type === 'temperature') strokeColor = 'var(--accent-orange)';
  else if (type === 'precipitation') strokeColor = 'var(--accent-teal)';
  else if (type === 'wind') strokeColor = 'var(--accent-purple)';

  // Build resolvedSeries list from series array or single-data fallback
  const resolvedSeries = (series && series.length > 0)
    ? series
    : (data && data.length > 0 ? [{
        name: type,
        label: type === 'temperature' ? 'Temp' : (type === 'precipitation' ? 'Rain' : (type === 'wind' ? 'Wind' : 'Value')),
        data: data,
        color: strokeColor,
        unit: unitLabel
      }] : []);

  const paddingLeft = 35;
  const paddingRight = 35;
  const paddingTop = 25;
  const paddingBottom = 25;

  const chartWidth = dimensions.width - paddingLeft - paddingRight;
  const chartHeight = dimensions.height - paddingTop - paddingBottom;

  // Helper to normalize and compute coordinates per series
  const getSeriesRange = (sData, sName) => {
    let min = Math.min(...sData);
    let max = Math.max(...sData);
    
    // Minimum span to prevent deceptive visual scaling
    const minSpan = sName === 'temp' || sName === 'temperature' ? 10 : 5;
    const span = max - min;
    if (span < minSpan) {
      const pad = (minSpan - span) / 2;
      min -= pad;
      max += pad;
      if (['rain', 'uv', 'wind', 'precipitation'].includes(sName)) {
        if (min < 0) {
          const excess = -min;
          min = 0;
          max += excess;
        }
      }
    }
    return { min, max, range: max - min === 0 ? 1 : max - min };
  };

  const seriesPoints = resolvedSeries.map(s => {
    const { min, max, range } = getSeriesRange(s.data, s.name);
    const pts = s.data.map((val, idx) => {
      const x = paddingLeft + (idx / (s.data.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - ((val - min) / range) * chartHeight;
      return { x, y, value: val, label: labels[idx] };
    });
    return {
      ...s,
      points: pts,
      minVal: Math.min(...s.data),
      maxVal: Math.max(...s.data)
    };
  });

  const pointsLength = seriesPoints[0] ? seriesPoints[0].points.length : 0;
  const displayLabels = seriesPoints[0] ? seriesPoints[0].points.filter((_, idx) => idx % Math.max(1, Math.floor(pointsLength / 5)) === 0) : [];

  // Track mouse movements to show tooltip
  const handleMouseMove = (e) => {
    if (!containerRef.current || seriesPoints.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const refPoints = seriesPoints[0].points;
    let closestIdx = 0;
    let minDiff = Infinity;
    refPoints.forEach((pt, idx) => {
      const diff = Math.abs(pt.x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    setHoverIndex(closestIdx);
    setHoverPos({ x: refPoints[closestIdx].x, y: refPoints[closestIdx].y });
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '100%', position: 'relative', cursor: 'crosshair', userSelect: 'none' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} preserveAspectRatio="none">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((ratio, idx) => {
          const y = paddingTop + ratio * chartHeight;
          return (
            <line 
              key={idx}
              x1={paddingLeft} 
              y1={y} 
              x2={dimensions.width - paddingRight} 
              y2={y} 
              stroke="white" 
              strokeWidth="1" 
              strokeDasharray="4 4"
              opacity="0.08"
            />
          );
        })}

        {/* Render paths for each active series */}
        {seriesPoints.map((s, sIdx) => {
          const linePath = getBezierPath(s.points);
          const gradientId = `grad-${s.name}-${sIdx}`;
          return (
            <g key={s.name}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {linePath && (
                <path 
                  d={`${linePath} L ${s.points[s.points.length - 1].x} ${dimensions.height - paddingBottom} L ${s.points[0].x} ${dimensions.height - paddingBottom} Z`} 
                  fill={`url(#${gradientId})`}
                  opacity={seriesPoints.length === 1 ? 1 : 0.4}
                />
              )}
              {linePath && (
                <path 
                  d={linePath} 
                  fill="none" 
                  stroke={s.color} 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                  filter="url(#glow)"
                />
              )}

              {/* Min/Max value tags */}
              {s.points.map((pt, ptIdx) => {
                const isMax = pt.value === s.maxVal;
                const isMin = pt.value === s.minVal;
                const firstMaxIdx = s.data.indexOf(s.maxVal);
                const firstMinIdx = s.data.indexOf(s.minVal);

                if ((isMax && ptIdx === firstMaxIdx) || (isMin && ptIdx === firstMinIdx && s.minVal !== s.maxVal)) {
                  return (
                    <g key={`marker-${ptIdx}`}>
                      <circle cx={pt.x} cy={pt.y} r="3.5" fill={s.color} />
                      <text 
                        x={pt.x} 
                        y={isMax ? pt.y - 8 : pt.y + 12} 
                        fill={s.color} 
                        fontSize="8.5" 
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="var(--font-body)"
                      >
                        {Math.round(pt.value)}{s.unit}
                      </text>
                    </g>
                  );
                }
                return null;
              })}
            </g>
          );
        })}

        {/* X-Axis labels */}
        {displayLabels.map((pt, idx) => (
          <text 
            key={idx}
            x={pt.x} 
            y={dimensions.height - 6} 
            fill="var(--text-secondary)" 
            fontSize="10" 
            textAnchor="middle"
            fontFamily="var(--font-body)"
            opacity="0.7"
          >
            {pt.label}
          </text>
        ))}

        {/* Current hour vertical line */}
        {currentHourMarker !== null && currentHourMarker >= 0 && currentHourMarker < pointsLength && (
          <g>
            {(() => {
              const x = paddingLeft + (currentHourMarker / (pointsLength - 1)) * chartWidth;
              return (
                <>
                  <line 
                    x1={x} 
                    y1={paddingTop} 
                    x2={x} 
                    y2={dimensions.height - paddingBottom} 
                    stroke="var(--accent-orange)" 
                    strokeWidth="1.5" 
                    strokeDasharray="3 3"
                    opacity="0.8"
                  />
                  <text 
                    x={x} 
                    y={paddingTop - 6} 
                    fill="var(--accent-orange)" 
                    fontSize="9.5" 
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="var(--font-body)"
                  >
                    Now
                  </text>
                </>
              );
            })()}
          </g>
        )}

        {/* Sun Markers (Sunrise / Sunset Indicator lines) */}
        {sunMarkers && sunMarkers.map((marker, idx) => {
          const pt = seriesPoints[0]?.points[marker.index];
          if (!pt) return null;
          return (
            <g key={`sun-${idx}`}>
              <line 
                x1={pt.x} 
                y1={paddingTop} 
                x2={pt.x} 
                y2={dimensions.height - paddingBottom} 
                stroke="var(--accent-orange)" 
                strokeWidth="1.5" 
                strokeDasharray="3 3"
                opacity="0.5"
              />
              <text 
                x={pt.x} 
                y={paddingTop - 6} 
                fill="var(--accent-orange)" 
                fontSize="8" 
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="var(--font-body)"
              >
                {marker.type === 'sunrise' ? '🌅 Rise' : '🌇 Set'}
              </text>
            </g>
          );
        })}

        {/* Hover vertical bar & dots */}
        {hoverIndex !== null && (
          <g>
            <line 
              x1={hoverPos.x} 
              y1={paddingTop} 
              x2={hoverPos.x} 
              y2={dimensions.height - paddingBottom} 
              stroke="rgba(255, 255, 255, 0.15)" 
              strokeWidth="1.5"
            />
            {seriesPoints.map(s => {
              const pt = s.points[hoverIndex];
              if (!pt) return null;
              return (
                <circle key={s.name} cx={pt.x} cy={pt.y} r="5.5" fill="white" stroke={s.color} strokeWidth="3" />
              );
            })}
          </g>
        )}
      </svg>

      {/* Floating Tooltip HTML Overlay */}
      {hoverIndex !== null && seriesPoints.length > 0 && (
        <div 
          style={{
            position: 'absolute',
            left: `${Math.min(dimensions.width - 120, Math.max(10, hoverPos.x - 60))}px`,
            top: `${Math.max(5, hoverPos.y - 75)}px`,
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '11px',
            fontFamily: 'var(--font-body)',
            pointerEvents: 'none',
            zIndex: 10,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
        >
          <span style={{ color: 'var(--text-secondary)', fontSize: '9px', textTransform: 'uppercase', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '3px', marginBottom: '2px' }}>
            {seriesPoints[0].points[hoverIndex].label}
          </span>
          {seriesPoints.map(s => (
            <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <span style={{ color: s.color, fontWeight: '500' }}>{s.label}:</span>
              <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {s.points[hoverIndex].value != null ? s.points[hoverIndex].value.toFixed(1) : '0.0'}{s.unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
