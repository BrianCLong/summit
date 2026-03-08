"use strict";
/**
 * Entity Schemas v1
 * Defines canonical entity types for the IntelGraph model
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityV1 = exports.OrganizationEntityV1 = exports.PersonEntityV1 = void 0;
exports.isPerson = isPerson;
exports.isOrganization = isOrganization;
const zod_1 = require("zod");
const provenance_js_1 = require("./provenance.js");
/**
 * Person Entity - Represents an individual person
 */
exports.PersonEntityV1 = zod_1.z.object({
    id: zod_1.z.string().uuid().describe('Unique identifier (UUID v4)'),
    type: zod_1.z.literal('Person').describe('Entity type discriminator'),
    version: zod_1.z.literal('v1').describe('Schema version'),
    attributes: zod_1.z.object({
        name: zod_1.z.string().min(1).max(500).describe('Full name of the person'),
        email: zod_1.z.string().email().max(255).optional().describe('Email address'),
        phone: zod_1.z.string().max(50).optional().describe('Phone number'),
        title: zod_1.z.string().max(200).optional().describe('Job title or role'),
        organization: zod_1.z.string().max(500).optional().describe('Organization name'),
        location: zod_1.z.string().max(500).optional().describe('Geographic location'),
        bio: zod_1.z.string().max(5000).optional().describe('Biographical information'),
    }),
    metadata: provenance_js_1.EntityMetadataV1.describe('Lifecycle and provenance metadata'),
});
/**
 * Organization Entity - Represents a company or organization
 */
exports.OrganizationEntityV1 = zod_1.z.object({
    id: zod_1.z.string().uuid().describe('Unique identifier (UUID v4)'),
    type: zod_1.z.literal('Organization').describe('Entity type discriminator'),
    version: zod_1.z.literal('v1').describe('Schema version'),
    attributes: zod_1.z.object({
        name: zod_1.z.string().min(1).max(500).describe('Organization name'),
        legalName: zod_1.z.string().max(500).optional().describe('Legal business name'),
        website: zod_1.z.string().url().optional().describe('Primary website URL'),
        domain: zod_1.z.string().max(255).optional().describe('Email domain'),
        industry: zod_1.z.string().max(200).optional().describe('Industry classification'),
        size: zod_1.z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional(),
        location: zod_1.z.string().max(500).optional().describe('Headquarters location'),
        description: zod_1.z.string().max(5000).optional().describe('Organization description'),
    }),
    metadata: provenance_js_1.EntityMetadataV1.describe('Lifecycle and provenance metadata'),
});
/**
 * Generic Entity - Union type for all entity types
 */
exports.EntityV1 = zod_1.z.discriminatedUnion('type', [
    exports.PersonEntityV1,
    exports.OrganizationEntityV1,
]);
/**
 * Entity type helper for narrowing
 */
function isPerson(entity) {
    return entity.type === 'Person';
}
function isOrganization(entity) {
    return entity.type === 'Organization';
}
