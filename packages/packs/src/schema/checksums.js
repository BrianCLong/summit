"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChecksumsSchema = void 0;
const zod_1 = require("zod");
exports.ChecksumsSchema = zod_1.z.record(zod_1.z.string());
