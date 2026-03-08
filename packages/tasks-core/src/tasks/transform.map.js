"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const maestro_sdk_1 = require("@intelgraph/maestro-sdk");
// Note: mapper is a JS function body in a sandboxed new Function (trusted catalogs only)
exports.default = (0, maestro_sdk_1.defineTask)({
    async execute(_ctx, { payload }) {
        const fn = new Function('row', payload.mapper);
        const out = payload.rows.map((r) => fn(r));
        return { payload: { rows: out } };
    },
});
