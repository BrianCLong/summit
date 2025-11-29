import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NlGraphQueryExplainer from '../NlGraphQueryExplainer';

describe('NlGraphQueryExplainer', () => {
  const mockResponse = {
    cypher: 'MATCH (p:Person)-[:ASSOCIATED_WITH]->(o:Organization) RETURN p, o LIMIT 5',
    explanationDetails: {
      summary: 'Finds people and organizations',
      rationale: ['Identifying graph pattern 1 to satisfy the request.'],
      evidence: [
        {
          source: 'MATCH clause',
          snippet: '(p:Person)-[:ASSOCIATED_WITH]->(o:Organization)',
          reason: 'Defines the core entities and relationships to investigate.',
        },
      ],
      confidence: 0.87,
    },
    estimatedCost: {
      nodesScanned: 10,
      edgesScanned: 20,
      costClass: 'low',
      estimatedTimeMs: 5,
      estimatedMemoryMb: 2,
      costDrivers: ['uses index'],
    },
    explanation: 'Finds patterns matching multiple graph structures',
    requiredParameters: [],
    isSafe: true,
    warnings: [],
    queryId: '123',
    timestamp: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    (window as any).__telemetry = { nlGraphExplanation: [] };
  });

  it('renders explanation details, toggles panels, and records telemetry', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    }) as jest.Mock;

    render(<NlGraphQueryExplainer />);

    fireEvent.change(screen.getByLabelText(/ask the copilot/i), {
      target: { value: 'Find relationships' },
    });
    fireEvent.click(screen.getByText(/explain/i));

    await waitFor(() =>
      expect(screen.getByTestId('confidence-chip').textContent).toContain('Confidence'),
    );

    expect(screen.getAllByTestId('rationale-item')).toHaveLength(1);
    expect(screen.getAllByTestId('evidence-item')).toHaveLength(1);

    fireEvent.click(screen.getByText(/Evidence with sources/i));

    expect((window as any).__telemetry.nlGraphExplanation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: 'explanation_generated' }),
        expect.objectContaining({ section: 'evidence', event: 'explanation_toggled' }),
      ]),
    );
    expect(screen.getByText(/Generated Cypher/i)).toBeInTheDocument();
  });

  it('shows error state when compile fails and avoids telemetry', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ code: 'BAD_REQUEST', message: 'Unable to compile prompt' }),
    }) as jest.Mock;

    render(<NlGraphQueryExplainer />);

    fireEvent.click(screen.getByText(/explain/i));

    await waitFor(() =>
      expect(screen.getByTestId('compile-error')).toHaveTextContent('Unable to compile prompt'),
    );

    expect((window as any).__telemetry.nlGraphExplanation).toHaveLength(0);
    expect(screen.queryByText(/Generated Cypher/i)).not.toBeInTheDocument();
  });

  it('renders fallback messaging when explanation details are missing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockResponse,
        explanationDetails: {
          summary: 'Fallback summary',
          rationale: [],
          evidence: [],
          confidence: 0.6,
        },
      }),
    }) as jest.Mock;

    render(<NlGraphQueryExplainer />);

    fireEvent.click(screen.getByText(/explain/i));

    await waitFor(() => expect(screen.getByText(/No rationale provided/i)).toBeInTheDocument());
    expect(screen.getByText(/No evidence captured/i)).toBeInTheDocument();
  });

  it('disables explain when prompt is blank and shows loading indicator while pending', async () => {
    jest.useFakeTimers();
    const jsonPromise = new Promise((resolve) => setTimeout(() => resolve(mockResponse), 20));

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => jsonPromise,
    }) as jest.Mock;

    render(<NlGraphQueryExplainer />);

    fireEvent.change(screen.getByLabelText(/ask the copilot/i), {
      target: { value: '   ' },
    });
    expect(screen.getByText(/explain/i)).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/ask the copilot/i), {
      target: { value: 'Explain loading state' },
    });
    fireEvent.click(screen.getByText(/explain/i));

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    await act(async () => {
      jest.runAllTimers();
      await jsonPromise;
    });

    await waitFor(() => expect(screen.getByText(/Generated Cypher/i)).toBeInTheDocument());
    jest.useRealTimers();
  });
});
