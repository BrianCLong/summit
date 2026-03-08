import { describe, it, expect } from 'vitest';
import workspaceReducer, {
  setCaseLoading,
  setCaseSuccess,
  setCaseError,
  selectEntity,
  selectRelationship,
  selectEvent,
  setSearchFilter,
  toggleTypeFilter,
  setMinDeceptionScore,
  clearFilters,
  WorkspaceState,
  CaseData,
} from '../store/workspaceSlice';

const MOCK_CASE: CaseData = {
  id: 'case-001',
  title: 'Test Case',
  description: 'Test',
  entities: [
    {
      id: 'e-001',
      label: 'Alice',
      type: 'person',
      deception_score: 0.8,
      connections: ['e-002'],
      properties: {},
    },
    {
      id: 'e-002',
      label: 'Acme Corp',
      type: 'organization',
      deception_score: 0.3,
      connections: ['e-001'],
      properties: {},
    },
  ],
  relationships: [],
  events: [],
  reports: [],
};

describe('workspaceSlice', () => {
  const initialState = workspaceReducer(undefined, { type: '@@INIT' });

  it('starts in idle state', () => {
    expect(initialState.loadingState).toBe('idle');
    expect(initialState.case).toBeNull();
    expect(initialState.selectedEntityId).toBeNull();
    expect(initialState.error).toBeNull();
  });

  describe('case loading lifecycle', () => {
    it('sets loading state on setCaseLoading', () => {
      const state = workspaceReducer(initialState, setCaseLoading());
      expect(state.loadingState).toBe('loading');
      expect(state.error).toBeNull();
    });

    it('sets case data on setCaseSuccess', () => {
      const state = workspaceReducer(initialState, setCaseSuccess(MOCK_CASE));
      expect(state.loadingState).toBe('success');
      expect(state.case).toEqual(MOCK_CASE);
      expect(state.error).toBeNull();
    });

    it('sets error on setCaseError', () => {
      const state = workspaceReducer(initialState, setCaseError('Network failure'));
      expect(state.loadingState).toBe('error');
      expect(state.error).toBe('Network failure');
    });
  });

  describe('entity selection', () => {
    it('selects an entity and clears relationship selection', () => {
      const withRel: WorkspaceState = {
        ...initialState,
        selectedRelationshipId: 'r-001',
      };
      const state = workspaceReducer(withRel, selectEntity('e-001'));
      expect(state.selectedEntityId).toBe('e-001');
      expect(state.selectedRelationshipId).toBeNull();
    });

    it('deselects when null is dispatched', () => {
      const withSel: WorkspaceState = { ...initialState, selectedEntityId: 'e-001' };
      const state = workspaceReducer(withSel, selectEntity(null));
      expect(state.selectedEntityId).toBeNull();
    });

    it('appends audit log entry on entity select', () => {
      const state = workspaceReducer(initialState, selectEntity('e-001'));
      expect(state.auditLog).toHaveLength(1);
      expect(state.auditLog[0].action).toBe('SELECT_ENTITY');
      expect(state.auditLog[0].entityId).toBe('e-001');
    });

    it('does NOT append audit log entry when deselecting', () => {
      const state = workspaceReducer(initialState, selectEntity(null));
      expect(state.auditLog).toHaveLength(0);
    });
  });

  describe('relationship selection', () => {
    it('selects a relationship and clears entity selection', () => {
      const withEntity: WorkspaceState = {
        ...initialState,
        selectedEntityId: 'e-001',
      };
      const state = workspaceReducer(withEntity, selectRelationship('r-001'));
      expect(state.selectedRelationshipId).toBe('r-001');
      expect(state.selectedEntityId).toBeNull();
    });
  });

  describe('event selection', () => {
    it('selects and deselects an event', () => {
      const s1 = workspaceReducer(initialState, selectEvent('ev-001'));
      expect(s1.selectedEventId).toBe('ev-001');

      const s2 = workspaceReducer(s1, selectEvent(null));
      expect(s2.selectedEventId).toBeNull();
    });
  });

  describe('filters', () => {
    it('sets search filter', () => {
      const state = workspaceReducer(initialState, setSearchFilter('Alice'));
      expect(state.filters.search).toBe('Alice');
    });

    it('toggles type filter on and off', () => {
      const s1 = workspaceReducer(initialState, toggleTypeFilter('person'));
      expect(s1.filters.types).toContain('person');

      const s2 = workspaceReducer(s1, toggleTypeFilter('person'));
      expect(s2.filters.types).not.toContain('person');
    });

    it('can combine multiple type filters', () => {
      const s1 = workspaceReducer(initialState, toggleTypeFilter('person'));
      const s2 = workspaceReducer(s1, toggleTypeFilter('organization'));
      expect(s2.filters.types).toEqual(['person', 'organization']);
    });

    it('sets minimum deception score', () => {
      const state = workspaceReducer(initialState, setMinDeceptionScore(0.7));
      expect(state.filters.minDeceptionScore).toBe(0.7);
    });

    it('clearFilters resets all filter state', () => {
      let state = workspaceReducer(initialState, setSearchFilter('foo'));
      state = workspaceReducer(state, toggleTypeFilter('person'));
      state = workspaceReducer(state, setMinDeceptionScore(0.5));
      state = workspaceReducer(state, clearFilters());
      expect(state.filters.search).toBe('');
      expect(state.filters.types).toHaveLength(0);
      expect(state.filters.minDeceptionScore).toBe(0);
    });
  });
});
