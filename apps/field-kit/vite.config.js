"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference types="vitest" />
const vite_1 = require("vite");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
const vite_plugin_pwa_1 = require("vite-plugin-pwa");
const vite_2 = __importDefault(require("@tailwindcss/vite"));
const path_1 = __importDefault(require("path"));
exports.default = (0, vite_1.defineConfig)({
    plugins: [
        (0, plugin_react_1.default)(),
        (0, vite_2.default)(),
        (0, vite_plugin_pwa_1.VitePWA)({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
            manifest: {
                name: 'IntelGraph Field Kit',
                short_name: 'FieldKit',
                description: 'Offline-first field data collection for IntelGraph',
                theme_color: '#000000',
                background_color: '#000000',
                display: 'standalone',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            }
        })
    ],
    resolve: {
        alias: {
            '@': path_1.default.resolve(__dirname, './src'),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
    },
});
