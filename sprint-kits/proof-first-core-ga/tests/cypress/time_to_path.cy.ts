describe('Time to path discovery', () => {
  it('reduces baseline by threshold', () => {
    cy.visit('/case/demo/explore');
    cy.clock();
    cy.get('[data-testid=prompt]').type('show relationships from A to B');
    cy.get('[data-testid=preview-run]').click();
    cy.get('[data-testid=graph]').should('be.visible');
    // TODO: assert timer budget once baseline is recorded
  });
});
