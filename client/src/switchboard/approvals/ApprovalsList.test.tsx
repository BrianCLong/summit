import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApprovalsList from './ApprovalsList';

const createFetchResponse = (data: unknown, ok = true) =>
  Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(typeof data === 'string' ? data : 'Error'),
  } as Response);

describe('ApprovalsList', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('shows loading state while fetching', () => {
    global.fetch = jest.fn(
      () =>
        new Promise(() => {
          // Never resolve to keep loading visible for assertion
        }),
    ) as unknown as typeof fetch;

    render(<ApprovalsList />);

    expect(screen.getByText(/loading approvals/i)).toBeInTheDocument();
  });

  it('renders empty state when no approvals are returned', async () => {
    global.fetch = jest.fn(() => createFetchResponse([])) as unknown as typeof fetch;

    render(<ApprovalsList />);

    await waitFor(() =>
      expect(screen.getByText(/no pending approvals/i)).toBeInTheDocument(),
    );
  });

  it('renders error state when the queue fails to load', async () => {
    global.fetch = jest.fn(() => createFetchResponse('Service unavailable', false)) as
      typeof fetch;

    render(<ApprovalsList />);

    await waitFor(() =>
      expect(screen.getByText(/failed to load approvals/i)).toBeInTheDocument(),
    );
  });

  it('requires rationale before approving or denying', async () => {
    const queue = [
      {
        id: 'appr-1',
        requester: 'alice',
        operation: 'Pause production pipeline',
        submittedAt: '2025-01-01T00:00:00Z',
        obligations: ['Audit receipt'],
        riskFlags: ['High blast radius'],
      },
    ];

    global.fetch = jest.fn(() => createFetchResponse(queue)) as unknown as typeof fetch;

    render(<ApprovalsList />);

    await waitFor(() => expect(screen.getByText(/pause production pipeline/i)).toBeVisible());

    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);

    expect(screen.getByText(/rationale is required/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/rationale/i), 'Reviewed by SRE.');
    fireEvent.click(screen.getByRole('button', { name: /deny/i }));

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
