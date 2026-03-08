"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationshipSchema = exports.EntitySchema = exports.PolicyTags = exports.EntityType = void 0;
const zod_1 = require("zod");
exports.EntityType = zod_1.z.enum([
    'Person',
    'Org',
    'Asset',
    'Account',
    'Location',
    'Event',
    'Document',
    'Communication',
    'Device',
    'Vehicle',
    'FinancialInstrument',
    'Infrastructure',
    'Claim',
    'Indicator',
    'Case',
]);
exports.PolicyTags = zod_1.z.object({
    origin: zod_1.z.string().optional(),
    sensitivity: zod_1.z.string().optional(),
    clearance: zod_1.z.string().optional(),
    legalBasis: zod_1.z.string().optional(),
    needToKnow: zod_1.z.string().optional(),
});
exports.EntitySchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    type: exports.EntityType,
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({}),
    validFrom: zod_1.z.string().datetime().optional(),
    validTo: zod_1.z.string().datetime().optional(),
    policy: exports.PolicyTags.optional(),
});
exports.RelationshipSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    from: zod_1.z.string(),
    to: zod_1.z.string(),
    type: zod_1.z.string(),
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({}),
    validFrom: zod_1.z.string().datetime().optional(),
    validTo: zod_1.z.string().datetime().optional(),
    policy: exports.PolicyTags.optional(),
});
