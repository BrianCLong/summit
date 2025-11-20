import React from 'react';
import { useDashboardStore } from '../store';

export interface WidgetToolbarProps {
  className?: string;
}

export function WidgetToolbar({ className = '' }: WidgetToolbarProps) {
  const {
    selectedWidgets,
    deleteWidget,
    duplicateWidget,
    copyWidgets,
    cutWidgets,
    clearSelection,
  } = useDashboardStore();

  if (selectedWidgets.size === 0) return null;

  const selectedIds = Array.from(selectedWidgets);

  const handleDelete = () => {
    if (confirm(`Delete ${selectedIds.length} widget(s)?`)) {
      selectedIds.forEach((id) => deleteWidget(id));
    }
  };

  const handleDuplicate = () => {
    selectedIds.forEach((id) => duplicateWidget(id));
  };

  const handleCopy = () => {
    copyWidgets(selectedIds);
  };

  const handleCut = () => {
    cutWidgets(selectedIds);
  };

  return (
    <div className={`widget-toolbar ${className}`} style={toolbarStyle}>
      <div style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280' }}>
        {selectedIds.length} widget(s) selected
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleCopy} style={buttonStyle} title="Copy">
          📋 Copy
        </button>
        <button onClick={handleCut} style={buttonStyle} title="Cut">
          ✂️ Cut
        </button>
        <button onClick={handleDuplicate} style={buttonStyle} title="Duplicate">
          📑 Duplicate
        </button>
        <button onClick={handleDelete} style={{ ...buttonStyle, color: '#ef4444' }} title="Delete">
          🗑️ Delete
        </button>
        <button onClick={clearSelection} style={buttonStyle} title="Clear selection">
          ✕ Clear
        </button>
      </div>
    </div>
  );
}

const toolbarStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '24px',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  padding: '12px 20px',
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
  zIndex: 1000,
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  background: 'white',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
  transition: 'all 0.2s',
};
