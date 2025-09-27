import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PdaDashboard } from '../PdaDashboard';

describe('PdaDashboard', () => {
  const apiBaseUrl = 'http://localhost:8086';
  const alertsPayload = [
    {
      event: {
        id: 'evt-1',
        consentId: 'consent-a',
        declaredPurpose: 'analytics',
        endpoint: '/collect',
        endpointPurpose: 'marketing',
        observedAt: '2024-01-01T00:00:00Z',
      },
      verdict: {
        drift: true,
        suppressed: false,
        owner: 'growth-ops',
        reason: 'purpose analytics not allowed on marketing',
        falsePositive: false,
        trace: {
          eventId: 'evt-1',
          contractId: 'consent-a',
          policyId: 'marketing',
          verdict: 'drift',
          suppressed: false,
          steps: [
            { description: 'allowed purposes', evidence: 'marketing' },
            { description: 'compare', evidence: 'purpose analytics not allowed on marketing' },
          ],
          policy: {
            endpointPurpose: 'marketing',
            allowedPurposes: ['marketing'],
            owners: ['growth-ops'],
            suppressionWindow: 120000000000,
          },
        },
      },
      raisedAt: '2024-01-01T00:00:00Z',
    },
  ];

  const healthPayload = { status: 'ok', time: '2024-01-01T00:00:00Z', fpRate: 0.0, contracts: 1 };
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock | undefined)?.mockReset?.();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(alertsPayload), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(healthPayload), { status: 200 }));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it('renders alerts table with explain action', async () => {
    render(<PdaDashboard apiBaseUrl={apiBaseUrl} pollIntervalMs={60000} />);

    await waitFor(() => expect(screen.getByText('evt-1')).toBeInTheDocument());
    expect(screen.getByTestId('pda-health-status')).toHaveTextContent('Status: ok');
  });

  it('fetches explanation when requested', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(alertsPayload), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(healthPayload), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(alertsPayload[0].verdict.trace), { status: 200 }));

    render(<PdaDashboard apiBaseUrl={apiBaseUrl} pollIntervalMs={60000} />);
    await waitFor(() => expect(screen.getByText('evt-1')).toBeInTheDocument());

    const explainButton = screen.getByRole('button', { name: 'Explain' });
    fireEvent.click(explainButton);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/explain?eventId=evt-1')));
    expect(await screen.findByText(/Explainability Trace/)).toBeInTheDocument();
    expect(screen.getByText(/purpose analytics not allowed on marketing/)).toBeInTheDocument();
  });
});

