import React from 'react';
import RGL, { WidthProvider } from 'react-grid-layout';
import WeatherWidget from './Widgets';

const ReactGridLayout = WidthProvider(RGL);

export default function Dashboard({
  widgets,
  weatherData,
  aqiData,
  units,
  isEditMode,
  isMobile,
  onDeleteWidget,
  onUpdateWidgetProps,
  onLayoutChange,
  layoutKey
}) {
  
  // Handle layout changes from drag & resize
  const handleLayoutChange = (newLayout) => {
    let changed = false;
    const updated = widgets.map(w => {
      const match = newLayout.find(l => l.i === w.id);
      if (match) {
        if (w.x !== match.x || w.y !== match.y || w.w !== match.w || w.h !== match.h) {
          changed = true;
        }
        return {
          ...w,
          x: match.x,
          y: match.y,
          w: match.w,
          h: match.h
        };
      }
      return w;
    });

    if (changed) {
      onLayoutChange(updated);
    }
  };

  // Convert widgets list to react-grid-layout items config with reduced constraints
  const gridLayout = widgets.map(w => ({
    i: w.id,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    minW: w.type === 'hourly' ? 3 : 2, // Allow maximum shrinking down to 2x2 (3 for hourly chart to maintain legibility)
    minH: 2,
    static: !isEditMode
  }));

  if (isMobile) {
    return (
      <div 
        className="dashboard-canvas" 
        style={{ 
          width: '100%', 
          minHeight: 'calc(100vh - 120px)',
          position: 'relative',
          borderRadius: '24px',
          padding: '8px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}
      >
        {widgets.length === 0 ? (
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              border: '1px dashed var(--glass-border)',
              borderRadius: '24px',
              color: 'var(--text-secondary)',
              gap: '12px',
              padding: '24px',
              textAlign: 'center'
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Dashboard Empty</h3>
            <p style={{ fontSize: '14px', maxWidth: '400px' }}>
              Open the <strong>Control Center</strong> and add weather widgets to configure your dashboard canvas.
            </p>
          </div>
        ) : (
          widgets.map((w) => (
            <div key={w.id} style={{ width: '100%', height: `${w.h * 95 + (w.h - 1) * 18}px` }}>
              <WeatherWidget
                type={w.type}
                weatherData={weatherData}
                aqiData={aqiData}
                units={units}
                isEditMode={isEditMode}
                isMobile={true}
                onDelete={() => onDeleteWidget(w.id)}
                font={w.font}
                onUpdateFont={(font) => onUpdateWidgetProps(w.id, { font })}
                widgetProps={w}
                onUpdateProps={(newProps) => onUpdateWidgetProps(w.id, newProps)}
              />
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div 
      className="dashboard-canvas" 
      style={{ 
        width: '100%', 
        minHeight: 'calc(100vh - 120px)',
        position: 'relative',
        borderRadius: '24px',
        padding: '8px 0',
        transition: 'all 0.3s'
      }}
    >
      {widgets.length === 0 ? (
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '300px',
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            border: '1px dashed var(--glass-border)',
            borderRadius: '24px',
            color: 'var(--text-secondary)',
            gap: '12px',
            padding: '24px',
            textAlign: 'center'
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Dashboard Empty</h3>
          <p style={{ fontSize: '14px', maxWidth: '400px' }}>
            Open the <strong>Control Center</strong> and add weather widgets to configure your dashboard canvas.
          </p>
        </div>
      ) : (
        <ReactGridLayout
          key={layoutKey}
          className="layout"
          layout={gridLayout}
          cols={12}
          rowHeight={95}
          margin={[18, 18]}
          containerPadding={[0, 0]}
          onDragStop={handleLayoutChange}
          onResizeStop={handleLayoutChange}
          draggableHandle=".widget-drag-handle"
          isDraggable={isEditMode}
          isResizable={isEditMode}
          useCSSTransforms={true}
        >
          {widgets.map((w) => (
            <div key={w.id}>
              <WeatherWidget
                type={w.type}
                weatherData={weatherData}
                aqiData={aqiData}
                units={units}
                isEditMode={isEditMode}
                onDelete={() => onDeleteWidget(w.id)}
                font={w.font}
                onUpdateFont={(font) => onUpdateWidgetProps(w.id, { font })}
                widgetProps={w}
                onUpdateProps={(newProps) => onUpdateWidgetProps(w.id, newProps)}
              />
            </div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  );
}
