"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceSearchQueryJoi = exports.EvidenceSearchQuerySchema = void 0;
const zod_1 = require("zod");
const joi_1 = __importDefault(require("joi"));
exports.EvidenceSearchQuerySchema = zod_1.z.object({
    q: zod_1.z
        .string()
        .trim()
        .min(1, "Query parameter 'q' is required")
        .max(300, 'Query must be 300 characters or fewer'),
    skip: zod_1.z.coerce.number().int().min(0).max(1000).default(0),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(10),
});
exports.EvidenceSearchQueryJoi = joi_1.default.object({
    q: joi_1.default.string().trim().min(1).max(300).required(),
    skip: joi_1.default.number().integer().min(0).max(1000).default(0),
    limit: joi_1.default.number().integer().min(1).max(100).default(10),
});
