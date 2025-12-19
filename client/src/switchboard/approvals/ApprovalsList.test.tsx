import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import ApprovalsList from './ApprovalsList';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

const mockResponse = (data: unknown, ok = true) => ({
  ok,
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
});

const createDeferred = () => {
  let resolve: (value: unknown) => void = () => {};
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe('ApprovalsList', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('shows loading state while fetching approvals', async () => {
    const deferred = createDeferred();
    fetchMock.mockReturnValueOnce(deferred.promise as any);

    render(<ApprovalsList />);

    expect(await screen.findByLabelText(/loading approvals/i)).toBeInTheDocument();

    await act(async () => {
      deferred.resolve(mockResponse([]));
    });
  });

  it('renders error state when the queue cannot load', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse('server unavailable', false));

    render(<ApprovalsList />);

    expect(await screen.findByText(/server unavailable/i)).toBeInTheDocument();
  });

  it('renders empty state when there are no pending approvals', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse([]));

    render(<ApprovalsList />);

    expect(
      await screen.findByText(/no pending approvals in the queue/i),
    ).toBeInTheDocument();
  });

  it('submits an approval with rationale and updates the queue optimistically', async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockResponse([
          {
            id: 'appr-1',
            requester_id: 'alice',
            status: 'pending',
            action: 'maestro_run',
            reason: 'Run post-incident automation',
            created_at: '2024-01-01T00:00:00Z',
            payload: { obligations: ['Notify service owner'], risk_flags: ['Production impact'] },
          },
        ]),
      )
      .mockResolvedValueOnce(
        mockResponse({
          approval: {
            id: 'appr-1',
            status: 'approved',
            decision_reason: 'Looks good',
          },
        }),
      )
      .mockResolvedValueOnce(mockResponse([]));

    render(<ApprovalsList />);

    expect(
      await screen.findByRole('heading', { name: /Run post-incident automation/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Production impact/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/rationale/i), {
      target: { value: 'Looks good' },
    });
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/approvals/appr-1/approve',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reason: 'Looks good' }),
        }),
      ),
    );

    await waitFor(() =>
      expect(
        screen.getByText(/no pending approvals in the queue/i),
      ).toBeInTheDocument(),
    );
  });
});
