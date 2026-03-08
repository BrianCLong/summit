"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const maestro_sdk_1 = require("@intelgraph/maestro-sdk");
exports.default = (0, maestro_sdk_1.defineTask)({
    async execute(_ctx, { payload }) {
        if (!payload.approved)
            throw new Error('Approval required');
        return { payload: { approved: true } };
    },
});
