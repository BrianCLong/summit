"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference types="vitest" />
const vite_1 = require("vite");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
exports.default = (0, vite_1.defineConfig)({
    plugins: [(0, plugin_react_1.default)()],
    server: {
        host: '0.0.0.0',
        port: 4173
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/setupTests.ts'],
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            'tests/**',
        ],
    },
});
