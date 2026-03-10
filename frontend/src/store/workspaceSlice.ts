import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type EntityType =
  | 'person'
  | 'organization'
  | 'location'
  | 'event'
  | 'document'
  | 'account'
  | 'unknown';

export interface Entity {
  id: string;
  label: string;
  type: EntityType;
  properties: Record<string, string | number | boolean>;
  deception_score: number;
  connections: string[]; // ids of related entities
}

export interface Relationship {
  id: string;
  source: string;
  target: string;
  label: string;
  weight: number;
  timestamp?: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  action: string;
  entityId?: string;
  confidence: number;
  result: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Report {
  id: string;
  title: string;
  summary: string;
  entityIds: string[];
  createdAt: string;
  status: 'draft' | 'review' | 'final';
}

export interface CaseData {
  id: string;
  title: string;
  description: string;
  entities: Entity[];
  relationships: Relationship[];
  events: TimelineEvent[];
  reports: Report[];
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface FilterState {
  search: string;
  types: EntityType[];
  minDeceptionScore: number;
}

export interface WorkspaceState {
  case: CaseData | null;
  loadingState: LoadingState;
  error: string | null;
  selectedEntityId: string | null;
  selectedRelationshipId: string | null;
  selectedEventId: string | null;
  filters: FilterState;
  activePane: 'explorer' | 'canvas' | 'detail';
  auditLog: Array<{ ts: string; action: string; entityId?: string }>;
}

const initialState: WorkspaceState = {
  case: null,
  loadingState: 'idle',
  error: null,
  selectedEntityId: null,
  selectedRelationshipId: null,
  selectedEventId: null,
  filters: {
    search: '',
    types: [],
    minDeceptionScore: 0,
  },
  activePane: 'canvas',
  auditLog: [],
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setCaseLoading(state) {
      state.loadingState = 'loading';
      state.error = null;
    },
    setCaseSuccess(state, action: PayloadAction<CaseData>) {
      state.case = action.payload;
      state.loadingState = 'success';
      state.error = null;
    },
    setCaseError(state, action: PayloadAction<string>) {
      state.loadingState = 'error';
      state.error = action.payload;
    },
    selectEntity(state, action: PayloadAction<string | null>) {
      state.selectedEntityId = action.payload;
      state.selectedRelationshipId = null;
      if (action.payload) {
        state.auditLog.push({
          ts: new Date().toISOString(),
          action: 'SELECT_ENTITY',
          entityId: action.payload,
        });
      }
    },
    selectRelationship(state, action: PayloadAction<string | null>) {
      state.selectedRelationshipId = action.payload;
      state.selectedEntityId = null;
    },
    selectEvent(state, action: PayloadAction<string | null>) {
      state.selectedEventId = action.payload;
    },
    setSearchFilter(state, action: PayloadAction<string>) {
      state.filters.search = action.payload;
    },
    toggleTypeFilter(state, action: PayloadAction<EntityType>) {
      const t = action.payload;
      const idx = state.filters.types.indexOf(t);
      if (idx === -1) {
        state.filters.types.push(t);
      } else {
        state.filters.types.splice(idx, 1);
      }
    },
    setMinDeceptionScore(state, action: PayloadAction<number>) {
      state.filters.minDeceptionScore = action.payload;
    },
    setActivePane(
      state,
      action: PayloadAction<'explorer' | 'canvas' | 'detail'>,
    ) {
      state.activePane = action.payload;
    },
    clearFilters(state) {
      state.filters = { search: '', types: [], minDeceptionScore: 0 };
    },
  },
});

export const {
  setCaseLoading,
  setCaseSuccess,
  setCaseError,
  selectEntity,
  selectRelationship,
  selectEvent,
  setSearchFilter,
  toggleTypeFilter,
  setMinDeceptionScore,
  setActivePane,
  clearFilters,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
