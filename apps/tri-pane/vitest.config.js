"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
exports.default = (0, config_1.defineConfig)({
    plugins: [(0, plugin_react_1.default)()],
    test: {
        environment: 'jsdom',
        setupFiles: './vitest.setup.ts',
        globals: true
    }
});
