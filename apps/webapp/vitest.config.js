"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
const path_1 = __importDefault(require("path"));
exports.default = (0, config_1.defineConfig)({
    plugins: [(0, plugin_react_1.default)()],
    resolve: {
        alias: {
            react: path_1.default.resolve(__dirname, '../../node_modules/react'),
            'react-dom': path_1.default.resolve(__dirname, '../../node_modules/react-dom'),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        exclude: ['tests/**', 'node_modules/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            thresholds: {
                global: {
                    lines: 80,
                    functions: 80,
                    branches: 80,
                    statements: 80,
                },
            },
        },
    },
});
