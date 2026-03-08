"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionSchema = void 0;
const zod_1 = require("zod");
exports.ActionSchema = zod_1.z.object({
    type: zod_1.z.string(),
    params: zod_1.z.record(zod_1.z.any()),
});
