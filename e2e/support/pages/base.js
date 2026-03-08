"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePage = void 0;
// e2e/support/pages/base.ts
class BasePage {
    visit(path) {
        cy.visit(path);
    }
    waitForUrl(urlPattern) {
        cy.url().should('include', urlPattern);
    }
}
exports.BasePage = BasePage;
