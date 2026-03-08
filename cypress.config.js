"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cypress_1 = require("cypress");
exports.default = (0, cypress_1.defineConfig)({
    e2e: {
        baseUrl: 'http://localhost:3000', // Assuming standard dev port
        specPattern: 'e2e/tests/**/*.cy.ts',
        supportFile: 'e2e/support/e2e.ts',
        fixturesFolder: 'e2e/fixtures',
        video: false,
        screenshotOnRunFailure: true,
        defaultCommandTimeout: 10000,
        retries: {
            runMode: 2,
            openMode: 0,
        },
        setupNodeEvents(on, config) {
            // implement node event listeners here
        },
    },
});
