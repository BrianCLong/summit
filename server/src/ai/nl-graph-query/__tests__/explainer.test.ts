import { buildQueryExplanation } from '../explainer.js';

describe('buildQueryExplanation', () => {
  const baseCypher =
    'MATCH (p:Person)-[:ASSOCIATED_WITH]->(o:Organization) WHERE o.type = $type RETURN p, o';

  it('creates rationale and evidence from core clauses with strong confidence', () => {
    const explanation = buildQueryExplanation(baseCypher, {
      warnings: [],
      estimatedCost: 'low',
    });

    expect(explanation.summary).toBe('Queries the graph for matching entities');
    expect(explanation.rationale).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Identifying graph pattern 1'),
        'Applying filters to narrow the candidate set.',
        'Selecting outputs relevant to the investigative question.',
        'Parameterizing inputs to keep execution safe and repeatable.',
      ]),
    );
    expect(explanation.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'MATCH clause' }),
        expect.objectContaining({ source: 'WHERE clause' }),
        expect.objectContaining({ source: 'RETURN clause' }),
        expect.objectContaining({ source: 'Parameters', snippet: '$type' }),
      ]),
    );
    expect(explanation.confidence).toBe(0.92);
  });

  it('reduces confidence proportionally when warnings are present', () => {
    const warningExplanation = buildQueryExplanation(baseCypher, {
      warnings: ['warn 1', 'warn 2', 'warn 3'],
      estimatedCost: 'medium',
    });

    expect(warningExplanation.confidence).toBeCloseTo(0.71, 2);
  });

  it('caps the maximum warning penalty to protect confidence floor', () => {
    const highWarningExplanation = buildQueryExplanation(baseCypher, {
      warnings: Array(10).fill('issue'),
      estimatedCost: 'very-high',
    });

    expect(highWarningExplanation.confidence).toBe(0.57);
  });
});
