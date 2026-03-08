"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tsup_1 = require("tsup");
exports.default = (0, tsup_1.defineConfig)({
    entry: {
        index: 'src/index.ts',
        'offline/index': 'src/offline/index.ts',
        'auth/index': 'src/auth/index.ts',
        'storage/index': 'src/storage/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: false, // Disabled due to export conflicts between db/Entity and types/Entity
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    minify: true,
});
