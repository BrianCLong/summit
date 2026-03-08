"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        environment: 'happy-dom',
        globals: true,
        setupFiles: './vitest.setup.ts',
        resolveSnapshotPath: (testPath, snapExtension) => testPath.replace(/\.([tj]sx?)/, `.snap${snapExtension}`),
    },
});
