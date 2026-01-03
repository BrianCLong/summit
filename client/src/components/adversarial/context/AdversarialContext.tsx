import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type {
  Adversary,
  Detection,
  TacticEvent,
  DefenseStrategy,
  SimulationScenario,
  Incident,
  Campaign,
  Alert,
  IOC,
  Playbook,
  RiskScore,
  ThreatIntelItem,
  SecurityMetric,
  AdversarialFilters,
} from '../types';

// State Types
export interface AdversarialState {
  adversaries: Adversary[];
  detections: Detection[];
  tacticEvents: TacticEvent[];
  defenseStrategies: DefenseStrategy[];
  simulations: SimulationScenario[];
  incidents: Incident[];
  campaigns: Campaign[];
  alerts: Alert[];
  iocs: IOC[];
  playbooks: Playbook[];
  threatIntel: ThreatIntelItem[];
  metrics: SecurityMetric[];
  riskScore: RiskScore | null;
  filters: AdversarialFilters;
  selectedAdversaryId: string | null;
  selectedDetectionId: string | null;
  selectedIncidentId: string | null;
  isLoading: boolean;
  error: string | null;
  preferences: {
    autoRefresh: boolean;
    refreshInterval: number;
    showNotifications: boolean;
    defaultView: 'overview' | 'threats' | 'defense' | 'simulations';
  };
}

// Action Types
type AdversarialAction =
  | { type: 'SET_ADVERSARIES'; payload: Adversary[] }
  | { type: 'ADD_ADVERSARY'; payload: Adversary }
  | { type: 'UPDATE_ADVERSARY'; payload: { id: string; updates: Partial<Adversary> } }
  | { type: 'SET_DETECTIONS'; payload: Detection[] }
  | { type: 'ADD_DETECTION'; payload: Detection }
  | { type: 'UPDATE_DETECTION'; payload: { id: string; updates: Partial<Detection> } }
  | { type: 'SET_TACTIC_EVENTS'; payload: TacticEvent[] }
  | { type: 'ADD_TACTIC_EVENT'; payload: TacticEvent }
  | { type: 'SET_DEFENSE_STRATEGIES'; payload: DefenseStrategy[] }
  | { type: 'UPDATE_STRATEGY'; payload: { id: string; updates: Partial<DefenseStrategy> } }
  | { type: 'SET_SIMULATIONS'; payload: SimulationScenario[] }
  | { type: 'UPDATE_SIMULATION'; payload: { id: string; updates: Partial<SimulationScenario> } }
  | { type: 'SET_INCIDENTS'; payload: Incident[] }
  | { type: 'ADD_INCIDENT'; payload: Incident }
  | { type: 'UPDATE_INCIDENT'; payload: { id: string; updates: Partial<Incident> } }
  | { type: 'SET_CAMPAIGNS'; payload: Campaign[] }
  | { type: 'SET_ALERTS'; payload: Alert[] }
  | { type: 'ADD_ALERT'; payload: Alert }
  | { type: 'UPDATE_ALERT'; payload: { id: string; updates: Partial<Alert> } }
  | { type: 'SET_IOCS'; payload: IOC[] }
  | { type: 'ADD_IOC'; payload: IOC }
  | { type: 'SET_PLAYBOOKS'; payload: Playbook[] }
  | { type: 'SET_THREAT_INTEL'; payload: ThreatIntelItem[] }
  | { type: 'SET_METRICS'; payload: SecurityMetric[] }
  | { type: 'SET_RISK_SCORE'; payload: RiskScore }
  | { type: 'SET_FILTERS'; payload: AdversarialFilters }
  | { type: 'SELECT_ADVERSARY'; payload: string | null }
  | { type: 'SELECT_DETECTION'; payload: string | null }
  | { type: 'SELECT_INCIDENT'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<AdversarialState['preferences']> }
  | { type: 'RESET_STATE' };

// Initial State
const initialState: AdversarialState = {
  adversaries: [],
  detections: [],
  tacticEvents: [],
  defenseStrategies: [],
  simulations: [],
  incidents: [],
  campaigns: [],
  alerts: [],
  iocs: [],
  playbooks: [],
  threatIntel: [],
  metrics: [],
  riskScore: null,
  filters: {},
  selectedAdversaryId: null,
  selectedDetectionId: null,
  selectedIncidentId: null,
  isLoading: false,
  error: null,
  preferences: {
    autoRefresh: true,
    refreshInterval: 30000,
    showNotifications: true,
    defaultView: 'overview',
  },
};

// Reducer
function adversarialReducer(state: AdversarialState, action: AdversarialAction): AdversarialState {
  switch (action.type) {
    case 'SET_ADVERSARIES':
      return { ...state, adversaries: action.payload };
    case 'ADD_ADVERSARY':
      return { ...state, adversaries: [...state.adversaries, action.payload] };
    case 'UPDATE_ADVERSARY':
      return {
        ...state,
        adversaries: state.adversaries.map((a) =>
          a.id === action.payload.id ? { ...a, ...action.payload.updates } : a
        ),
      };
    case 'SET_DETECTIONS':
      return { ...state, detections: action.payload };
    case 'ADD_DETECTION':
      return { ...state, detections: [...state.detections, action.payload] };
    case 'UPDATE_DETECTION':
      return {
        ...state,
        detections: state.detections.map((d) =>
          d.id === action.payload.id ? { ...d, ...action.payload.updates } : d
        ),
      };
    case 'SET_TACTIC_EVENTS':
      return { ...state, tacticEvents: action.payload };
    case 'ADD_TACTIC_EVENT':
      return { ...state, tacticEvents: [...state.tacticEvents, action.payload] };
    case 'SET_DEFENSE_STRATEGIES':
      return { ...state, defenseStrategies: action.payload };
    case 'UPDATE_STRATEGY':
      return {
        ...state,
        defenseStrategies: state.defenseStrategies.map((s) =>
          s.id === action.payload.id ? { ...s, ...action.payload.updates } : s
        ),
      };
    case 'SET_SIMULATIONS':
      return { ...state, simulations: action.payload };
    case 'UPDATE_SIMULATION':
      return {
        ...state,
        simulations: state.simulations.map((s) =>
          s.id === action.payload.id ? { ...s, ...action.payload.updates } : s
        ),
      };
    case 'SET_INCIDENTS':
      return { ...state, incidents: action.payload };
    case 'ADD_INCIDENT':
      return { ...state, incidents: [...state.incidents, action.payload] };
    case 'UPDATE_INCIDENT':
      return {
        ...state,
        incidents: state.incidents.map((i) =>
          i.id === action.payload.id ? { ...i, ...action.payload.updates } : i
        ),
      };
    case 'SET_CAMPAIGNS':
      return { ...state, campaigns: action.payload };
    case 'SET_ALERTS':
      return { ...state, alerts: action.payload };
    case 'ADD_ALERT':
      return { ...state, alerts: [...state.alerts, action.payload] };
    case 'UPDATE_ALERT':
      return {
        ...state,
        alerts: state.alerts.map((a) =>
          a.id === action.payload.id ? { ...a, ...action.payload.updates } : a
        ),
      };
    case 'SET_IOCS':
      return { ...state, iocs: action.payload };
    case 'ADD_IOC':
      return { ...state, iocs: [...state.iocs, action.payload] };
    case 'SET_PLAYBOOKS':
      return { ...state, playbooks: action.payload };
    case 'SET_THREAT_INTEL':
      return { ...state, threatIntel: action.payload };
    case 'SET_METRICS':
      return { ...state, metrics: action.payload };
    case 'SET_RISK_SCORE':
      return { ...state, riskScore: action.payload };
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    case 'SELECT_ADVERSARY':
      return { ...state, selectedAdversaryId: action.payload };
    case 'SELECT_DETECTION':
      return { ...state, selectedDetectionId: action.payload };
    case 'SELECT_INCIDENT':
      return { ...state, selectedIncidentId: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'UPDATE_PREFERENCES':
      return { ...state, preferences: { ...state.preferences, ...action.payload } };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
}

// Context
interface AdversarialContextValue {
  state: AdversarialState;
  dispatch: React.Dispatch<AdversarialAction>;
  // Computed values
  filteredAdversaries: Adversary[];
  filteredDetections: Detection[];
  selectedAdversary: Adversary | undefined;
  selectedDetection: Detection | undefined;
  selectedIncident: Incident | undefined;
  // Stats
  stats: {
    activeAdversaries: number;
    criticalDetections: number;
    openIncidents: number;
    activeAlerts: number;
  };
}

const AdversarialContext = createContext<AdversarialContextValue | null>(null);

// Provider
export interface AdversarialProviderProps {
  children: React.ReactNode;
  initialData?: Partial<AdversarialState>;
}

export const AdversarialProvider: React.FC<AdversarialProviderProps> = ({
  children,
  initialData,
}) => {
  const [state, dispatch] = useReducer(adversarialReducer, {
    ...initialState,
    ...initialData,
  });

  const filteredAdversaries = useMemo(() => {
    let result = [...state.adversaries];

    if (state.filters.threatLevel?.length) {
      result = result.filter((a) => state.filters.threatLevel?.includes(a.threatLevel));
    }
    if (state.filters.adversaryType?.length) {
      result = result.filter((a) => state.filters.adversaryType?.includes(a.type));
    }
    if (state.filters.searchQuery) {
      const query = state.filters.searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.aliases.some((alias) => alias.toLowerCase().includes(query))
      );
    }

    return result;
  }, [state.adversaries, state.filters]);

  const filteredDetections = useMemo(() => {
    let result = [...state.detections];

    if (state.filters.tactics?.length) {
      result = result.filter((d) => state.filters.tactics?.includes(d.tactic));
    }
    if (state.filters.status?.length) {
      result = result.filter((d) => state.filters.status?.includes(d.status));
    }
    if (state.filters.dateRange) {
      const start = new Date(state.filters.dateRange.start);
      const end = new Date(state.filters.dateRange.end);
      result = result.filter((d) => {
        const date = new Date(d.timestamp);
        return date >= start && date <= end;
      });
    }

    return result;
  }, [state.detections, state.filters]);

  const selectedAdversary = useMemo(
    () => state.adversaries.find((a) => a.id === state.selectedAdversaryId),
    [state.adversaries, state.selectedAdversaryId]
  );

  const selectedDetection = useMemo(
    () => state.detections.find((d) => d.id === state.selectedDetectionId),
    [state.detections, state.selectedDetectionId]
  );

  const selectedIncident = useMemo(
    () => state.incidents.find((i) => i.id === state.selectedIncidentId),
    [state.incidents, state.selectedIncidentId]
  );

  const stats = useMemo(
    () => ({
      activeAdversaries: state.adversaries.filter((a) => a.active).length,
      criticalDetections: state.detections.filter((d) => d.severity === 'critical').length,
      openIncidents: state.incidents.filter((i) => i.status !== 'closed').length,
      activeAlerts: state.alerts.filter((a) => a.status === 'new').length,
    }),
    [state.adversaries, state.detections, state.incidents, state.alerts]
  );

  const value = useMemo(
    () => ({
      state,
      dispatch,
      filteredAdversaries,
      filteredDetections,
      selectedAdversary,
      selectedDetection,
      selectedIncident,
      stats,
    }),
    [
      state,
      filteredAdversaries,
      filteredDetections,
      selectedAdversary,
      selectedDetection,
      selectedIncident,
      stats,
    ]
  );

  return (
    <AdversarialContext.Provider value={value}>{children}</AdversarialContext.Provider>
  );
};

// Hooks
// eslint-disable-next-line react-refresh/only-export-components
export function useAdversarialContext() {
  const context = useContext(AdversarialContext);
  if (!context) {
    throw new Error('useAdversarialContext must be used within AdversarialProvider');
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdversaries() {
  const { state, dispatch, filteredAdversaries, selectedAdversary } = useAdversarialContext();

  const selectAdversary = useCallback(
    (id: string | null) => dispatch({ type: 'SELECT_ADVERSARY', payload: id }),
    [dispatch]
  );

  const addAdversary = useCallback(
    (adversary: Adversary) => dispatch({ type: 'ADD_ADVERSARY', payload: adversary }),
    [dispatch]
  );

  const updateAdversary = useCallback(
    (id: string, updates: Partial<Adversary>) =>
      dispatch({ type: 'UPDATE_ADVERSARY', payload: { id, updates } }),
    [dispatch]
  );

  return {
    adversaries: state.adversaries,
    filteredAdversaries,
    selectedAdversary,
    selectedAdversaryId: state.selectedAdversaryId,
    selectAdversary,
    addAdversary,
    updateAdversary,
  };
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDetections() {
  const { state, dispatch, filteredDetections, selectedDetection } = useAdversarialContext();

  const selectDetection = useCallback(
    (id: string | null) => dispatch({ type: 'SELECT_DETECTION', payload: id }),
    [dispatch]
  );

  const addDetection = useCallback(
    (detection: Detection) => dispatch({ type: 'ADD_DETECTION', payload: detection }),
    [dispatch]
  );

  const updateDetection = useCallback(
    (id: string, updates: Partial<Detection>) =>
      dispatch({ type: 'UPDATE_DETECTION', payload: { id, updates } }),
    [dispatch]
  );

  return {
    detections: state.detections,
    filteredDetections,
    selectedDetection,
    selectedDetectionId: state.selectedDetectionId,
    selectDetection,
    addDetection,
    updateDetection,
  };
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSimulation() {
  const { state, dispatch } = useAdversarialContext();

  const updateSimulation = useCallback(
    (id: string, updates: Partial<SimulationScenario>) =>
      dispatch({ type: 'UPDATE_SIMULATION', payload: { id, updates } }),
    [dispatch]
  );

  return {
    simulations: state.simulations,
    updateSimulation,
  };
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFilters() {
  const { state, dispatch } = useAdversarialContext();

  const setFilters = useCallback(
    (filters: AdversarialFilters) => dispatch({ type: 'SET_FILTERS', payload: filters }),
    [dispatch]
  );

  const clearFilters = useCallback(
    () => dispatch({ type: 'SET_FILTERS', payload: {} }),
    [dispatch]
  );

  return {
    filters: state.filters,
    setFilters,
    clearFilters,
  };
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const { state, dispatch } = useAdversarialContext();

  const addAlert = useCallback(
    (alert: Alert) => dispatch({ type: 'ADD_ALERT', payload: alert }),
    [dispatch]
  );

  const updateAlert = useCallback(
    (id: string, updates: Partial<Alert>) =>
      dispatch({ type: 'UPDATE_ALERT', payload: { id, updates } }),
    [dispatch]
  );

  return {
    alerts: state.alerts,
    addAlert,
    updateAlert,
  };
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePreferences() {
  const { state, dispatch } = useAdversarialContext();

  const updatePreferences = useCallback(
    (prefs: Partial<AdversarialState['preferences']>) =>
      dispatch({ type: 'UPDATE_PREFERENCES', payload: prefs }),
    [dispatch]
  );

  return {
    preferences: state.preferences,
    updatePreferences,
  };
}

export default AdversarialContext;
