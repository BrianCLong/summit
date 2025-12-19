import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AuditTimeline from './AuditTimeline';

function createMockResponse(data: unknown, ok = true) {
  return {
    ok,
    json: async () => data,
  } as Response;
}

describe('AuditTimeline', () => {
  it('renders deep links for receipts and policy decisions', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      createMockResponse({
        records: [
          {
            id: 'rec-1',
            correlationId: 'corr-123',
            summary: 'Receipt captured',
            occurredAt: '2024-01-01T00:00:00.000Z',
            receiptUrl: 'https://example.com/receipt/rec-1',
            policyDecisionUrl: 'https://example.com/policy/rec-1',
          },
        ],
      }),
    );

    render(
      <AuditTimeline correlationIds={['corr-123']} fetcher={fetcher} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('timeline-entry-rec-1')).toBeInTheDocument();
    });

    expect(screen.getByText('View receipt')).toHaveAttribute(
      'href',
      'https://example.com/receipt/rec-1',
    );
    expect(screen.getByText('Policy decision')).toHaveAttribute(
      'href',
      'https://example.com/policy/rec-1',
    );
  });

  it('shows fallbacks when data is missing', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      createMockResponse({
        records: [
          {
            id: 'rec-2',
            correlationId: 'corr-456',
          },
        ],
      }),
    );

    render(
      <AuditTimeline correlationIds={['corr-456']} fetcher={fetcher} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('timeline-entry-rec-2')).toBeInTheDocument();
    });

    expect(screen.getByText('Time not recorded')).toBeInTheDocument();
    expect(screen.getByText('No summary available')).toBeInTheDocument();
    expect(
      screen.getByTestId('receipt-unavailable'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('policy-unavailable'),
    ).toBeInTheDocument();
  });
});
