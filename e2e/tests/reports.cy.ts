describe('Report Generation', () => {
    beforeEach(() => {
        cy.login('test@example.com', 'password123');
    });

    it('should generate and export a report', () => {
        cy.visit('/reports');
        cy.get('button').contains('Generate Report').click();
        cy.contains('Report generated successfully').should('be.visible');
        cy.get('a').contains('Download').should('have.attr', 'href');
    });
});
