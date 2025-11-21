import React, { Suspense, lazy } from 'react';
import { Widget } from '../types';
import { useDashboardStore } from '../store';

export interface WidgetRendererProps {
  widget: Widget;
  className?: string;
}

export function WidgetRenderer({ widget, className = '' }: WidgetRendererProps) {
  const {
    editMode,
    selectedWidgets,
    selectWidget,
    deselectWidget,
    deleteWidget,
  } = useDashboardStore();

  const isSelected = selectedWidgets.has(widget.id);

  const handleClick = (e: React.MouseEvent) => {
    if (!editMode) return;

    if (e.ctrlKey || e.metaKey) {
      // Multi-select
      if (isSelected) {
        deselectWidget(widget.id);
      } else {
        selectWidget(widget.id);
      }
    } else {
      // Single select
      selectWidget(widget.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteWidget(widget.id);
  };

  return (
    <div
      className={`widget-renderer ${className} ${isSelected ? 'selected' : ''}`}
      style={{
        ...widgetStyle,
        ...(isSelected ? selectedStyle : {}),
        ...(widget.style || {}),
      }}
      onClick={handleClick}
    >
      {/* Widget Header */}
      <div
        className="widget-header widget-drag-handle"
        style={{
          ...headerStyle,
          cursor: editMode ? 'move' : 'default',
        }}
      >
        <div style={{ flex: 1, fontWeight: 600, fontSize: '14px' }}>
          {widget.title}
        </div>
        {editMode && (
          <div className="widget-actions" style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={handleDelete}
              style={actionButtonStyle}
              title="Delete widget"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {/* Widget Content */}
      <div className="widget-content" style={contentStyle}>
        <Suspense fallback={<WidgetLoader />}>
          <WidgetContent widget={widget} />
        </Suspense>
      </div>
    </div>
  );
}

function WidgetContent({ widget }: { widget: Widget }) {
  // Dynamic widget loading based on type
  // In a real implementation, this would dynamically import the appropriate widget component

  switch (widget.type) {
    case 'chart':
      return <ChartWidget config={widget.config} />;
    case 'metric':
      return <MetricWidget config={widget.config} />;
    case 'table':
      return <TableWidget config={widget.config} />;
    case 'map':
      return <MapWidget config={widget.config} />;
    case 'network':
      return <NetworkWidget config={widget.config} />;
    case 'timeline':
      return <TimelineWidget config={widget.config} />;
    default:
      return <DefaultWidget type={widget.type} />;
  }
}

function WidgetLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center', color: '#9ca3af' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
        <div style={{ fontSize: '12px' }}>Loading widget...</div>
      </div>
    </div>
  );
}

// Placeholder widgets (these would be imported from the widgets package in real implementation)
function ChartWidget({ config }: { config: any }) {
  return (
    <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
      <div>Chart Widget</div>
      <div style={{ fontSize: '12px', marginTop: '4px' }}>
        Type: {config.chartType || 'bar'}
      </div>
    </div>
  );
}

function MetricWidget({ config }: { config: any }) {
  return (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: '36px', fontWeight: 700, marginBottom: '8px' }}>
        {config.value || '0'}
      </div>
      <div style={{ color: '#6b7280', fontSize: '14px' }}>
        {config.label || 'Metric'}
      </div>
    </div>
  );
}

function TableWidget({ config }: { config: any }) {
  return (
    <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
      <div>Table Widget</div>
    </div>
  );
}

function MapWidget({ config }: { config: any }) {
  return (
    <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
      <div>Map Widget</div>
    </div>
  );
}

function NetworkWidget({ config }: { config: any }) {
  return (
    <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🕸️</div>
      <div>Network Graph Widget</div>
    </div>
  );
}

function TimelineWidget({ config }: { config: any }) {
  return (
    <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏰</div>
      <div>Timeline Widget</div>
    </div>
  );
}

function DefaultWidget({ type }: { type: string }) {
  return (
    <div style={{ padding: '16px', textAlign: 'center', color: '#ef4444' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>❌</div>
      <div>Unknown Widget Type</div>
      <div style={{ fontSize: '12px', marginTop: '4px' }}>
        Type: {type}
      </div>
    </div>
  );
}

const widgetStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  overflow: 'hidden',
  transition: 'all 0.2s',
};

const selectedStyle: React.CSSProperties = {
  border: '2px solid #3b82f6',
  boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid #e5e7eb',
  background: '#f9fafb',
  userSelect: 'none',
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  minHeight: 0,
};

const actionButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '16px',
  padding: '4px',
  opacity: 0.6,
  transition: 'opacity 0.2s',
};
