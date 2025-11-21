import React from 'react';
import { useDashboardStore } from '../store';
import { GridLayout } from './GridLayout';
import { WidgetRenderer } from './WidgetRenderer';

export interface DashboardRendererProps {
  dashboardId: string;
  className?: string;
}

export function DashboardRenderer({
  dashboardId,
  className = '',
}: DashboardRendererProps) {
  const {
    getActivePage,
    editMode,
  } = useDashboardStore();

  const page = getActivePage();

  if (!page) {
    return (
      <div className="dashboard-renderer-empty" style={emptyStateStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>
            No page selected
          </h3>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Create or select a page to get started
          </p>
        </div>
      </div>
    );
  }

  if (page.widgets.length === 0) {
    return (
      <div className="dashboard-renderer-empty" style={emptyStateStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>
            No widgets yet
          </h3>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Add widgets from the widget library to build your dashboard
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-renderer ${className}`} style={containerStyle}>
      <GridLayout pageId={page.id} editable={editMode}>
        {page.widgets.map((widget) => (
          <div key={widget.id} style={widgetContainerStyle}>
            <WidgetRenderer widget={widget} />
          </div>
        ))}
      </GridLayout>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '500px',
  background: '#f9fafb',
  borderRadius: '8px',
};

const widgetContainerStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden',
};

const emptyStateStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '400px',
  padding: '40px',
  color: '#9ca3af',
};
