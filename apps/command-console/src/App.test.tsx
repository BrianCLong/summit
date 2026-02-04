import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { CommandConsoleSnapshot } from './types';

const mockSnapshot: CommandConsoleSnapshot = {
  generatedAt: '2024-01-01T00:00:00.000Z',
  gaGate: {
    overall: 'pass',
    lastRun: '2024-01-01T00:00:00.000Z',
    details: [{ component: 'package-json', status: 'pass', message: 'ok' }],
  },
  ci: {
    branch: 'main',
    status: 'pass',
    commit: 'abc123',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  slo: {
    compliance: 0.99,
    window: '30d',
    errorBudgetRemaining: 0.92,
    burnRate: 0.45,
  },
  llm: {
    aggregate: { tokens: 200000, cost: 50, window: '7d' },
    tenants: [
      { tenantId: 'acme', tokens: 100000, cost: 25, rateLimitStatus: 'pass' },
      { tenantId: 'globex', tokens: 100000, cost: 25, rateLimitStatus: 'warning' },
    ],
  },
  dependencyRisk: {
    level: 'warning',
    issues: 2,
    lastScan: '2024-01-01T00:00:00.000Z',
    topRisks: ['outdated-core'],
  },
  evidence: {
    latestBundle: 'bundle-1',
    status: 'pass',
    artifacts: 3,
    lastGeneratedAt: '2024-01-01T00:00:00.000Z',
  },
  tenants: [
    { tenantId: 'acme', active: true, rateLimit: '5r/s', ingestionCap: '5k/hr', killSwitch: false },
    { tenantId: 'globex', active: true, rateLimit: '3r/s', ingestionCap: '2k/hr', killSwitch: true },
  ],
  incidents: {
    gaGateFailures: [],
    policyDenials: [],
    killSwitchActivations: [],
  },
};

describe('Command Console dashboard', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubEnv('VITE_COMMAND_CONSOLE_ENABLED', 'true');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSnapshot,
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    global.fetch = originalFetch;
  });

  it('renders health and tenant panels', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Summit Command Console/i)).toBeInTheDocument();
    });

    // Use exact match for "GA Gate" to avoid matching "GA Gate Failures"
    expect(screen.getByText('GA Gate')).toBeInTheDocument();
    expect(screen.getByText(/Tenant & Blast Radius/i)).toBeInTheDocument();
    // Multiple elements contain "acme" so check at least one exists
    expect(screen.getAllByText(/acme/).length).toBeGreaterThan(0);
    expect(screen.getByText(/LLM Tokens/)).toBeInTheDocument();
  });

  it('shows a helpful message when disabled', async () => {
    vi.stubEnv('VITE_COMMAND_CONSOLE_ENABLED', 'false');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Access blocked/i)).toBeInTheDocument();
    });
  });
});
