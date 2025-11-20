import React, { useCallback } from 'react';
import RGL, { WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useDashboardStore } from '../store';
import { WidgetLayout } from '../types';

const ReactGridLayout = WidthProvider(RGL);

export interface GridLayoutProps {
  pageId: string;
  children: React.ReactNode;
  editable?: boolean;
  className?: string;
}

export function GridLayout({
  pageId,
  children,
  editable = false,
  className = '',
}: GridLayoutProps) {
  const {
    getActivePage,
    updateWidgetLayout,
  } = useDashboardStore();

  const page = getActivePage();

  if (!page) {
    return <div>Page not found</div>;
  }

  const { layout: layoutConfig, widgets } = page;

  // Convert widget layouts to react-grid-layout format
  const layouts: Layout[] = widgets.map(widget => ({
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
    isDraggable: widget.layout.isDraggable !== false && editable,
    isResizable: widget.layout.isResizable !== false && editable,
  }));

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    if (!editable) return;

    newLayout.forEach(item => {
      const widget = widgets.find(w => w.id === item.i);
      if (widget) {
        const layoutUpdate: Partial<WidgetLayout> = {
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
        };

        // Only update if changed
        if (
          widget.layout.x !== item.x ||
          widget.layout.y !== item.y ||
          widget.layout.w !== item.w ||
          widget.layout.h !== item.h
        ) {
          updateWidgetLayout(widget.id, layoutUpdate);
        }
      }
    });
  }, [widgets, updateWidgetLayout, editable]);

  const handleDrag = useCallback((layout: Layout[], oldItem: Layout, newItem: Layout) => {
    // Optional: Add drag feedback
  }, []);

  const handleResize = useCallback((layout: Layout[], oldItem: Layout, newItem: Layout) => {
    // Optional: Add resize feedback
  }, []);

  return (
    <ReactGridLayout
      className={`dashboard-grid-layout ${className}`}
      layout={layouts}
      cols={layoutConfig.columns || 12}
      rowHeight={layoutConfig.rowHeight || 80}
      margin={layoutConfig.gaps ? [layoutConfig.gaps.x, layoutConfig.gaps.y] : [16, 16]}
      containerPadding={layoutConfig.margin ? [layoutConfig.margin.x, layoutConfig.margin.y] : [0, 0]}
      compactType={layoutConfig.compactType || 'vertical'}
      preventCollision={layoutConfig.preventCollision || false}
      isDraggable={editable}
      isResizable={editable}
      onLayoutChange={handleLayoutChange}
      onDrag={handleDrag}
      onResize={handleResize}
      draggableHandle=".widget-drag-handle"
      resizeHandles={['se', 'sw', 'ne', 'nw']}
      style={{
        minHeight: '100%',
      }}
    >
      {children}
    </ReactGridLayout>
  );
}
