"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        coverage: { reporter: ['text', 'lcov', 'json-summary'] },
        include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
        exclude: ['**/dist/**', '**/build/**', '**/node_modules/**'],
        globals: true,
        reporters: ['default'],
        passWithNoTests: false,
    },
});
