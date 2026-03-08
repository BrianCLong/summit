"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.test = void 0;
const test_1 = require("@playwright/test");
const LoginPage_1 = require("../pages/LoginPage");
exports.test = test_1.test.extend({
    loginPage: async ({ page }, use) => {
        const loginPage = new LoginPage_1.LoginPage(page);
        await use(loginPage);
    },
});
var test_2 = require("@playwright/test");
Object.defineProperty(exports, "expect", { enumerable: true, get: function () { return test_2.expect; } });
