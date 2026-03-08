"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginPage = void 0;
const BasePage_1 = require("./BasePage");
class LoginPage extends BasePage_1.BasePage {
    emailInput;
    passwordInput;
    submitButton;
    errorMessage;
    constructor(page) {
        super(page, '/login');
        this.emailInput = page.locator('#email');
        this.passwordInput = page.locator('#password');
        this.submitButton = page.locator('button[type="submit"]');
        this.errorMessage = page.locator('.text-red-300'); // Based on the class used for error message
    }
    async login(email, password) {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.submitButton.click();
    }
    async getErrorMessageText() {
        if (await this.errorMessage.isVisible()) {
            return await this.errorMessage.innerText();
        }
        return null;
    }
}
exports.LoginPage = LoginPage;
