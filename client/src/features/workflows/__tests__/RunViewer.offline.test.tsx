/** @jest-environment jsdom */
import '../../../test-utils/textEncoderPolyfill';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RunViewer from '../RunViewer';
jest.mock('reactflow/dist/style.css', () => ({}));

const mockRun = {
  id: 'run-123',
  name: 'Demo run',
  status: 'running' as const,
  steps: [],
};

const originalFetch = globalThis.fetch;
const originalOnLine = navigator.onLine;

beforeAll(() => {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error jsdom global override for ReactFlow
  global.ResizeObserver = ResizeObserver;
});

beforeEach(() => {
  Object.defineProperty(window.navigator, 'onLine', {
    value: originalOnLine,
    configurable: true,
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function renderViewer() {
  return render(
    <MemoryRouter initialEntries={[`/viewer?runId=${mockRun.id}`]}>
      <RunViewer />
    </MemoryRouter>,
  );
}

test('shows offline banner and disables retry when offline', async () => {
  const mockFetch = jest.fn();
  globalThis.fetch = mockFetch as typeof globalThis.fetch;
  Object.defineProperty(window.navigator, 'onLine', {
    value: false,
    configurable: true,
  });

  renderViewer();

  expect(await screen.findByTestId('offline-banner')).toBeInTheDocument();
  expect(screen.getByTestId('retry-button')).toBeDisabled();
  expect(mockFetch).not.toHaveBeenCalled();
});

test('retries once after reconnection', async () => {
  const mockFetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(mockRun) } as Response),
  );
  globalThis.fetch = mockFetch as typeof globalThis.fetch;
  Object.defineProperty(window.navigator, 'onLine', {
    value: false,
    configurable: true,
  });

  renderViewer();
  expect(mockFetch).not.toHaveBeenCalled();

  Object.defineProperty(window.navigator, 'onLine', {
    value: true,
    configurable: true,
  });
  window.dispatchEvent(new Event('online'));

  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
});

test('retry button prevents duplicate submissions during in-flight request', async () => {
  const resolvePromise: Array<() => void> = [];
  const mockFetch = jest
    .fn()
    .mockRejectedValueOnce(new Error('boom'))
    .mockImplementation(() =>
      new Promise((resolve) => {
        resolvePromise.push(() =>
          resolve({ ok: true, json: () => Promise.resolve(mockRun) } as Response),
        );
      }),
    );

  globalThis.fetch = mockFetch as typeof globalThis.fetch;
  renderViewer();

  await screen.findByText(/Error loading run data/i);
  const retryButton = screen.getByTestId('retry-button');
  fireEvent.click(retryButton);
  fireEvent.click(retryButton);

  expect(mockFetch).toHaveBeenCalledTimes(2);

  resolvePromise.forEach((fn) => fn());
  await waitFor(() => expect(screen.getByText(/Demo run/)).toBeInTheDocument());
});
