"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference types="vitest" />
const config_1 = require("vitest/config");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
const path_1 = __importDefault(require("path"));
exports.default = (0, config_1.defineConfig)({
    plugins: [(0, plugin_react_1.default)()],
    resolve: {
        alias: {
            '@': path_1.default.resolve(__dirname, './src'),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/setupTests.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['json-summary'],
            thresholds: {
                global: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80,
                },
            },
        },
        exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', 'tests/**', '**/TimelineRail.test.tsx', '**/EntityDrawer.test.tsx', '**/MaestroRunConsole.test.tsx'],
        include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    },
});
