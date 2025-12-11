import React, { createContext, useContext, useMemo, useReducer } from 'react';
import { geofences } from '../data';
import { TimeRange, TriPaneAction, TriPaneState, ViewSnapshot } from '../types';

const initialRange: TimeRange = { start: 1, end: 17 };

const defaultSnapshot: ViewSnapshot = {
  name: 'Active ops',
  timeRange: initialRange,
  pinnedNodes: [],
  activeLayers: ['signals', 'comms', 'logistics'],
  geofence: geofences[0]?.id ?? null,
  filterText: '',
  focusNodeId: undefined
};

const initialState: TriPaneState = {
  ...defaultSnapshot,
  savedViews: [defaultSnapshot]
};

const TriPaneContext = createContext<{
  state: TriPaneState;
  dispatch: React.Dispatch<TriPaneAction>;
}>({ state: initialState, dispatch: () => undefined });

function reducer(state: TriPaneState, action: TriPaneAction): TriPaneState {
  switch (action.type) {
    case 'setTimeRange':
      return { ...state, timeRange: action.payload };
    case 'toggleLayer': {
      const exists = state.activeLayers.includes(action.payload);
      const nextLayers = exists
        ? state.activeLayers.filter((layer) => layer !== action.payload)
        : [...state.activeLayers, action.payload];
      return { ...state, activeLayers: nextLayers };
    }
    case 'setGeofence':
      return { ...state, geofence: action.payload };
    case 'togglePin': {
      const pinned = state.pinnedNodes.includes(action.payload);
      const nextPins = pinned
        ? state.pinnedNodes.filter((id) => id !== action.payload)
        : [...state.pinnedNodes, action.payload];
      return { ...state, pinnedNodes: nextPins };
    }
    case 'setFilterText':
      return { ...state, filterText: action.payload };
    case 'setFocusNode':
      return { ...state, focusNodeId: action.payload };
    case 'saveView': {
      const snapshot: ViewSnapshot = {
        name: action.payload,
        timeRange: state.timeRange,
        pinnedNodes: state.pinnedNodes,
        activeLayers: state.activeLayers,
        geofence: state.geofence,
        filterText: state.filterText,
        focusNodeId: state.focusNodeId
      };
      return { ...state, savedViews: [...state.savedViews, snapshot] };
    }
    case 'loadView': {
      const view = state.savedViews.find((v) => v.name === action.payload);
      if (!view) return state;
      return { ...state, ...view };
    }
    case 'replaceViews':
      return { ...state, savedViews: action.payload };
    default:
      return state;
  }
}

export function TriPaneProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return <TriPaneContext.Provider value={value}>{children}</TriPaneContext.Provider>;
}

export function useTriPane() {
  const ctx = useContext(TriPaneContext);
  if (!ctx) throw new Error('TriPaneContext missing');
  return ctx;
}
