import { LoginPage } from '../support/pages/login';

describe('User Registration and Login Flow', () => {
  const loginPage = new LoginPage();

  it('should successfully log in with valid credentials', () => {
    loginPage.visit();
    loginPage.fillEmail('test@example.com');
    loginPage.fillPassword('password123');
    loginPage.submit();

    // Verify redirection to dashboard
    cy.url().should('include', '/dashboard');
    cy.get('h1').should('contain', 'Dashboard');
  });

  it('should show error on invalid credentials', () => {
    loginPage.visit();
    loginPage.fillEmail('wrong@example.com');
    loginPage.fillPassword('wrongpassword');
    loginPage.submit();

    cy.contains('Invalid credentials').should('be.visible');
  });
});
