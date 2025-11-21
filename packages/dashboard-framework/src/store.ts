import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Dashboard, DashboardPage, Widget, WidgetLayout, GlobalFilter } from './types';

interface DashboardState {
  // State
  dashboards: Map<string, Dashboard>;
  activeDashboardId: string | null;
  activePageId: string | null;
  selectedWidgets: Set<string>;
  clipboardWidgets: Widget[];
  editMode: boolean;

  // Getters
  getActiveDashboard: () => Dashboard | null;
  getActivePage: () => DashboardPage | null;
  getWidget: (widgetId: string) => Widget | null;

  // Dashboard Actions
  createDashboard: (dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => string;
  updateDashboard: (id: string, updates: Partial<Dashboard>) => void;
  deleteDashboard: (id: string) => void;
  setActiveDashboard: (id: string) => void;
  duplicateDashboard: (id: string) => string;

  // Page Actions
  createPage: (dashboardId: string, page: Omit<DashboardPage, 'id' | 'order'>) => string;
  updatePage: (pageId: string, updates: Partial<DashboardPage>) => void;
  deletePage: (pageId: string) => void;
  setActivePage: (pageId: string) => void;
  reorderPages: (dashboardId: string, pageIds: string[]) => void;

  // Widget Actions
  addWidget: (pageId: string, widget: Omit<Widget, 'id'>) => string;
  updateWidget: (widgetId: string, updates: Partial<Widget>) => void;
  deleteWidget: (widgetId: string) => void;
  duplicateWidget: (widgetId: string) => string;
  moveWidget: (widgetId: string, targetPageId: string) => void;
  updateWidgetLayout: (widgetId: string, layout: Partial<WidgetLayout>) => void;
  updateWidgetData: (widgetId: string, data: any) => void;

  // Selection Actions
  selectWidget: (widgetId: string) => void;
  deselectWidget: (widgetId: string) => void;
  clearSelection: () => void;
  selectMultiple: (widgetIds: string[]) => void;

  // Clipboard Actions
  copyWidgets: (widgetIds: string[]) => void;
  cutWidgets: (widgetIds: string[]) => void;
  pasteWidgets: (pageId: string) => void;

  // Filter Actions
  addFilter: (pageId: string, filter: Omit<GlobalFilter, 'id'>) => void;
  updateFilter: (pageId: string, filterId: string, updates: Partial<GlobalFilter>) => void;
  removeFilter: (pageId: string, filterId: string) => void;

  // Mode Actions
  setEditMode: (enabled: boolean) => void;

  // Undo/Redo (simplified)
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useDashboardStore = create<DashboardState>()(
  immer((set, get) => ({
    // Initial State
    dashboards: new Map(),
    activeDashboardId: null,
    activePageId: null,
    selectedWidgets: new Set(),
    clipboardWidgets: [],
    editMode: false,

    // Getters
    getActiveDashboard: () => {
      const { dashboards, activeDashboardId } = get();
      return activeDashboardId ? dashboards.get(activeDashboardId) || null : null;
    },

    getActivePage: () => {
      const dashboard = get().getActiveDashboard();
      const { activePageId } = get();
      if (!dashboard || !activePageId) return null;
      return dashboard.pages.find(p => p.id === activePageId) || null;
    },

    getWidget: (widgetId: string) => {
      const dashboard = get().getActiveDashboard();
      if (!dashboard) return null;

      for (const page of dashboard.pages) {
        const widget = page.widgets.find(w => w.id === widgetId);
        if (widget) return widget;
      }
      return null;
    },

    // Dashboard Actions
    createDashboard: (dashboard) => {
      const id = generateId();
      const newDashboard: Dashboard = {
        ...dashboard,
        id,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      set(state => {
        state.dashboards.set(id, newDashboard);
      });

      return id;
    },

    updateDashboard: (id, updates) => {
      set(state => {
        const dashboard = state.dashboards.get(id);
        if (dashboard) {
          Object.assign(dashboard, updates, {
            updatedAt: new Date(),
            version: dashboard.version + 1,
          });
        }
      });
    },

    deleteDashboard: (id) => {
      set(state => {
        state.dashboards.delete(id);
        if (state.activeDashboardId === id) {
          state.activeDashboardId = null;
          state.activePageId = null;
        }
      });
    },

    setActiveDashboard: (id) => {
      set(state => {
        state.activeDashboardId = id;
        const dashboard = state.dashboards.get(id);
        if (dashboard && dashboard.pages.length > 0) {
          state.activePageId = dashboard.pages[0].id;
        } else {
          state.activePageId = null;
        }
        state.selectedWidgets.clear();
      });
    },

    duplicateDashboard: (id) => {
      const dashboard = get().dashboards.get(id);
      if (!dashboard) return '';

      const newId = get().createDashboard({
        ...dashboard,
        name: `${dashboard.name} (Copy)`,
      });

      return newId;
    },

    // Page Actions
    createPage: (dashboardId, page) => {
      const pageId = generateId();

      set(state => {
        const dashboard = state.dashboards.get(dashboardId);
        if (dashboard) {
          const newPage: DashboardPage = {
            ...page,
            id: pageId,
            order: dashboard.pages.length,
          };
          dashboard.pages.push(newPage);
          dashboard.updatedAt = new Date();
        }
      });

      return pageId;
    },

    updatePage: (pageId, updates) => {
      set(state => {
        const dashboard = state.dashboards.get(state.activeDashboardId!);
        if (dashboard) {
          const page = dashboard.pages.find(p => p.id === pageId);
          if (page) {
            Object.assign(page, updates);
            dashboard.updatedAt = new Date();
          }
        }
      });
    },

    deletePage: (pageId) => {
      set(state => {
        const dashboard = state.dashboards.get(state.activeDashboardId!);
        if (dashboard) {
          dashboard.pages = dashboard.pages.filter(p => p.id !== pageId);
          dashboard.updatedAt = new Date();

          if (state.activePageId === pageId && dashboard.pages.length > 0) {
            state.activePageId = dashboard.pages[0].id;
          }
        }
      });
    },

    setActivePage: (pageId) => {
      set(state => {
        state.activePageId = pageId;
        state.selectedWidgets.clear();
      });
    },

    reorderPages: (dashboardId, pageIds) => {
      set(state => {
        const dashboard = state.dashboards.get(dashboardId);
        if (dashboard) {
          const pageMap = new Map(dashboard.pages.map(p => [p.id, p]));
          dashboard.pages = pageIds.map((id, index) => {
            const page = pageMap.get(id)!;
            page.order = index;
            return page;
          });
          dashboard.updatedAt = new Date();
        }
      });
    },

    // Widget Actions
    addWidget: (pageId, widget) => {
      const widgetId = generateId();

      set(state => {
        const dashboard = state.dashboards.get(state.activeDashboardId!);
        if (dashboard) {
          const page = dashboard.pages.find(p => p.id === pageId);
          if (page) {
            const newWidget: Widget = {
              ...widget,
              id: widgetId,
            };
            page.widgets.push(newWidget);
            dashboard.updatedAt = new Date();
          }
        }
      });

      return widgetId;
    },

    updateWidget: (widgetId, updates) => {
      set(state => {
        const dashboard = state.dashboards.get(state.activeDashboardId!);
        if (dashboard) {
          for (const page of dashboard.pages) {
            const widget = page.widgets.find(w => w.id === widgetId);
            if (widget) {
              Object.assign(widget, updates);
              dashboard.updatedAt = new Date();
              break;
            }
          }
        }
      });
    },

    deleteWidget: (widgetId) => {
      set(state => {
        const dashboard = state.dashboards.get(state.activeDashboardId!);
        if (dashboard) {
          for (const page of dashboard.pages) {
            page.widgets = page.widgets.filter(w => w.id !== widgetId);
          }
          dashboard.updatedAt = new Date();
          state.selectedWidgets.delete(widgetId);
        }
      });
    },

    duplicateWidget: (widgetId) => {
      const dashboard = get().getActiveDashboard();
      const page = get().getActivePage();
      if (!dashboard || !page) return '';

      const widget = page.widgets.find(w => w.id === widgetId);
      if (!widget) return '';

      const newWidgetId = get().addWidget(page.id, {
        ...widget,
        title: `${widget.title} (Copy)`,
        layout: {
          ...widget.layout,
          x: widget.layout.x + 1,
          y: widget.layout.y + 1,
        },
      });

      return newWidgetId;
    },

    moveWidget: (widgetId, targetPageId) => {
      set(state => {
        const dashboard = state.dashboards.get(state.activeDashboardId!);
        if (dashboard) {
          let widget: Widget | null = null;

          // Remove from source page
          for (const page of dashboard.pages) {
            const index = page.widgets.findIndex(w => w.id === widgetId);
            if (index !== -1) {
              widget = page.widgets.splice(index, 1)[0];
              break;
            }
          }

          // Add to target page
          if (widget) {
            const targetPage = dashboard.pages.find(p => p.id === targetPageId);
            if (targetPage) {
              targetPage.widgets.push(widget);
              dashboard.updatedAt = new Date();
            }
          }
        }
      });
    },

    updateWidgetLayout: (widgetId, layout) => {
      set(state => {
        const dashboard = state.dashboards.get(state.activeDashboardId!);
        if (dashboard) {
          for (const page of dashboard.pages) {
            const widget = page.widgets.find(w => w.id === widgetId);
            if (widget) {
              Object.assign(widget.layout, layout);
              dashboard.updatedAt = new Date();
              break;
            }
          }
        }
      });
    },

    updateWidgetData: (widgetId, data) => {
      set(state => {
        const dashboard = state.dashboards.get(state.activeDashboardId!);
        if (dashboard) {
          for (const page of dashboard.pages) {
            const widget = page.widgets.find(w => w.id === widgetId);
            if (widget) {
              widget.config.data = data;
              break;
            }
          }
        }
      });
    },

    // Selection Actions
    selectWidget: (widgetId) => {
      set(state => {
        state.selectedWidgets.add(widgetId);
      });
    },

    deselectWidget: (widgetId) => {
      set(state => {
        state.selectedWidgets.delete(widgetId);
      });
    },

    clearSelection: () => {
      set(state => {
        state.selectedWidgets.clear();
      });
    },

    selectMultiple: (widgetIds) => {
      set(state => {
        state.selectedWidgets = new Set(widgetIds);
      });
    },

    // Clipboard Actions
    copyWidgets: (widgetIds) => {
      const page = get().getActivePage();
      if (!page) return;

      const widgets = widgetIds
        .map(id => page.widgets.find(w => w.id === id))
        .filter(Boolean) as Widget[];

      set(state => {
        state.clipboardWidgets = widgets;
      });
    },

    cutWidgets: (widgetIds) => {
      get().copyWidgets(widgetIds);
      widgetIds.forEach(id => get().deleteWidget(id));
    },

    pasteWidgets: (pageId) => {
      const { clipboardWidgets } = get();
      if (clipboardWidgets.length === 0) return;

      clipboardWidgets.forEach(widget => {
        get().addWidget(pageId, {
          ...widget,
          layout: {
            ...widget.layout,
            x: widget.layout.x + 2,
            y: widget.layout.y + 2,
          },
        });
      });
    },

    // Filter Actions
    addFilter: (pageId, filter) => {
      const filterId = generateId();

      set(state => {
        const dashboard = state.dashboards.get(state.activeDashboardId!);
        if (dashboard) {
          const page = dashboard.pages.find(p => p.id === pageId);
          if (page) {
            if (!page.filters) page.filters = [];
            page.filters.push({ ...filter, id: filterId });
            dashboard.updatedAt = new Date();
          }
        }
      });
    },

    updateFilter: (pageId, filterId, updates) => {
      set(state => {
        const dashboard = state.dashboards.get(state.activeDashboardId!);
        if (dashboard) {
          const page = dashboard.pages.find(p => p.id === pageId);
          if (page && page.filters) {
            const filter = page.filters.find(f => f.id === filterId);
            if (filter) {
              Object.assign(filter, updates);
              dashboard.updatedAt = new Date();
            }
          }
        }
      });
    },

    removeFilter: (pageId, filterId) => {
      set(state => {
        const dashboard = state.dashboards.get(state.activeDashboardId!);
        if (dashboard) {
          const page = dashboard.pages.find(p => p.id === pageId);
          if (page && page.filters) {
            page.filters = page.filters.filter(f => f.id !== filterId);
            dashboard.updatedAt = new Date();
          }
        }
      });
    },

    // Mode Actions
    setEditMode: (enabled) => {
      set(state => {
        state.editMode = enabled;
        if (!enabled) {
          state.selectedWidgets.clear();
        }
      });
    },

    // Undo/Redo (simplified - would need proper implementation with history)
    undo: () => {
      // TODO: Implement proper undo/redo with history stack
      console.warn('Undo not yet implemented');
    },

    redo: () => {
      // TODO: Implement proper undo/redo with history stack
      console.warn('Redo not yet implemented');
    },

    canUndo: () => false,
    canRedo: () => false,
  }))
);

// Helper function to generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
