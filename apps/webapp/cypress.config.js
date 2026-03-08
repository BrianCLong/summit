"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cypress_1 = require("cypress");
exports.default = (0, cypress_1.defineConfig)({
    e2e: {
        baseUrl: process.env.WEBAPP_BASE_URL ||
            `http://localhost:${process.env.WEBAPP_PORT || 5173}`,
        specPattern: 'cypress/e2e/**/*.cy.{ts,tsx}',
        supportFile: 'cypress/support/e2e.ts',
        video: false,
    },
});
