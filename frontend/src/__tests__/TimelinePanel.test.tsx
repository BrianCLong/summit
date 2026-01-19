import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import TimelinePanel from '../TimelinePanel';

describe('TimelinePanel', () => {
  it('renders agent events with confidence', () => {
    const events = [
      { id: '1', action: 'Decoy', confidence: 0.9, result: 'ok' },
    ];
    render(<TimelinePanel events={events} />);
    expect(screen.getByText(/Decoy/)).toBeInTheDocument();

    // UX Verification
    expect(screen.getByText('90%')).toBeInTheDocument();
    const meter = screen.getByRole('meter');
    expect(meter).toBeInTheDocument();
    expect(meter).toHaveAttribute('aria-valuenow', '90');
    expect(meter).toHaveAttribute('aria-label', 'Confidence: 90%');
  });

  it('renders empty state', () => {
    render(<TimelinePanel events={[]} />);
    expect(screen.getByText(/No events recorded yet/)).toBeInTheDocument();
  });
});
