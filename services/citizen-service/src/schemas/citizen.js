"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EligibilitySchema = exports.DataConsentSchema = exports.ServiceRecordSchema = exports.ServiceDomainSchema = exports.CitizenProfileSchema = void 0;
const zod_1 = require("zod");
/**
 * Citizen Profile Schema
 * Core identity and demographic information ingested once, reused across services
 */
exports.CitizenProfileSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    nationalId: zod_1.z.string().min(1),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    middleName: zod_1.z.string().optional(),
    dateOfBirth: zod_1.z.string().datetime().optional(),
    gender: zod_1.z.enum(['male', 'female', 'other', 'undisclosed']).optional(),
    nationality: zod_1.z.string().optional(),
    // Contact information
    contact: zod_1.z.object({
        email: zod_1.z.string().email().optional(),
        phone: zod_1.z.string().optional(),
        address: zod_1.z.object({
            street: zod_1.z.string().optional(),
            city: zod_1.z.string().optional(),
            state: zod_1.z.string().optional(),
            postalCode: zod_1.z.string().optional(),
            country: zod_1.z.string().optional(),
        }).optional(),
    }).optional(),
    // Verification status
    verified: zod_1.z.boolean().default(false),
    verificationDate: zod_1.z.string().datetime().optional(),
    // Data provenance
    source: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
/**
 * Service Domain - represents different government service areas
 */
exports.ServiceDomainSchema = zod_1.z.enum([
    'education',
    'healthcare',
    'administration',
    'taxation',
    'social_services',
    'transportation',
    'housing',
    'employment',
]);
/**
 * Citizen Service Record - tracks interactions across service domains
 */
exports.ServiceRecordSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    citizenId: zod_1.z.string().uuid(),
    domain: exports.ServiceDomainSchema,
    serviceType: zod_1.z.string(),
    status: zod_1.z.enum(['pending', 'in_progress', 'completed', 'rejected']),
    requestDate: zod_1.z.string().datetime(),
    completionDate: zod_1.z.string().datetime().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    // Linked documents/records from other domains
    linkedRecords: zod_1.z.array(zod_1.z.string().uuid()).optional(),
});
/**
 * Data Consent - tracks citizen consent for data sharing
 */
exports.DataConsentSchema = zod_1.z.object({
    citizenId: zod_1.z.string().uuid(),
    domain: exports.ServiceDomainSchema,
    consentGiven: zod_1.z.boolean(),
    consentDate: zod_1.z.string().datetime(),
    expiryDate: zod_1.z.string().datetime().optional(),
    scope: zod_1.z.array(zod_1.z.string()), // What data can be shared
});
/**
 * Service Eligibility - pre-computed eligibility for proactive services
 */
exports.EligibilitySchema = zod_1.z.object({
    citizenId: zod_1.z.string().uuid(),
    domain: exports.ServiceDomainSchema,
    serviceType: zod_1.z.string(),
    eligible: zod_1.z.boolean(),
    reason: zod_1.z.string().optional(),
    computedAt: zod_1.z.string().datetime(),
    validUntil: zod_1.z.string().datetime(),
});
