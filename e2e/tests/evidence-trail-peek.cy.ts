describe('EvidenceTrailPeek', () => {
  it('minimized shows exactly 3 claims with deterministic badges', () => {
    const now = new Date().toISOString();

    cy.intercept('GET', '/users/me', {
      id: 'user-1',
      name: 'Analyst',
      email: 'analyst@example.com',
    }).as('currentUser');

    cy.intercept('POST', '/api/feature-flags/evaluate', {
      'features.evidenceTrailPeek': true,
    }).as('featureFlags');

    cy.intercept('GET', '/api/claim-ranking*', {
      claims: [
        { claim_id: 'c1', text: 'Claim 1', verifiability: 0.9, supporting: ['e1'], delta: 0.2 },
        { claim_id: 'c2', text: 'Claim 2', verifiability: 0.8, supporting: ['e2'], delta: 0.1 },
        { claim_id: 'c3', text: 'Claim 3', verifiability: 0.7, supporting: ['e3'], delta: 0.05 },
        { claim_id: 'c4', text: 'Claim 4', verifiability: 0.6, supporting: ['e4'], delta: 0.01 },
      ],
    }).as('claims');

    cy.intercept('GET', '/api/evidence-index*', {
      items: [
        { evidence_id: 'e1', title: 'Ev1', url: '/evidence/e1', ts: now, weight: 1, badges: [{ kind: 'Test', href: '/evidence/e1/badges.json' }] },
        { evidence_id: 'e2', title: 'Ev2', url: '/evidence/e2', ts: now, weight: 1, badges: [{ kind: 'SBOM', href: '/evidence/e2/badges.json' }] },
        { evidence_id: 'e3', title: 'Ev3', url: '/evidence/e3', ts: now, weight: 1, badges: [{ kind: 'Provenance', href: '/evidence/e3/badges.json' }] },
        { evidence_id: 'e4', title: 'Ev4', url: '/evidence/e4', ts: now, weight: 1, badges: [{ kind: 'Attestation', href: '/evidence/e4/badges.json' }] },
      ],
    }).as('timeline');

    cy.intercept('GET', '/api/evidence-top*', { items: [] }).as('top');

    cy.visit('/debug/answer/a1', {
      onBeforeLoad(win) {
        win.localStorage.setItem('auth_token', 'test-token');
      },
    });

    cy.wait('@featureFlags');
    cy.wait('@claims');
    cy.wait('@timeline');
    cy.wait('@top');

    cy.contains('Answer-Surface Minimizer').click();
    cy.get('[data-testid="evidence-trail-peek"] .claim').should('have.length', 3);
    cy.get('[data-testid="evidence-trail-peek"] .claim .badge').should('have.length.at.least', 3);
  });
});
