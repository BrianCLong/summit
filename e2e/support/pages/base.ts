// e2e/support/pages/base.ts
export class BasePage {
  visit(path: string) {
    cy.visit(path);
  }

  waitForUrl(urlPattern: string) {
    cy.url().should('include', urlPattern);
  }
}
