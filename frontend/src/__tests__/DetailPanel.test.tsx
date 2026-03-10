import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import workspaceReducer, {
  setCaseSuccess,
  WorkspaceState,
} from '../store/workspaceSlice';
import DetailPanel from '../components/DetailPanel';

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
      connections: [],
      properties: {},
    },
  ],
  relationships: [],
  events: [
    {
      id: 'ev-001',
      timestamp: '2023-09-01T00:00:00Z',
      action: 'Campaign initiated',
      entityId: 'e-001',
      confidence: 0.91,
      result: 'confirmed',
      severity: 'critical' as const,
    },
    {
      id: 'ev-002',
      timestamp: '2023-10-01T00:00:00Z',
      action: 'Follow-up event',
      entityId: undefined,
      confidence: 0.6,
      result: 'under review',
      severity: 'medium' as const,
    },
  ],
  reports: [
    {
      id: 'rep-001',
      title: 'Initial Assessment',
      summary: 'Preliminary findings.',
      entityIds: ['e-001'],
      createdAt: '2023-10-01T12:00:00Z',
      status: 'final' as const,
    },
  ],
};

const INITIAL_WS = workspaceReducer(undefined, { type: '@@INIT' });

function makeStore(preloadedState?: Partial<WorkspaceState>) {
  return configureStore({
    reducer: { workspace: workspaceReducer },
    preloadedState: preloadedState
      ? { workspace: { ...INITIAL_WS, ...preloadedState } as WorkspaceState }
      : undefined,
  });
}

function renderWithStore(store: ReturnType<typeof makeStore>) {
  return render(
    <Provider store={store}>
      <DetailPanel />
    </Provider>,
  );
}

describe('DetailPanel', () => {
  it('shows idle state message when no case loaded', () => {
    const store = makeStore();
    renderWithStore(store);
    expect(screen.getByText(/open a case/i)).toBeInTheDocument();
  });

  it('shows loading skeleton while loading', () => {
    const store = makeStore({ loadingState: 'loading' } as Partial<WorkspaceState>);
    renderWithStore(store);
    expect(screen.getByLabelText(/loading timeline/i)).toBeInTheDocument();
  });

  it('shows error message on error state', () => {
    const store = makeStore({ loadingState: 'error' } as Partial<WorkspaceState>);
    renderWithStore(store);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders timeline events after case loads', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    expect(screen.getByTestId('event-row-ev-001')).toBeInTheDocument();
    expect(screen.getByText('Campaign initiated')).toBeInTheDocument();
  });

  it('filters events by selected entity', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));

    // Select entity e-001 — only ev-001 belongs to it
    store.dispatch({ type: 'workspace/selectEntity', payload: 'e-001' });

    renderWithStore(store);

    expect(screen.getByTestId('event-row-ev-001')).toBeInTheDocument();
    expect(screen.queryByTestId('event-row-ev-002')).not.toBeInTheDocument();
  });

  it('shows all events when no entity is selected', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    expect(screen.getByTestId('event-row-ev-001')).toBeInTheDocument();
    expect(screen.getByTestId('event-row-ev-002')).toBeInTheDocument();
  });

  it('dispatches selectEvent when event row is clicked', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    fireEvent.click(screen.getByTestId('event-row-ev-001'));

    expect(store.getState().workspace.selectedEventId).toBe('ev-001');
  });

  it('marks event row as selected when it is the selectedEventId', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    fireEvent.click(screen.getByTestId('event-row-ev-001'));

    const row = screen.getByTestId('event-row-ev-001');
    expect(row).toHaveAttribute('aria-selected', 'true');
  });

  it('deselects event when same row is clicked again', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    fireEvent.click(screen.getByTestId('event-row-ev-001'));
    fireEvent.click(screen.getByTestId('event-row-ev-001'));

    expect(store.getState().workspace.selectedEventId).toBeNull();
  });

  it('switches to reports tab and shows reports', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    fireEvent.click(screen.getByRole('tab', { name: /reports/i }));

    expect(screen.getByTestId('report-card-rep-001')).toBeInTheDocument();
    expect(screen.getByText('Initial Assessment')).toBeInTheDocument();
  });

  it('report entity tag click dispatches selectEntity', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    fireEvent.click(screen.getByRole('tab', { name: /reports/i }));
    fireEvent.click(screen.getByRole('button', { name: /focus entity Viktor Morozov/i }));

    expect(store.getState().workspace.selectedEntityId).toBe('e-001');
  });

  it('shows no-events message when entity has no events', () => {
    const store = makeStore();
    const caseWithNoEvents = {
      ...MOCK_CASE,
      events: [{ ...MOCK_CASE.events[0], entityId: 'e-999' }],
    };
    store.dispatch(setCaseSuccess(caseWithNoEvents));
    store.dispatch({ type: 'workspace/selectEntity', payload: 'e-001' });
    renderWithStore(store);

    expect(screen.getByTestId('no-events-msg')).toBeInTheDocument();
  });

  it('shows event severity badge', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('supports keyboard Enter to select event', () => {
    const store = makeStore();
    store.dispatch(setCaseSuccess(MOCK_CASE));
    renderWithStore(store);

    const row = screen.getByTestId('event-row-ev-001');
    fireEvent.keyDown(row, { key: 'Enter' });

    expect(store.getState().workspace.selectedEventId).toBe('ev-001');
  });
});
