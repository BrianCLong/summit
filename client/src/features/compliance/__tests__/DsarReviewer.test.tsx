import { jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { DsarReviewer, type DsarReviewRecord } from '../DsarReviewer';

describe('DsarReviewer', () => {
  const baseRequests: DsarReviewRecord[] = [
    {
      id: 'req-1',
      subjectId: 'sub-1',
      tenantId: 'tenant-1',
      operation: 'export',
      status: 'completed',
      submittedAt: '2025-09-01T00:00:00.000Z',
      replayAvailable: true,
      exportLocation: 's3://bucket/req-1.json',
    },
    {
      id: 'req-2',
      subjectId: 'sub-2',
      tenantId: 'tenant-2',
      operation: 'delete',
      status: 'pending',
      submittedAt: '2025-09-02T12:00:00.000Z',
      replayAvailable: false,
      proofs: [{ connector: 'postgres', type: 'deletion', hash: 'abc12345' }],
    },
  ];

  it('renders requests and surfaces replay actions', () => {
    const onReplay = jest.fn();
    render(<DsarReviewer requests={baseRequests} onReplay={onReplay} />);

    expect(screen.getByText('DSAR Review Queue')).toBeInTheDocument();
    expect(screen.getByText('sub-1')).toBeInTheDocument();
    expect(screen.getByText('sub-2')).toBeInTheDocument();

    const replayButton = screen.getByRole('button', {
      name: /Replay DSAR request req-1/i,
    });
    fireEvent.click(replayButton);
    expect(onReplay).toHaveBeenCalledWith('req-1');
  });

  it('shows request details when selected', () => {
    render(<DsarReviewer requests={baseRequests} />);

fireEvent.click(screen.getByText('sub-2'));
    const idRow = screen.getByText(/Request ID:/).parentElement;
    expect(idRow).toHaveTextContent('req-2');
    expect(screen.getByText(/Proofs/)).toBeInTheDocument();
  });
});
