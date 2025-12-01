import { BasePage } from './base';

export class LoginPage extends BasePage {
  visit() {
    super.visit('/login');
  }

  fillEmail(email: string) {
    cy.get('input[name="email"]').type(email);
  }

  fillPassword(password: string) {
    cy.get('input[name="password"]').type(password);
  }

  submit() {
    cy.get('button[type="submit"]').click();
  }

  login(email, password) {
    this.visit();
    this.fillEmail(email);
    this.fillPassword(password);
    this.submit();
  }
}
