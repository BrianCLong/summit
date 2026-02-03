import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ErrorFallback } from '../ErrorFallback';
import { logErrorEvidence } from '@/lib/evidenceLogger';
import { useResilience } from '@/contexts/ResilienceContext';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/lib/evidenceLogger', () => ({
  logErrorEvidence: vi.fn(),
}));

vi.mock('@/contexts/ResilienceContext', () => ({
  useResilience: vi.fn(),
}));

describe('ErrorFallback with Agentic Recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Ask Copilot button when agentic recovery is enabled', () => {
    (useResilience as any).mockReturnValue({
      policy: { maxRetries: 3, retryBackoffMs: 2000, fallbackStrategy: 'agentic', reportErrors: true },
      agenticRecoveryEnabled: true,
    });

    render(<ErrorFallback error={new Error("Test")} />);

    expect(screen.getByText('Ask Copilot')).toBeInTheDocument();
  });

  it('hides Ask Copilot button when agentic recovery is disabled', () => {
    (useResilience as any).mockReturnValue({
      policy: { maxRetries: 3, retryBackoffMs: 2000, fallbackStrategy: 'simple', reportErrors: true },
      agenticRecoveryEnabled: false,
    });

    render(<ErrorFallback error={new Error("Test")} />);

    expect(screen.queryByText('Ask Copilot')).not.toBeInTheDocument();
  });

  it('logs evidence on mount if policy allows', () => {
    (useResilience as any).mockReturnValue({
      policy: { maxRetries: 3, retryBackoffMs: 2000, fallbackStrategy: 'simple', reportErrors: true },
      agenticRecoveryEnabled: false,
    });

    const err = new Error("Evidence Test");
    render(<ErrorFallback error={err} />);

    expect(logErrorEvidence).toHaveBeenCalledWith(err);
  });

  it('does not log evidence if policy disables it', () => {
    (useResilience as any).mockReturnValue({
      policy: { maxRetries: 3, retryBackoffMs: 2000, fallbackStrategy: 'simple', reportErrors: false },
      agenticRecoveryEnabled: false,
    });

    render(<ErrorFallback error={new Error("Test")} />);

    expect(logErrorEvidence).not.toHaveBeenCalled();
  });

  it('triggers diagnosis when Ask Copilot is clicked', async () => {
    (useResilience as any).mockReturnValue({
      policy: { maxRetries: 3, retryBackoffMs: 2000, fallbackStrategy: 'agentic', reportErrors: true },
      agenticRecoveryEnabled: true,
    });

    render(<ErrorFallback error={new Error("Test")} />);

    const button = screen.getByText('Ask Copilot');
    fireEvent.click(button);

    expect(screen.getByText('Analyzing...')).toBeInTheDocument();

    // Wait for the simulated timeout
    await waitFor(() => {
      expect(screen.getByText(/Copilot Diagnosis/)).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
