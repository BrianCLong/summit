"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WidgetRenderer = WidgetRenderer;
const react_1 = __importStar(require("react"));
const store_1 = require("../store");
function WidgetRenderer({ widget, className = '' }) {
    const { editMode, selectedWidgets, selectWidget, deselectWidget, deleteWidget, } = (0, store_1.useDashboardStore)();
    const isSelected = selectedWidgets.has(widget.id);
    const handleClick = (e) => {
        if (!editMode) {
            return;
        }
        if (e.ctrlKey || e.metaKey) {
            // Multi-select
            if (isSelected) {
                deselectWidget(widget.id);
            }
            else {
                selectWidget(widget.id);
            }
        }
        else {
            // Single select
            selectWidget(widget.id);
        }
    };
    const handleDelete = (e) => {
        e.stopPropagation();
        deleteWidget(widget.id);
    };
    return (<div className={`widget-renderer ${className} ${isSelected ? 'selected' : ''}`} style={{
            ...widgetStyle,
            ...(isSelected ? selectedStyle : {}),
            ...(widget.style || {}),
        }} onClick={handleClick}>
      {/* Widget Header */}
      <div className="widget-header widget-drag-handle" style={{
            ...headerStyle,
            cursor: editMode ? 'move' : 'default',
        }}>
        <div style={{ flex: 1, fontWeight: 600, fontSize: '14px' }}>
          {widget.title}
        </div>
        {editMode && (<div className="widget-actions" style={{ display: 'flex', gap: '4px' }}>
            <button onClick={handleDelete} style={actionButtonStyle} title="Delete widget">
              🗑️
            </button>
          </div>)}
      </div>

      {/* Widget Content */}
      <div className="widget-content" style={contentStyle}>
        <react_1.Suspense fallback={<WidgetLoader />}>
          <WidgetContent widget={widget}/>
        </react_1.Suspense>
      </div>
    </div>);
}
function WidgetContent({ widget }) {
    // Dynamic widget loading based on type
    // In a real implementation, this would dynamically import the appropriate widget component
    switch (widget.type) {
        case 'chart':
            return <ChartWidget config={widget.config}/>;
        case 'metric':
            return <MetricWidget config={widget.config}/>;
        case 'table':
            return <TableWidget config={widget.config}/>;
        case 'map':
            return <MapWidget config={widget.config}/>;
        case 'network':
            return <NetworkWidget config={widget.config}/>;
        case 'timeline':
            return <TimelineWidget config={widget.config}/>;
        default:
            return <DefaultWidget type={widget.type}/>;
    }
}
function WidgetLoader() {
    return (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center', color: '#9ca3af' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
        <div style={{ fontSize: '12px' }}>Loading widget...</div>
      </div>
    </div>);
}
// Placeholder widgets (these would be imported from the widgets package in real implementation)
function ChartWidget({ config }) {
    return (<div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
      <div>Chart Widget</div>
      <div style={{ fontSize: '12px', marginTop: '4px' }}>
        Type: {config.chartType || 'bar'}
      </div>
    </div>);
}
function MetricWidget({ config }) {
    return (<div style={{ padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: '36px', fontWeight: 700, marginBottom: '8px' }}>
        {config.value || '0'}
      </div>
      <div style={{ color: '#6b7280', fontSize: '14px' }}>
        {config.label || 'Metric'}
      </div>
    </div>);
}
function TableWidget({ config }) {
    return (<div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
      <div>Table Widget</div>
    </div>);
}
function MapWidget({ config }) {
    return (<div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
      <div>Map Widget</div>
    </div>);
}
function NetworkWidget({ config }) {
    return (<div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🕸️</div>
      <div>Network Graph Widget</div>
    </div>);
}
function TimelineWidget({ config }) {
    return (<div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏰</div>
      <div>Timeline Widget</div>
    </div>);
}
function DefaultWidget({ type }) {
    return (<div style={{ padding: '16px', textAlign: 'center', color: '#ef4444' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>❌</div>
      <div>Unknown Widget Type</div>
      <div style={{ fontSize: '12px', marginTop: '4px' }}>
        Type: {type}
      </div>
    </div>);
}
const widgetStyle = {
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
const selectedStyle = {
    border: '2px solid #3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
};
const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    background: '#f9fafb',
    userSelect: 'none',
};
const contentStyle = {
    flex: 1,
    overflow: 'auto',
    minHeight: 0,
};
const actionButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    opacity: 0.6,
    transition: 'opacity 0.2s',
};
