"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
const vite_plugin_electron_1 = __importDefault(require("vite-plugin-electron"));
const vite_plugin_electron_renderer_1 = __importDefault(require("vite-plugin-electron-renderer"));
const path_1 = __importDefault(require("path"));
exports.default = (0, vite_1.defineConfig)({
    plugins: [
        (0, plugin_react_1.default)(),
        (0, vite_plugin_electron_1.default)([
            {
                entry: 'electron/main.ts',
                onstart(options) {
                    options.startup();
                },
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        rollupOptions: {
                            external: ['electron', 'electron-store', 'electron-updater', 'electron-log'],
                        },
                    },
                },
            },
            {
                entry: 'electron/preload.ts',
                onstart(options) {
                    options.reload();
                },
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        rollupOptions: {
                            external: ['electron'],
                        },
                    },
                },
            },
        ]),
        (0, vite_plugin_electron_renderer_1.default)(),
    ],
    resolve: {
        alias: {
            '@': path_1.default.resolve(__dirname, 'src'),
        },
    },
    server: {
        port: 5173,
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
});
