"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const orval_1 = require("orval");
exports.default = (0, orval_1.defineConfig)({
    maestroSdk: {
        input: '/Users/brianlong/Documents/GitHub/intelgraph/maestro-orchestration-api.yaml',
        output: {
            target: './sdk/typescript/src/generated/index.ts',
            mode: 'single',
            client: 'axios',
            prettier: true,
        },
    },
});
