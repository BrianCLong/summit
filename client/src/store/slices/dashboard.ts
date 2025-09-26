import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit';

export type DashboardLayout = 'grid' | 'freeform';

export interface DashboardWidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  config?: Record<string, unknown> | null;
  dataSource?: Record<string, unknown> | null;
  position: DashboardWidgetPosition;
  refreshInterval?: number | null;
}

export interface DashboardInitializePayload {
  id?: string | null;
  name: string;
  description?: string | null;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  settings?: Record<string, unknown> | null;
  updatedAt?: string | null;
}

export interface DashboardState {
  persistedId: string | null;
  name: string;
  description: string | null;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  dirty: boolean;
  lastSavedAt: string | null;
  settings: Record<string, unknown> | null;
}

const initialState: DashboardState = {
  persistedId: null,
  name: 'Command Center Dashboard',
  description: null,
  layout: 'grid',
  widgets: [],
  dirty: false,
  lastSavedAt: null,
  settings: null,
};

function reindexWidgets(state: DashboardState) {
  state.widgets.forEach((widget, index) => {
    widget.position = {
      ...widget.position,
      x: 0,
      y: index * Math.max(1, widget.position.h),
    };
  });
}

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    initializeDashboard(state, action: PayloadAction<DashboardInitializePayload>) {
      const { id, name, description, layout, widgets, settings, updatedAt } = action.payload;
      state.persistedId = id ?? null;
      state.name = name;
      state.description = description ?? null;
      state.layout = layout;
      state.widgets = widgets.map((widget, index) => ({
        ...widget,
        position: {
          ...widget.position,
          x: 0,
          y: index * Math.max(1, widget.position.h),
        },
      }));
      state.settings = settings ?? null;
      state.lastSavedAt = updatedAt ?? null;
      state.dirty = false;
    },
    addWidget(
      state,
      action: PayloadAction<
        Omit<DashboardWidget, 'id' | 'position'> & { id?: string; position?: Partial<DashboardWidgetPosition> }
      >,
    ) {
      const { id, position, ...rest } = action.payload;
      const widget: DashboardWidget = {
        id: id ?? nanoid(),
        position: {
          x: 0,
          y: state.widgets.length * 4,
          w: position?.w ?? 4,
          h: position?.h ?? 4,
        },
        ...rest,
      };
      state.widgets.push(widget);
      reindexWidgets(state);
      state.dirty = true;
    },
    removeWidget(state, action: PayloadAction<string>) {
      state.widgets = state.widgets.filter((widget) => widget.id !== action.payload);
      reindexWidgets(state);
      state.dirty = true;
    },
    moveWidget(state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) {
      const { fromIndex, toIndex } = action.payload;
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
        return;
      }
      const [moved] = state.widgets.splice(fromIndex, 1);
      if (!moved) {
        return;
      }
      state.widgets.splice(toIndex, 0, moved);
      reindexWidgets(state);
      state.dirty = true;
    },
    updateWidget(state, action: PayloadAction<{ id: string; changes: Partial<DashboardWidget> }>) {
      const widget = state.widgets.find((item) => item.id === action.payload.id);
      if (!widget) {
        return;
      }
      Object.assign(widget, action.payload.changes);
      if (action.payload.changes.position) {
        widget.position = {
          ...widget.position,
          ...action.payload.changes.position,
        } as DashboardWidgetPosition;
      }
      state.dirty = true;
    },
    setLayout(state, action: PayloadAction<DashboardLayout>) {
      state.layout = action.payload;
      state.dirty = true;
    },
    setName(state, action: PayloadAction<string>) {
      state.name = action.payload;
      state.dirty = true;
    },
    setDescription(state, action: PayloadAction<string | null>) {
      state.description = action.payload;
      state.dirty = true;
    },
    markSaved(
      state,
      action: PayloadAction<{ id: string; updatedAt: string; settings?: Record<string, unknown> | null }>,
    ) {
      state.persistedId = action.payload.id;
      state.lastSavedAt = action.payload.updatedAt;
      if (typeof action.payload.settings !== 'undefined') {
        state.settings = action.payload.settings;
      }
      state.dirty = false;
    },
    resetDashboard(state) {
      state.persistedId = null;
      state.widgets = [];
      state.layout = 'grid';
      state.description = null;
      state.lastSavedAt = null;
      state.settings = null;
      state.dirty = false;
    },
  },
});

export const {
  initializeDashboard,
  addWidget,
  removeWidget,
  moveWidget,
  updateWidget,
  setLayout,
  setName,
  setDescription,
  markSaved,
  resetDashboard,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
