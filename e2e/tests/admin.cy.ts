describe('Admin Configuration Panel', () => {
    beforeEach(() => {
        cy.login('admin@example.com', 'admin123');
    });

    it('should allow updating settings', () => {
        cy.visit('/admin/settings');
        cy.get('input[name="siteName"]').clear().type('New Site Name');
        cy.get('button').contains('Save').click();
        cy.contains('Settings saved').should('be.visible');
    });
});
