"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
const path_1 = require("path");
// Maestro-only build: only includes maestro.html entry (renders MaestroApp)
exports.default = (0, vite_1.defineConfig)({
    plugins: [(0, plugin_react_1.default)()],
    build: {
        outDir: 'dist-new',
        rollupOptions: {
            input: (0, path_1.resolve)(__dirname, 'maestro.html'),
            output: {
                entryFileNames: 'app-[hash].js',
                chunkFileNames: 'app-[hash].js',
                assetFileNames: 'app-[hash].[ext]',
            },
        },
    },
});
