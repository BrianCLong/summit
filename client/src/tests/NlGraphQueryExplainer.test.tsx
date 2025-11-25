import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NlGraphQueryExplainer from '../components/ai/NlGraphQueryExplainer';

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
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    }) as jest.Mock;
    (window as any).__telemetry = { nlGraphExplanation: [] };
  });

  it('renders explanation details and records telemetry', async () => {
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

    expect((window as any).__telemetry.nlGraphExplanation.length).toBeGreaterThan(0);
    expect(screen.getByText(/Generated Cypher/i)).toBeInTheDocument();
  });
});
