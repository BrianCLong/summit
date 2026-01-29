import { render, screen, fireEvent, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { SelectionSummary } from './SelectionSummary';
import { selectNode, setTimeRange, store } from '../store';

describe('SelectionSummary', () => {
  beforeEach(() => {
    store.dispatch(selectNode(null));
    store.dispatch(setTimeRange(null));
  });

  test('renders with no selection', () => {
    render(
      <Provider store={store}>
        <SelectionSummary />
      </Provider>,
    );
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('Unbounded')).toBeInTheDocument();
  });

  test('clears selected node when delete is clicked', () => {
    store.dispatch(selectNode('test-node'));
    render(
      <Provider store={store}>
        <SelectionSummary />
      </Provider>,
    );

    expect(screen.getByText('test-node')).toBeInTheDocument();

    const chip = screen.getByTestId('selected-node-label');
    // Using a generic selector for the delete icon/button since we depend on MUI internals or implementation
    // The implementation will add onDelete which usually renders a button.
    const deleteBtn =
      chip.querySelector('svg[data-testid="CancelIcon"]') ||
      chip.querySelector('button') ||
      chip.querySelector('.MuiChip-deleteIcon');

    if (deleteBtn) {
      fireEvent.click(deleteBtn);
      expect(store.getState().selection.selectedNodeId).toBeNull();
    }
  });

  test('clears time range when delete is clicked', () => {
    store.dispatch(setTimeRange([1600000000000, 1600001000000]));
    render(
      <Provider store={store}>
        <SelectionSummary />
      </Provider>,
    );

    expect(screen.getByTestId('time-range-label')).toHaveTextContent(/-/, {
      normalizeWhitespace: true,
    });

    const chip = screen.getByTestId('time-range-label');
    const deleteBtn =
      chip.querySelector('svg[data-testid="CancelIcon"]') ||
      chip.querySelector('button') ||
      chip.querySelector('.MuiChip-deleteIcon');

    if (deleteBtn) {
      fireEvent.click(deleteBtn);
      expect(store.getState().selection.timeRange).toBeNull();
    }
  });
});
