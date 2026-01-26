import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TriPaneProvider } from '../EventBus';
import { SavedViewsPanel } from '../SavedViewsPanel';
import { TimelinePane } from '../TimelinePane';
import { Toast } from '../Toast';
import { SAVED_VIEWS_VERSION } from '../../config';
import { ViewSnapshot } from '../../types';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <TriPaneProvider>{children}</TriPaneProvider>;
}

describe('Saved views', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves, persists, reloads, and restores a time window', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = render(
      <Wrapper>
        <SavedViewsPanel />
        <TimelinePane />
      </Wrapper>
    );

    const nameInput = screen.getByLabelText(/Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Morning brush');

    const startSlider = screen.getByLabelText('Start');
    const endSlider = screen.getByLabelText('End');

    // Change sliders and flush rAF callbacks
    act(() => {
      fireEvent.change(startSlider, { target: { value: '6' } });
    });
    await act(async () => {
      vi.runAllTimers();
    });
    act(() => {
      fireEvent.change(endSlider, { target: { value: '12' } });
    });
    await act(async () => {
      vi.runAllTimers();
    });

    await user.click(screen.getByRole('button', { name: /Save view/i }));

    const stored = localStorage.getItem('tri-pane:saved-views');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored ?? '{}');
    expect(parsed.version).toBe(SAVED_VIEWS_VERSION);
    expect(parsed.views[parsed.views.length - 1].snapshot.timeRange).toEqual({ start: 6, end: 12 });

    // Move sliders away to prove restoration changes state
    fireEvent.change(startSlider, { target: { value: '1' } });
    fireEvent.change(endSlider, { target: { value: '17' } });

    unmount();

    render(
      <Wrapper>
        <SavedViewsPanel />
        <TimelinePane />
      </Wrapper>
    );

    await user.click(screen.getByRole('button', { name: /Morning brush/i }));

    expect(screen.getByText(/Start 6/)).toBeInTheDocument();
    expect(screen.getByText(/End 12/)).toBeInTheDocument();
  });

  it('shows a toast when restored view references missing data', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const snapshot: ViewSnapshot = {
      name: 'Missing data',
      timeRange: { start: 2, end: 5 },
      pinnedNodes: ['ghost'],
      activeLayers: ['comms', 'logistics'],
      geofence: 'missing',
      filterText: '',
      layoutMode: 'grid'
    };
    const record = {
      id: 'missing',
      version: SAVED_VIEWS_VERSION,
      createdAt: new Date().toISOString(),
      snapshot
    };
    localStorage.setItem(
      'tri-pane:saved-views',
      JSON.stringify({ version: SAVED_VIEWS_VERSION, views: [record] })
    );

    render(
      <Wrapper>
        <SavedViewsPanel />
        <Toast />
      </Wrapper>
    );

    await user.click(screen.getByRole('button', { name: /Missing data/i }));
    expect(screen.getByText(/Restored with omissions/i)).toBeInTheDocument();
  });
});
