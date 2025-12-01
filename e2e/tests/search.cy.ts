describe('Search Functionality', () => {
    beforeEach(() => {
        cy.login('test@example.com', 'password123'); // Assuming custom command or similar logic
    });

    it('should return results for a valid query', () => {
        cy.visit('/search');
        cy.get('input[name="q"]').type('target{enter}');
        cy.get('[data-testid="search-result"]').should('exist');
    });

    it('should show empty state for no results', () => {
        cy.visit('/search');
        cy.get('input[name="q"]').type('nonexistenttarget12345{enter}');
        cy.contains('No results found').should('be.visible');
    });
});
