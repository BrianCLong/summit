import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import workspaceReducer, {
  setCaseSuccess,
  WorkspaceState,
} from '../store/workspaceSlice';
import EntityExplorer from '../components/EntityExplorer';

const MOCK_CASE = {
  id: 'case-001',
  title: 'Test Case',
  description: 'Test',
  entities: [
    {
      id: 'e-001',
      label: 'Viktor Morozov',
      type: 'person' as const,
      deception_score: 0.87,
      connections: ['e-002'],
      properties: { role: 'Coordinator' },
    },
    {
      id: 'e-002',
      label: 'Nexus Holdings',
      type: 'organization' as const,
      deception_score: 0.4,
      connections: ['e-001'],
      properties: {},
    },
    {
      id: 'e-003',
      label: 'Dubai Office',
      type: 'location' as const,
      deception_score: 0.2,
      connections: [],
      properties: {},
    },
  ],
  relationships: [],
  events: [],
  reports: [],
};

// Merge partial state with initialState so required fields like `filters` are always present
const INITIAL_WS = workspaceReducer(undefined, { type: '@@INIT' });

function makeStore(preloadedState?: Partial<WorkspaceState>) {
  const store = configureStore({
    reducer: { workspace: workspaceReducer },
    preloadedState: preloadedState
      ? { workspace: { ...INITIAL_WS, ...preloadedState } as WorkspaceState }
      : undefined,
  });
  return store;
}

function renderWithStore(store: ReturnType<typeof makeStore>) {
  return render(
    <Provider store={store}>
      <EntityExplorer />
    </Provider>,
  );
}

describe('EntityExplorer', () => {
  it('shows skeleton rows while loading', () => {
    const store = makeStore({ loadingState: 'loading' } as Partial<WorkspaceState>);
    renderWithStore(store);
    expect(screen.getByRole('complementary', { name: /entity explorer/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/loading entities/i)).toBeInTheDocument();
  });

  it('shows error message on error state', () => {
    const store = makeStore({
      loadingState: 'error',
      error: 'Network failure',
    } as Partial<WorkspaceState>);
    renderWithStore(store);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders entity rows after successful load', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    expect(screen.getByTestId('entity-row-e-001')).toBeInTheDocument();
    expect(screen.getByTestId('entity-row-e-002')).toBeInTheDocument();
    expect(screen.getByTestId('entity-row-e-003')).toBeInTheDocument();
    expect(screen.getByText('Viktor Morozov')).toBeInTheDocument();
  });

  it('shows entity count in footer', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);
    expect(screen.getByText(/3 of 3 entities/)).toBeInTheDocument();
  });

  it('filters entities by search text', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    const searchInput = screen.getByTestId('entity-search-input');
    fireEvent.change(searchInput, { target: { value: 'Viktor' } });

    expect(screen.getByTestId('entity-row-e-001')).toBeInTheDocument();
    expect(screen.queryByTestId('entity-row-e-002')).not.toBeInTheDocument();
    expect(screen.getByText(/1 of 3 entities/)).toBeInTheDocument();
  });

  it('shows no-results message when search has no match', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    const searchInput = screen.getByTestId('entity-search-input');
    fireEvent.change(searchInput, { target: { value: 'zzznomatch' } });

    expect(screen.getByTestId('no-results-msg')).toBeInTheDocument();
  });

  it('filters by type when type button is clicked', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    const personBtn = screen.getByTestId('type-filter-person');
    fireEvent.click(personBtn);

    expect(screen.getByTestId('entity-row-e-001')).toBeInTheDocument();
    expect(screen.queryByTestId('entity-row-e-002')).not.toBeInTheDocument();
  });

  it('dispatches selectEntity when row is clicked', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    fireEvent.click(screen.getByTestId('entity-row-e-001'));

    const state = store.getState().workspace;
    expect(state.selectedEntityId).toBe('e-001');
  });

  it('deselects entity when same row is clicked again', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    fireEvent.click(screen.getByTestId('entity-row-e-001'));
    fireEvent.click(screen.getByTestId('entity-row-e-001'));

    const state = store.getState().workspace;
    expect(state.selectedEntityId).toBeNull();
  });

  it('shows selected state on chosen entity row', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    fireEvent.click(screen.getByTestId('entity-row-e-001'));

    const row = screen.getByTestId('entity-row-e-001');
    expect(row).toHaveAttribute('aria-selected', 'true');
  });

  it('shows clear filters button when filters are active', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    expect(screen.queryByTestId('clear-filters-btn')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('entity-search-input'), {
      target: { value: 'something' },
    });

    expect(screen.getByTestId('clear-filters-btn')).toBeInTheDocument();
  });

  it('clears all filters when clear button is clicked', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    fireEvent.change(screen.getByTestId('entity-search-input'), {
      target: { value: 'Viktor' },
    });
    fireEvent.click(screen.getByTestId('clear-filters-btn'));

    expect(store.getState().workspace.filters.search).toBe('');
    expect(screen.getByText(/3 of 3 entities/)).toBeInTheDocument();
  });

  it('supports keyboard Enter to select entity', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    const row = screen.getByTestId('entity-row-e-002');
    fireEvent.keyDown(row, { key: 'Enter' });

    expect(store.getState().workspace.selectedEntityId).toBe('e-002');
  });
});
