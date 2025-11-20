/**
 * Workspace Manager Component
 * Manages customizable analyst workspaces with drag-and-drop widgets
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import './workspace-styles.css';
import {
  DashboardLayout,
  Widget,
  WidgetType,
  DEFAULT_DASHBOARD_SETTINGS,
  WIDGET_TEMPLATES,
  WorkspaceConfig,
} from './types';

interface WorkspaceManagerProps {
  userId: string;
  onSaveWorkspace?: (config: WorkspaceConfig) => void;
  initialWorkspace?: WorkspaceConfig;
  theme?: 'light' | 'dark' | 'auto';
}

const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({
  userId,
  onSaveWorkspace,
  initialWorkspace,
  theme = 'dark',
}) => {
  const [workspace, setWorkspace] = useState<WorkspaceConfig>(
    initialWorkspace || createDefaultWorkspace(userId)
  );
  const [activeDashboard, setActiveDashboard] = useState<DashboardLayout | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showWidgetPalette, setShowWidgetPalette] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);

  useEffect(() => {
    const dashboard = workspace.dashboards.find(
      (d) => d.id === workspace.activeDashboardId
    );
    setActiveDashboard(dashboard || workspace.dashboards[0] || null);
  }, [workspace]);

  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      if (!activeDashboard || !isEditMode) return;

      const updatedWidgets = activeDashboard.widgets.map((widget) => {
        const layoutItem = newLayout.find((l) => l.i === widget.id);
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
        ...activeDashboard,
        widgets: updatedWidgets,
        updatedAt: new Date(),
      };

      setWorkspace((prev) => ({
        ...prev,
        dashboards: prev.dashboards.map((d) =>
          d.id === activeDashboard.id ? updatedDashboard : d
        ),
      }));
    },
    [activeDashboard, isEditMode]
  );

  const handleAddWidget = useCallback(
    (widgetType: WidgetType) => {
      if (!activeDashboard) return;

      const template = WIDGET_TEMPLATES[widgetType];
      const newWidget: Widget = {
        id: `widget-${Date.now()}`,
        type: widgetType,
        title: template.title || 'New Widget',
        description: template.description,
        config: template.config || {},
        layout: template.layout || { x: 0, y: 0, w: 4, h: 4 },
        lastUpdated: Date.now(),
      };

      const updatedDashboard = {
        ...activeDashboard,
        widgets: [...activeDashboard.widgets, newWidget],
        updatedAt: new Date(),
      };

      setWorkspace((prev) => ({
        ...prev,
        dashboards: prev.dashboards.map((d) =>
          d.id === activeDashboard.id ? updatedDashboard : d
        ),
      }));

      setShowWidgetPalette(false);
    },
    [activeDashboard]
  );

  const handleRemoveWidget = useCallback(
    (widgetId: string) => {
      if (!activeDashboard) return;

      const updatedDashboard = {
        ...activeDashboard,
        widgets: activeDashboard.widgets.filter((w) => w.id !== widgetId),
        updatedAt: new Date(),
      };

      setWorkspace((prev) => ({
        ...prev,
        dashboards: prev.dashboards.map((d) =>
          d.id === activeDashboard.id ? updatedDashboard : d
        ),
      }));
    },
    [activeDashboard]
  );

  const handleSaveWorkspace = useCallback(() => {
    onSaveWorkspace?.(workspace);
    setIsEditMode(false);
  }, [workspace, onSaveWorkspace]);

  const layouts = useMemo(() => {
    if (!activeDashboard) return [];
    return activeDashboard.widgets.map((widget) => ({
      i: widget.id,
      x: widget.layout.x,
      y: widget.layout.y,
      w: widget.layout.w,
      h: widget.layout.h,
      minW: widget.layout.minW,
      minH: widget.layout.minH,
      maxW: widget.layout.maxW,
      maxH: widget.layout.maxH,
      static: widget.layout.static || !isEditMode,
    }));
  }, [activeDashboard, isEditMode]);

  if (!activeDashboard) {
    return (
      <div className="workspace-empty">
        <p>No dashboard available. Create a new dashboard to get started.</p>
      </div>
    );
  }

  return (
    <div className={`workspace-manager theme-${theme}`}>
      {/* Toolbar */}
      <div className="workspace-toolbar">
        <div className="toolbar-left">
          <h2 className="workspace-title">{workspace.name}</h2>
          <div className="dashboard-tabs">
            {workspace.dashboards.map((dashboard) => (
              <button
                key={dashboard.id}
                className={`dashboard-tab ${
                  dashboard.id === activeDashboard.id ? 'active' : ''
                }`}
                onClick={() => {
                  setWorkspace((prev) => ({
                    ...prev,
                    activeDashboardId: dashboard.id,
                  }));
                }}
              >
                {dashboard.name}
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar-right">
          <button
            className="btn-icon"
            onClick={() => setShowWidgetPalette(!showWidgetPalette)}
            title="Add Widget"
          >
            ➕
          </button>
          <button
            className={`btn-icon ${isEditMode ? 'active' : ''}`}
            onClick={() => setIsEditMode(!isEditMode)}
            title="Edit Mode"
          >
            ✏️
          </button>
          {isEditMode && (
            <button
              className="btn-primary"
              onClick={handleSaveWorkspace}
              title="Save Workspace"
            >
              💾 Save
            </button>
          )}
          <button className="btn-icon" title="Settings">
            ⚙️
          </button>
        </div>
      </div>

      {/* Widget Palette */}
      {showWidgetPalette && (
        <div className="widget-palette">
          <div className="palette-header">
            <h3>Add Widget</h3>
            <button onClick={() => setShowWidgetPalette(false)}>✕</button>
          </div>
          <div className="palette-grid">
            {Object.entries(WIDGET_TEMPLATES).map(([type, template]) => (
              <div
                key={type}
                className="palette-item"
                onClick={() => handleAddWidget(type as WidgetType)}
              >
                <div className="palette-icon">{getWidgetIcon(type as WidgetType)}</div>
                <div className="palette-title">{template.title}</div>
                <div className="palette-description">{template.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid Layout */}
      <div className="workspace-grid">
        <GridLayout
          className="layout"
          layout={layouts}
          cols={activeDashboard.settings.columns}
          rowHeight={activeDashboard.settings.rowHeight}
          width={1200}
          onLayoutChange={handleLayoutChange}
          isDraggable={isEditMode && activeDashboard.settings.isDraggable}
          isResizable={isEditMode && activeDashboard.settings.isResizable}
          compactType={activeDashboard.settings.compactType}
          preventCollision={activeDashboard.settings.preventCollision}
        >
          {activeDashboard.widgets.map((widget) => (
            <div key={widget.id} className="grid-item">
              <WidgetContainer
                widget={widget}
                isEditMode={isEditMode}
                onRemove={() => handleRemoveWidget(widget.id)}
                onEdit={() => setSelectedWidget(widget)}
                theme={theme}
              />
            </div>
          ))}
        </GridLayout>
      </div>

      {/* Widget Configuration Modal */}
      {selectedWidget && (
        <WidgetConfigModal
          widget={selectedWidget}
          onClose={() => setSelectedWidget(null)}
          onSave={(updatedWidget) => {
            if (!activeDashboard) return;

            const updatedDashboard = {
              ...activeDashboard,
              widgets: activeDashboard.widgets.map((w) =>
                w.id === updatedWidget.id ? updatedWidget : w
              ),
              updatedAt: new Date(),
            };

            setWorkspace((prev) => ({
              ...prev,
              dashboards: prev.dashboards.map((d) =>
                d.id === activeDashboard.id ? updatedDashboard : d
              ),
            }));

            setSelectedWidget(null);
          }}
        />
      )}
    </div>
  );
};

/**
 * Widget Container Component
 */
interface WidgetContainerProps {
  widget: Widget;
  isEditMode: boolean;
  onRemove: () => void;
  onEdit: () => void;
  theme: 'light' | 'dark' | 'auto';
}

const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widget,
  isEditMode,
  onRemove,
  onEdit,
  theme,
}) => {
  return (
    <div className={`widget-container theme-${theme}`}>
      {widget.config.showHeader !== false && (
        <div className="widget-header">
          <div className="widget-title">{widget.title}</div>
          <div className="widget-actions">
            {isEditMode && (
              <>
                <button className="widget-action" onClick={onEdit} title="Configure">
                  ⚙️
                </button>
                <button className="widget-action" onClick={onRemove} title="Remove">
                  🗑️
                </button>
              </>
            )}
            {!isEditMode && widget.config.showRefresh && (
              <button className="widget-action" title="Refresh">
                🔄
              </button>
            )}
          </div>
        </div>
      )}
      <div className="widget-content">
        <WidgetContent widget={widget} />
      </div>
    </div>
  );
};

/**
 * Widget Content Renderer
 */
const WidgetContent: React.FC<{ widget: Widget }> = ({ widget }) => {
  // This will render the appropriate widget component based on type
  // For now, we'll show a placeholder
  return (
    <div className="widget-placeholder">
      <div className="placeholder-icon">{getWidgetIcon(widget.type)}</div>
      <div className="placeholder-text">{widget.title}</div>
      <div className="placeholder-description">{widget.description}</div>
    </div>
  );
};

/**
 * Widget Configuration Modal
 */
interface WidgetConfigModalProps {
  widget: Widget;
  onClose: () => void;
  onSave: (widget: Widget) => void;
}

const WidgetConfigModal: React.FC<WidgetConfigModalProps> = ({
  widget,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(widget.title);
  const [description, setDescription] = useState(widget.description || '');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Configure Widget</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              rows={3}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() =>
              onSave({
                ...widget,
                title,
                description,
              })
            }
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Helper Functions
 */
function createDefaultWorkspace(userId: string): WorkspaceConfig {
  return {
    id: `workspace-${Date.now()}`,
    name: 'Intelligence Workspace',
    description: 'Default intelligence analysis workspace',
    dashboards: [createDefaultDashboard(userId)],
    activeDashboardId: 'dashboard-default',
    layout: 'single',
    theme: 'dark',
  };
}

function createDefaultDashboard(userId: string): DashboardLayout {
  return {
    id: 'dashboard-default',
    name: 'Overview',
    description: 'Main intelligence dashboard',
    widgets: [
      {
        id: 'widget-threat-1',
        ...WIDGET_TEMPLATES['threat-monitor'],
        layout: { x: 0, y: 0, w: 6, h: 4 },
      } as Widget,
      {
        id: 'widget-alerts-1',
        ...WIDGET_TEMPLATES['alerts'],
        layout: { x: 6, y: 0, w: 6, h: 4 },
      } as Widget,
      {
        id: 'widget-network-1',
        ...WIDGET_TEMPLATES['network-graph'],
        layout: { x: 0, y: 4, w: 8, h: 6 },
      } as Widget,
      {
        id: 'widget-activity-1',
        ...WIDGET_TEMPLATES['activity-feed'],
        layout: { x: 8, y: 4, w: 4, h: 6 },
      } as Widget,
    ],
    settings: DEFAULT_DASHBOARD_SETTINGS,
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true,
  };
}

function getWidgetIcon(type: WidgetType): string {
  const icons: Record<WidgetType, string> = {
    'threat-monitor': '🛡️',
    'geospatial': '🗺️',
    'timeline': '📅',
    'network-graph': '🕸️',
    'alerts': '🚨',
    'investigation-list': '🔍',
    'activity-feed': '📊',
    'metrics': '📈',
    'entity-search': '🔎',
    'team-presence': '👥',
    'case-summary': '📋',
    'threat-intel': '🎯',
    'chart': '📊',
    'custom': '⭐',
  };
  return icons[type] || '📦';
}

export default WorkspaceManager;
