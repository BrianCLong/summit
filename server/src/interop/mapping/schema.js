"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MappingSpecSchema = exports.FieldMappingSchema = exports.TransformTypeSchema = void 0;
// @ts-nocheck
const z = __importStar(require("zod"));
// Allowed transforms
exports.TransformTypeSchema = z.enum([
    'string',
    'number',
    'boolean',
    'trim',
    'uppercase',
    'lowercase',
    'isoDate',
    'json',
    'uuid',
]);
// Individual field mapping
exports.FieldMappingSchema = z.object({
    source: z.string(),
    target: z.string(),
    transform: exports.TransformTypeSchema.optional(),
    required: z.boolean().optional().default(false),
    defaultValue: z.any().optional(),
});
// The full mapping specification
exports.MappingSpecSchema = z.object({
    owner: z.string(),
    version: z.string(),
    sourceSystem: z.string(),
    license: z.string(),
    mappings: z.array(exports.FieldMappingSchema),
    unknownFields: z.enum(['ignore', 'quarantine', 'error']).default('error'),
});
