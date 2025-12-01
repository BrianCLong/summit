describe('Dashboard Data Loading', () => {
  beforeEach(() => {
    // Simulate login
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should load key metrics', () => {
    cy.intercept('GET', '/api/metrics').as('getMetrics');
    cy.visit('/dashboard');
    cy.wait('@getMetrics');

    cy.get('[data-testid="metric-card"]').should('have.length.at.least', 1);
  });
});
