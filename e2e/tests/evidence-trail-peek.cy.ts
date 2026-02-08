describe('Evidence Trail Peek', () => {
  it('shows minimized view with exactly 3 verifiable claims', () => {
    cy.intercept('POST', '/api/nl2cypher', {
      statusCode: 200,
      body: {
        ast: { id: 'answer-1' },
        cypher: 'MATCH (n) RETURN n LIMIT 5',
        rationale: [],
        estimatedCost: 1,
        isValid: true,
      },
    }).as('nl2cypher');

    cy.intercept('GET', '/api/evidence-index*', {
      statusCode: 200,
      body: {
        timeline: [
          {
            id: 'claim-1',
            type: 'claim',
            timestamp: '2026-02-07T10:00:00Z',
            label: 'Claim 1',
          },
        ],
        claimCount: 3,
        evidenceCount: 3,
      },
    }).as('evidenceIndex');

    cy.intercept('GET', '/api/evidence-top*', {
      statusCode: 200,
      body: {
        artifacts: [
          {
            id: 'artifact-1',
            artifactType: 'sbom',
            location: 'https://example.com/evidence/1',
            createdAt: '2026-02-07T10:00:00Z',
            preview: 'Preview',
          },
        ],
      },
    }).as('evidenceTop');

    cy.intercept('GET', '/api/claim-ranking*', {
      statusCode: 200,
      body: {
        claims: [
          {
            id: 'claim-1',
            content: 'Claim 1',
            confidence: 0.9,
            claimType: 'factual',
            extractedAt: null,
            verifiabilityScore: 1.0,
            badges: [{ kind: 'SBOM', href: '/api/provenance-beta/evidence/evidence-1' }],
            supporting: [],
          },
          {
            id: 'claim-2',
            content: 'Claim 2',
            confidence: 0.85,
            claimType: 'factual',
            extractedAt: null,
            verifiabilityScore: 0.95,
            badges: [{ kind: 'Attestation', href: '/api/provenance-beta/evidence/evidence-2' }],
            supporting: [],
          },
          {
            id: 'claim-3',
            content: 'Claim 3',
            confidence: 0.8,
            claimType: 'factual',
            extractedAt: null,
            verifiabilityScore: 0.9,
            badges: [{ kind: 'Test', href: '/api/provenance-beta/evidence/evidence-3' }],
            supporting: [],
          },
        ],
      },
    }).as('claimRanking');

    cy.intercept('POST', '/api/monitoring/telemetry/events', { statusCode: 200 }).as('telemetry');

    cy.visit('/copilot', {
      onBeforeLoad(win) {
        (win as any).__SUMMIT_FEATURE_FLAGS__ = { evidenceTrailPeek: true };
      },
    });

    cy.get('textarea').first().type('What links A and B?');
    cy.contains('button', 'Generate Cypher').click();
    cy.wait('@nl2cypher');

    cy.get('[data-testid="evidence-trail-trigger"]').click();
    cy.wait(['@evidenceIndex', '@evidenceTop', '@claimRanking']);

    cy.get('[data-testid="evidence-trail-claim"]').should('have.length', 3);
    cy.get('[data-testid="evidence-trail-badge"]').should('have.length', 3);
  });
});
