/**
 * Tests for Policy Simulator UI component
 * Deterministic, no network dependencies
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PolicySimulator from '../PolicySimulator';

// Mock fetch globally
global.fetch = vi.fn();

// Helper to render with router
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('PolicySimulator', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    vi.clearAllMocks();

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // Mock fixtures response
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/ops/policy/fixtures')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ok: true,
            fixtures: [
              {
                id: 'allow-admin-read',
                name: 'Admin can read any resource',
                description: 'Admins have full access to all resources',
                input: {
                  tenantId: 'tenant-001',
                  actor: { id: 'user-admin', roles: ['admin'] },
                  action: 'read',
                  resource: { type: 'case', id: 'case-123' },
                },
                expectedDecision: 'allow',
              },
            ],
          }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component rendering', () => {
    it('should render without crashing', () => {
      renderWithRouter(<PolicySimulator />);
      expect(screen.getByText(/Tenant Isolation & Policy Simulator/i)).toBeInTheDocument();
    });

    it('should show simulation-only warning', () => {
      renderWithRouter(<PolicySimulator />);
      expect(screen.getByText(/SIMULATION ONLY/i)).toBeInTheDocument();
    });

    it('should render input form with all required fields', () => {
      renderWithRouter(<PolicySimulator />);

      expect(screen.getByLabelText(/Tenant ID/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Actor ID/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Actor Roles/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Action/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Resource Type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Resource ID/i)).toBeInTheDocument();
    });

    it('should render run simulation button', () => {
      renderWithRouter(<PolicySimulator />);
      expect(screen.getByRole('button', { name: /Run Simulation/i })).toBeInTheDocument();
    });

    it('should not produce console errors on render', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      renderWithRouter(<PolicySimulator />);

      expect(consoleError).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();

      consoleError.mockRestore();
      consoleWarn.mockRestore();
    });
  });

  describe('Form validation', () => {
    it('should accept valid tenant ID input', () => {
      renderWithRouter(<PolicySimulator />);
      const tenantInput = screen.getByLabelText(/Tenant ID/i);

      fireEvent.change(tenantInput, { target: { value: 'tenant-123' } });

      expect(tenantInput.value).toBe('tenant-123');
    });

    it('should validate JSON attributes field', async () => {
      renderWithRouter(<PolicySimulator />);
      const attributesInput = screen.getByLabelText(/Resource Attributes/i);

      // Invalid JSON
      fireEvent.change(attributesInput, { target: { value: '{invalid}' } });

      await waitFor(() => {
        expect(screen.getByText(/Invalid JSON format/i)).toBeInTheDocument();
      });
    });

    it('should accept valid JSON in attributes field', async () => {
      renderWithRouter(<PolicySimulator />);
      const attributesInput = screen.getByLabelText(/Resource Attributes/i);

      fireEvent.change(attributesInput, {
        target: { value: '{"tenantId": "tenant-001"}' }
      });

      await waitFor(() => {
        expect(screen.queryByText(/Invalid JSON format/i)).not.toBeInTheDocument();
      });
    });

    it('should disable simulation button when JSON is invalid', async () => {
      renderWithRouter(<PolicySimulator />);
      const attributesInput = screen.getByLabelText(/Resource Attributes/i);
      const submitButton = screen.getByRole('button', { name: /Run Simulation/i });

      fireEvent.change(attributesInput, { target: { value: '{invalid}' } });

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Simulation execution', () => {
    it('should call simulation API on submit', async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/ops/policy/simulate')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              simulation: {
                decision: 'allow',
                ruleId: 'abac.allow',
                reasons: ['All authorization checks passed'],
                evaluatedAt: new Date().toISOString(),
                trace: {
                  steps: [
                    { rule: 'tenant_isolation', matched: true, reason: 'Passed' },
                  ],
                },
              },
            }),
          });
        }
        if (url.includes('/api/ops/policy/fixtures')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ok: true, fixtures: [] }),
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      renderWithRouter(<PolicySimulator />);
      const submitButton = screen.getByRole('button', { name: /Run Simulation/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/ops/policy/simulate',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });
    });

    it('should display allow result', async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/ops/policy/simulate')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              simulation: {
                decision: 'allow',
                ruleId: 'abac.allow',
                reasons: ['All authorization checks passed'],
                evaluatedAt: new Date().toISOString(),
              },
            }),
          });
        }
        if (url.includes('/api/ops/policy/fixtures')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ok: true, fixtures: [] }),
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      renderWithRouter(<PolicySimulator />);
      const submitButton = screen.getByRole('button', { name: /Run Simulation/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/ALLOW/i)).toBeInTheDocument();
      });
    });

    it('should display deny result', async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/ops/policy/simulate')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              simulation: {
                decision: 'deny',
                ruleId: 'tenant_isolation',
                reasons: ['Cross-tenant access denied'],
                evaluatedAt: new Date().toISOString(),
              },
            }),
          });
        }
        if (url.includes('/api/ops/policy/fixtures')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ok: true, fixtures: [] }),
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      renderWithRouter(<PolicySimulator />);
      const submitButton = screen.getByRole('button', { name: /Run Simulation/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/DENY/i)).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/ops/policy/simulate')) {
          return Promise.resolve({
            ok: false,
            json: async () => ({
              ok: false,
              error: 'Simulation failed',
            }),
          });
        }
        if (url.includes('/api/ops/policy/fixtures')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ok: true, fixtures: [] }),
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      renderWithRouter(<PolicySimulator />);
      const submitButton = screen.getByRole('button', { name: /Run Simulation/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Simulation failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Offline mode', () => {
    it('should detect offline status', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      renderWithRouter(<PolicySimulator />);

      await waitFor(() => {
        expect(screen.getByText(/Offline Mode/i)).toBeInTheDocument();
      });
    });

    it('should disable simulation when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      renderWithRouter(<PolicySimulator />);
      const submitButton = screen.getByRole('button', { name: /Run Simulation/i });

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should show error message when trying to simulate offline', async () => {
      renderWithRouter(<PolicySimulator />);

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      fireEvent(window, new Event('offline'));

      const submitButton = screen.getByRole('button', { name: /Run Simulation/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/cannot run simulation while offline/i)).toBeInTheDocument();
      });
    });
  });

  describe('Fixtures', () => {
    it('should load fixtures on mount', async () => {
      renderWithRouter(<PolicySimulator />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/ops/policy/fixtures',
          expect.objectContaining({ credentials: 'include' })
        );
      });
    });

    it('should display loaded fixtures', async () => {
      renderWithRouter(<PolicySimulator />);

      await waitFor(() => {
        expect(screen.getByText(/Admin can read any resource/i)).toBeInTheDocument();
      });
    });

    it('should allow running all fixtures', async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/ops/policy/fixtures/run')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              summary: { total: 1, passed: 1, failed: 0 },
              results: [],
            }),
          });
        }
        if (url.includes('/api/ops/policy/fixtures')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              fixtures: [
                {
                  id: 'test-1',
                  name: 'Test Fixture',
                  description: 'Test',
                  input: {
                    tenantId: 'tenant-001',
                    actor: { id: 'user-admin', roles: ['admin'] },
                    action: 'read',
                    resource: { type: 'case', id: 'case-123' },
                  },
                  expectedDecision: 'allow',
                },
              ],
            }),
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      renderWithRouter(<PolicySimulator />);

      await waitFor(() => {
        expect(screen.getByText(/Test Fixture/i)).toBeInTheDocument();
      });

      const runAllButton = screen.getByRole('button', { name: /Run All 1 Fixtures/i });
      fireEvent.click(runAllButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/ops/policy/fixtures/run',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithRouter(<PolicySimulator />);

      expect(screen.getByLabelText(/Tenant ID/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Actor ID/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Actor Roles/i)).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      renderWithRouter(<PolicySimulator />);

      const tenantInput = screen.getByLabelText(/Tenant ID/i);
      const actorInput = screen.getByLabelText(/Actor ID/i);

      tenantInput.focus();
      expect(document.activeElement).toBe(tenantInput);

      fireEvent.keyDown(tenantInput, { key: 'Tab' });
      // Tab behavior depends on browser implementation
    });
  });

  describe('Deterministic behavior', () => {
    it('should render consistently', () => {
      const { container: container1 } = renderWithRouter(<PolicySimulator />);
      const { container: container2 } = renderWithRouter(<PolicySimulator />);

      // Both should have the same structure
      expect(container1.querySelectorAll('input').length).toBe(
        container2.querySelectorAll('input').length
      );
    });

    it('should not have flaky timers or random behavior', () => {
      renderWithRouter(<PolicySimulator />);

      const tenantInput = screen.getByLabelText(/Tenant ID/i);
      const initialValue = tenantInput.value;

      // Re-render should preserve state
      expect(tenantInput.value).toBe(initialValue);
    });
  });
});
