"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemporalIntervalSchema = void 0;
const zod_1 = require("zod");
/**
 * Temporal interval representing valid time and transaction time
 */
exports.TemporalIntervalSchema = zod_1.z.object({
    validFrom: zod_1.z.date(),
    validTo: zod_1.z.date(),
    txFrom: zod_1.z.date(),
    txTo: zod_1.z.date(),
});
