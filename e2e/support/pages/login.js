"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginPage = void 0;
const base_1 = require("./base");
class LoginPage extends base_1.BasePage {
    visit() {
        super.visit('/login');
    }
    fillEmail(email) {
        cy.get('input[name="email"]').type(email);
    }
    fillPassword(password) {
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
exports.LoginPage = LoginPage;
