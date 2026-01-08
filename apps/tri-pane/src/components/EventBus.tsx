import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { SAVED_VIEWS_VERSION } from "../config";
import { geofences, layers, nodes } from "../data";
import {
  LayoutMode,
  SavedViewRecord,
  TimeRange,
  ToastMessage,
  TriPaneAction,
  TriPaneState,
  ViewSnapshot,
} from "../types";

const STORAGE_KEY = "tri-pane:saved-views";
const STORAGE_VERSION = SAVED_VIEWS_VERSION;
const initialRange: TimeRange = { start: 1, end: 17 };
const MIN_TIME = 0;
const MAX_TIME = 24;

const defaultSnapshot: ViewSnapshot = {
  name: "Active ops",
  timeRange: initialRange,
  pinnedNodes: [],
  activeLayers: ["signals", "comms", "logistics"],
  geofence: geofences[0]?.id ?? null,
  filterText: "",
  layoutMode: "grid",
  focusNodeId: undefined,
};

const defaultRecord: SavedViewRecord = {
  id: "default-active",
  version: STORAGE_VERSION,
  createdAt: new Date().toISOString(),
  snapshot: defaultSnapshot,
};

const initialState: TriPaneState = {
  ...defaultSnapshot,
  savedViews: [defaultRecord],
  toast: null,
};

interface PersistedViews {
  version: number;
  views: SavedViewRecord[];
}

function normalizeSnapshot(snapshot: ViewSnapshot): ViewSnapshot {
  const start = Math.max(MIN_TIME, Math.min(snapshot.timeRange.start, MAX_TIME));
  const end = Math.min(MAX_TIME, Math.max(start + 0.5, snapshot.timeRange.end));

  return {
    ...snapshot,
    layoutMode: snapshot.layoutMode ?? "grid",
    activeLayers: snapshot.activeLayers ?? [],
    pinnedNodes: snapshot.pinnedNodes ?? [],
    filterText: snapshot.filterText ?? "",
    timeRange: { start, end },
  };
}

const TriPaneContext = createContext<{
  state: TriPaneState;
  dispatch: React.Dispatch<TriPaneAction>;
}>({ state: initialState, dispatch: () => undefined });

function reducer(state: TriPaneState, action: TriPaneAction): TriPaneState {
  switch (action.type) {
    case "setTimeRange":
      return { ...state, timeRange: action.payload };
    case "toggleLayer": {
      const exists = state.activeLayers.includes(action.payload);
      const nextLayers = exists
        ? state.activeLayers.filter((layer) => layer !== action.payload)
        : [...state.activeLayers, action.payload];
      return { ...state, activeLayers: nextLayers };
    }
    case "setGeofence":
      return { ...state, geofence: action.payload };
    case "togglePin": {
      const pinned = state.pinnedNodes.includes(action.payload);
      const nextPins = pinned
        ? state.pinnedNodes.filter((id) => id !== action.payload)
        : [...state.pinnedNodes, action.payload];
      return { ...state, pinnedNodes: nextPins };
    }
    case "setFilterText":
      return { ...state, filterText: action.payload };
    case "setFocusNode":
      return { ...state, focusNodeId: action.payload };
    case "setLayoutMode":
      return { ...state, layoutMode: action.payload };
    case "saveView": {
      const snapshot: ViewSnapshot = normalizeSnapshot({
        name: action.payload.trim() || "Untitled view",
        timeRange: state.timeRange,
        pinnedNodes: state.pinnedNodes,
        activeLayers: state.activeLayers,
        geofence: state.geofence,
        filterText: state.filterText,
        layoutMode: state.layoutMode,
        focusNodeId: state.focusNodeId,
      });

      const existing = state.savedViews.find((record) => record.snapshot.name === snapshot.name);
      const recordId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `view-${Date.now()}`;
      const record: SavedViewRecord = existing
        ? { ...existing, snapshot }
        : {
            id: recordId,
            version: STORAGE_VERSION,
            createdAt: new Date().toISOString(),
            snapshot,
          };

      const withoutExisting = state.savedViews.filter((entry) => entry.id !== record.id);
      return { ...state, savedViews: [...withoutExisting, record] };
    }
    case "loadView": {
      const record = state.savedViews.find((v) => v.id === action.payload);
      if (!record) return state;

      const invalidGeofence =
        record.snapshot.geofence && !geofences.find((g) => g.id === record.snapshot.geofence);
      const validLayers = record.snapshot.activeLayers.filter((layer) =>
        layers.some((l) => l.id === layer)
      );
      const missingLayers = record.snapshot.activeLayers.length !== validLayers.length;
      const validPins = record.snapshot.pinnedNodes.filter((pin) =>
        nodes.some((node) => node.id === pin)
      );
      const missingPins = record.snapshot.pinnedNodes.length !== validPins.length;

      const nextSnapshot: ViewSnapshot = normalizeSnapshot({
        ...record.snapshot,
        geofence: invalidGeofence ? null : record.snapshot.geofence,
        activeLayers: validLayers,
        pinnedNodes: validPins,
      });

      let toast: ToastMessage | null = null;
      if (invalidGeofence || missingLayers || missingPins) {
        toast = {
          id: `toast-${Date.now()}`,
          tone: "warning",
          message: "Restored with omissions: missing geofence or filtered entities were removed.",
        };
      }

      return { ...state, ...nextSnapshot, toast };
    }
    case "replaceViews":
      return { ...state, savedViews: action.payload };
    case "showToast":
      return { ...state, toast: action.payload };
    case "dismissToast":
      return { ...state, toast: null };
    default:
      return state;
  }
}

export function TriPaneProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, (base) => {
    if (typeof window === "undefined") return base;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return base;
      const parsed = JSON.parse(raw) as PersistedViews;
      if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.views)) {
        return base;
      }
      const views = parsed.views
        .filter((view) => view.version === STORAGE_VERSION)
        .map((view) => ({
          ...view,
          snapshot: normalizeSnapshot(view.snapshot),
        }));
      const hydratedViews = views.length > 0 ? views : [defaultRecord];
      const latest = hydratedViews[hydratedViews.length - 1]?.snapshot ?? base;
      return { ...base, ...latest, savedViews: hydratedViews };
    } catch (error) {
      console.warn("Failed to read saved views; falling back to defaults", error);
      return base;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: PersistedViews = { version: STORAGE_VERSION, views: state.savedViews };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [state.savedViews]);

  useEffect(() => {
    if (!state.toast) return;
    const timer = setTimeout(() => dispatch({ type: "dismissToast" }), 4000);
    return () => clearTimeout(timer);
  }, [state.toast]);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return <TriPaneContext.Provider value={value}>{children}</TriPaneContext.Provider>;
}

export function useTriPane() {
  const ctx = useContext(TriPaneContext);
  if (!ctx) throw new Error("TriPaneContext missing");
  return ctx;
}
