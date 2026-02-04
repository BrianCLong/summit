import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette } from './CommandPalette';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';

// Mock store setup
const createMockStore = (initialState: any) => configureStore({
  reducer: {
    selection: (state = initialState, action) => {
        if (action.type === 'selection/selectNode') return { ...state, selectedNodeId: action.payload };
        if (action.type === 'selection/setTimeRange') return { ...state, timeRange: action.payload };
        return state;
    }
  }
});

describe('CommandPalette', () => {
  const toggleTheme = vi.fn();
  const onClose = vi.fn();

  it('renders commands correctly', () => {
    const store = createMockStore({ selectedNodeId: 'node-1', timeRange: [100, 200] });
    render(
      <Provider store={store}>
        <CommandPalette open={true} onClose={onClose} toggleTheme={toggleTheme} mode="light" />
      </Provider>
    );

    expect(screen.getByText('Switch to Dark Mode')).toBeInTheDocument();
    expect(screen.getByText('Clear Node Selection')).toBeInTheDocument();
    expect(screen.getByText('Reset Time Range')).toBeInTheDocument();
  });

  it('calls toggleTheme when clicked', () => {
    const store = createMockStore({ selectedNodeId: null, timeRange: null });
    render(
      <Provider store={store}>
        <CommandPalette open={true} onClose={onClose} toggleTheme={toggleTheme} mode="light" />
      </Provider>
    );

    fireEvent.click(screen.getByText('Switch to Dark Mode'));
    expect(toggleTheme).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Switch to Light Mode when mode is dark', () => {
    const store = createMockStore({ selectedNodeId: null, timeRange: null });
    render(
      <Provider store={store}>
        <CommandPalette open={true} onClose={onClose} toggleTheme={toggleTheme} mode="dark" />
      </Provider>
    );

    expect(screen.getByText('Switch to Light Mode')).toBeInTheDocument();
  });
});
