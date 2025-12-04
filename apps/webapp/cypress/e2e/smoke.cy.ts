describe('Webapp Cypress smoke', () => {
  beforeEach(() => {
    cy.bootstrapWebapp();
  });

  it('shows panes and selection summary', () => {
    cy.get('[data-testid="graph-pane"]').should('be.visible');
    cy.get('[data-testid="timeline-pane"]').should('be.visible');
    cy.get('[data-testid="map-pane"]').should('be.visible');
    cy.get('[data-testid="selection-summary"]').should('contain', 'Selected node');
  });

  it('updates selection summary when dispatching selection', () => {
    cy.window().its('store').then((store: any) => {
      store.dispatch({ type: 'selection/selectNode', payload: 'node-1' });
    });
    cy.get('[data-testid="selected-node-label"]').should('contain', 'node-1');
  });
});
