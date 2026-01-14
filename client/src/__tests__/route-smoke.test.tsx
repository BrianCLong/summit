/**
 * Route smoke tests - ensures routes render without console errors
 * These tests prevent regression by catching render errors early
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import PolicySimulator from '../pages/PolicySimulator';

// Mock fetch globally
global.fetch = vi.fn();

describe('Route Smoke Tests - No Console Errors', () => {
  let consoleError;
  let consoleWarn;

  beforeEach(() => {
    // Spy on console methods
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // Mock fixtures API
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/ops/policy/fixtures')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ok: true,
            fixtures: [],
          }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  afterEach(() => {
    consoleError.mockRestore();
    consoleWarn.mockRestore();
    vi.clearAllMocks();
  });

  it('/ops/policy-simulator - should render without console errors', () => {
    render(
      <BrowserRouter>
        <PolicySimulator />
      </BrowserRouter>
    );

    // Check for console errors
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it('/ops/policy-simulator - should render with MemoryRouter', () => {
    render(
      <MemoryRouter initialEntries={['/ops/policy-simulator']}>
        <PolicySimulator />
      </MemoryRouter>
    );

    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it('PolicySimulator - should not produce warnings during mount/unmount cycle', () => {
    const { unmount } = render(
      <BrowserRouter>
        <PolicySimulator />
      </BrowserRouter>
    );

    // Unmount to check for cleanup warnings
    unmount();

    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it('PolicySimulator - should handle multiple renders without errors', () => {
    const { rerender } = render(
      <BrowserRouter>
        <PolicySimulator />
      </BrowserRouter>
    );

    // Re-render multiple times
    rerender(
      <BrowserRouter>
        <PolicySimulator />
      </BrowserRouter>
    );

    rerender(
      <BrowserRouter>
        <PolicySimulator />
      </BrowserRouter>
    );

    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });
});
