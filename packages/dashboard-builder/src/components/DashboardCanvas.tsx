import React, { useState, useCallback } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { Dashboard, DashboardWidget, WidgetLayout, DashboardEventHandlers } from '../types';
import { WidgetRenderer } from './WidgetRenderer';
import { Box, Paper } from '@mui/material';

export interface DashboardCanvasProps {
  dashboard: Dashboard;
  editable?: boolean;
  events?: DashboardEventHandlers;
  onDashboardChange?: (dashboard: Dashboard) => void;
}

export const DashboardCanvas: React.FC<DashboardCanvasProps> = ({
  dashboard,
  editable = false,
  events = {},
  onDashboardChange,
}) => {
  const [localDashboard, setLocalDashboard] = useState(dashboard);

  // Convert widget layouts to react-grid-layout format
  const layoutItems: Layout[] = localDashboard.widgets.map(widget => ({
    i: widget.id,
    x: widget.layout.x,
    y: widget.layout.y,
    w: widget.layout.w,
    h: widget.layout.h,
    minW: widget.layout.minW,
    minH: widget.layout.minH,
    maxW: widget.layout.maxW,
    maxH: widget.layout.maxH,
    static: widget.layout.static || !editable,
  }));

  // Handle layout change
  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    const updatedWidgets = localDashboard.widgets.map(widget => {
      const layoutItem = newLayout.find(l => l.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          layout: {
            ...widget.layout,
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h,
          },
        };
      }
      return widget;
    });

    const updatedDashboard = {
      ...localDashboard,
      widgets: updatedWidgets,
      updatedAt: new Date().toISOString(),
    };

    setLocalDashboard(updatedDashboard);

    if (onDashboardChange) {
      onDashboardChange(updatedDashboard);
    }

    if (events.onLayoutChange) {
      events.onLayoutChange(updatedWidgets.map(w => w.layout));
    }
  }, [localDashboard, onDashboardChange, events]);

  // Handle widget update
  const handleWidgetUpdate = useCallback((widgetId: string, updates: Partial<DashboardWidget>) => {
    const updatedWidgets = localDashboard.widgets.map(widget =>
      widget.id === widgetId ? { ...widget, ...updates, updatedAt: new Date().toISOString() } : widget
    );

    const updatedDashboard = {
      ...localDashboard,
      widgets: updatedWidgets,
      updatedAt: new Date().toISOString(),
    };

    setLocalDashboard(updatedDashboard);

    if (onDashboardChange) {
      onDashboardChange(updatedDashboard);
    }

    if (events.onWidgetUpdate) {
      events.onWidgetUpdate(widgetId, updates);
    }
  }, [localDashboard, onDashboardChange, events]);

  // Handle widget delete
  const handleWidgetDelete = useCallback((widgetId: string) => {
    const updatedWidgets = localDashboard.widgets.filter(w => w.id !== widgetId);

    const updatedDashboard = {
      ...localDashboard,
      widgets: updatedWidgets,
      updatedAt: new Date().toISOString(),
    };

    setLocalDashboard(updatedDashboard);

    if (onDashboardChange) {
      onDashboardChange(updatedDashboard);
    }

    if (events.onWidgetRemove) {
      events.onWidgetRemove(widgetId);
    }
  }, [localDashboard, onDashboardChange, events]);

  const theme = localDashboard.theme || {
    name: 'default',
    backgroundColor: '#f5f5f5',
    cardBackgroundColor: '#ffffff',
    textColor: '#333333',
    accentColor: '#1976d2',
    gridColor: '#e0e0e0',
    fontFamily: 'sans-serif',
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: theme.backgroundColor,
        padding: 2,
        overflow: 'auto',
        fontFamily: theme.fontFamily,
        color: theme.textColor,
      }}
    >
      <GridLayout
        className="dashboard-grid"
        layout={layoutItems}
        cols={localDashboard.layout?.cols || 12}
        rowHeight={localDashboard.layout?.rowHeight || 30}
        width={1200} // This should be responsive
        compactType={localDashboard.layout?.compactType || 'vertical'}
        preventCollision={localDashboard.layout?.preventCollision || false}
        isDraggable={editable}
        isResizable={editable}
        onLayoutChange={handleLayoutChange}
        margin={[10, 10]}
        containerPadding={[0, 0]}
      >
        {localDashboard.widgets.map(widget => (
          <div key={widget.id}>
            <Paper
              elevation={2}
              sx={{
                width: '100%',
                height: '100%',
                backgroundColor: widget.style?.backgroundColor || theme.cardBackgroundColor,
                borderColor: widget.style?.borderColor,
                borderWidth: widget.style?.borderWidth,
                borderRadius: widget.style?.borderRadius || 1,
                padding: widget.style?.padding || 2,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <WidgetRenderer
                widget={widget}
                editable={editable}
                onUpdate={(updates) => handleWidgetUpdate(widget.id, updates)}
                onDelete={() => handleWidgetDelete(widget.id)}
              />
            </Paper>
          </div>
        ))}
      </GridLayout>
    </Box>
  );
};

export default DashboardCanvas;
