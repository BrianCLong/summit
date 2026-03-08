"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const maestro_sdk_1 = require("@intelgraph/maestro-sdk");
exports.default = (0, maestro_sdk_1.defineTask)({
    validate: ({ payload }) => {
        if (!payload || typeof payload.ms !== 'number' || payload.ms < 0)
            throw new Error('ms must be >= 0');
    },
    execute: async (_ctx, { payload }) => {
        await new Promise((r) => setTimeout(r, payload.ms));
        return { payload: { slept: payload.ms } };
    },
});
