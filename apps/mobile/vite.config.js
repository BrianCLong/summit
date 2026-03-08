"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
const vite_plugin_pwa_1 = require("vite-plugin-pwa");
const path_1 = __importDefault(require("path"));
exports.default = (0, vite_1.defineConfig)({
    plugins: [
        (0, plugin_react_1.default)(),
        (0, vite_plugin_pwa_1.VitePWA)({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
            manifest: {
                name: 'IntelGraph Field Ops',
                short_name: 'FieldOps',
                description: 'Mobile Field Operations Client for IntelGraph',
                theme_color: '#1a1a2e',
                background_color: '#1a1a2e',
                display: 'standalone',
                orientation: 'portrait-primary',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/api\..*\/graphql/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'graphql-cache',
                            networkTimeoutSeconds: 10,
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24, // 24 hours
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/.*\.(jpg|jpeg|png|gif|webp)$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'image-cache',
                            expiration: {
                                maxEntries: 200,
                                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                            },
                        },
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path_1.default.resolve(__dirname, './src'),
        },
    },
    build: {
        target: 'esnext',
        minify: 'terser',
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    mui: ['@mui/material', '@mui/icons-material'],
                    apollo: ['@apollo/client', 'graphql'],
                },
            },
        },
    },
    server: {
        port: 3002,
        proxy: {
            '/graphql': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
            '/api': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
        },
    },
});
