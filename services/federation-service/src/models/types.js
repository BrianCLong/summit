"use strict";
/**
 * Core Federation Types
 *
 * Defines the data contracts for cross-org intel exchange.
 * All sharing is policy-bound and audited.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedObjectSchema = exports.SharingAgreementSchema = exports.FederationPartnerSchema = exports.AgreementStatus = exports.LicenseType = exports.SharingMode = exports.ShareableObjectType = exports.Jurisdiction = exports.ClassificationLevel = void 0;
const zod_1 = require("zod");
/**
 * Classification levels for data sharing
 */
var ClassificationLevel;
(function (ClassificationLevel) {
    ClassificationLevel["UNCLASSIFIED"] = "UNCLASSIFIED";
    ClassificationLevel["CUI"] = "CUI";
    ClassificationLevel["CONFIDENTIAL"] = "CONFIDENTIAL";
    ClassificationLevel["SECRET"] = "SECRET";
    ClassificationLevel["TOP_SECRET"] = "TOP_SECRET";
})(ClassificationLevel || (exports.ClassificationLevel = ClassificationLevel = {}));
/**
 * Jurisdiction/region for data sovereignty
 */
var Jurisdiction;
(function (Jurisdiction) {
    Jurisdiction["US"] = "US";
    Jurisdiction["EU"] = "EU";
    Jurisdiction["UK"] = "UK";
    Jurisdiction["FVEY"] = "FVEY";
    Jurisdiction["NATO"] = "NATO";
    Jurisdiction["GLOBAL"] = "GLOBAL";
})(Jurisdiction || (exports.Jurisdiction = Jurisdiction = {}));
/**
 * Types of objects that can be shared
 */
var ShareableObjectType;
(function (ShareableObjectType) {
    ShareableObjectType["ENTITY"] = "ENTITY";
    ShareableObjectType["RELATIONSHIP"] = "RELATIONSHIP";
    ShareableObjectType["CASE"] = "CASE";
    ShareableObjectType["ALERT"] = "ALERT";
    ShareableObjectType["IOC"] = "IOC";
    ShareableObjectType["DOCUMENT"] = "DOCUMENT";
    ShareableObjectType["ANALYSIS"] = "ANALYSIS";
})(ShareableObjectType || (exports.ShareableObjectType = ShareableObjectType = {}));
/**
 * Sharing patterns/models
 */
var SharingMode;
(function (SharingMode) {
    SharingMode["PUSH"] = "PUSH";
    SharingMode["PULL"] = "PULL";
    SharingMode["SUBSCRIPTION"] = "SUBSCRIPTION";
})(SharingMode || (exports.SharingMode = SharingMode = {}));
/**
 * License terms for shared data
 */
var LicenseType;
(function (LicenseType) {
    LicenseType["TLP_WHITE"] = "TLP:WHITE";
    LicenseType["TLP_GREEN"] = "TLP:GREEN";
    LicenseType["TLP_AMBER"] = "TLP:AMBER";
    LicenseType["TLP_RED"] = "TLP:RED";
    LicenseType["CUSTOM"] = "CUSTOM";
})(LicenseType || (exports.LicenseType = LicenseType = {}));
/**
 * Status of a sharing agreement
 */
var AgreementStatus;
(function (AgreementStatus) {
    AgreementStatus["DRAFT"] = "DRAFT";
    AgreementStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    AgreementStatus["ACTIVE"] = "ACTIVE";
    AgreementStatus["SUSPENDED"] = "SUSPENDED";
    AgreementStatus["TERMINATED"] = "TERMINATED";
})(AgreementStatus || (exports.AgreementStatus = AgreementStatus = {}));
/**
 * Zod schemas for validation
 */
exports.FederationPartnerSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1),
    organizationId: zod_1.z.string(),
    jurisdiction: zod_1.z.nativeEnum(Jurisdiction),
    publicKey: zod_1.z.string(),
    certificateFingerprint: zod_1.z.string().optional(),
    endpointUrl: zod_1.z.string().url(),
    contactEmail: zod_1.z.string().email(),
    status: zod_1.z.enum(['active', 'suspended', 'inactive']),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.SharingAgreementSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    sourcePartnerId: zod_1.z.string().uuid(),
    targetPartnerId: zod_1.z.string().uuid(),
    policyConstraints: zod_1.z.object({
        maxClassificationLevel: zod_1.z.nativeEnum(ClassificationLevel),
        allowedJurisdictions: zod_1.z.array(zod_1.z.nativeEnum(Jurisdiction)),
        allowedObjectTypes: zod_1.z.array(zod_1.z.nativeEnum(ShareableObjectType)),
        redactionRules: zod_1.z.array(zod_1.z.object({
            field: zod_1.z.string(),
            action: zod_1.z.enum(['redact', 'pseudonymize', 'hash', 'remove']),
            replacement: zod_1.z.string().optional(),
            condition: zod_1.z.string().optional(),
        })).optional(),
        licenseType: zod_1.z.nativeEnum(LicenseType),
        customLicenseTerms: zod_1.z.string().optional(),
        allowDownstreamSharing: zod_1.z.boolean(),
        retentionPeriodDays: zod_1.z.number().optional(),
        requiresApproval: zod_1.z.boolean().optional(),
        notificationEmail: zod_1.z.string().email().optional(),
    }),
    sharingMode: zod_1.z.nativeEnum(SharingMode),
    channels: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    status: zod_1.z.nativeEnum(AgreementStatus),
    effectiveDate: zod_1.z.date().optional(),
    expirationDate: zod_1.z.date().optional(),
    approvedBy: zod_1.z.string().optional(),
    approvedAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.SharedObjectSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.nativeEnum(ShareableObjectType),
    data: zod_1.z.record(zod_1.z.unknown()),
    classification: zod_1.z.nativeEnum(ClassificationLevel),
    jurisdiction: zod_1.z.nativeEnum(Jurisdiction),
    license: zod_1.z.nativeEnum(LicenseType),
    originalId: zod_1.z.string(),
    sourceOrganization: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    modifiedAt: zod_1.z.date().optional(),
    redactedFields: zod_1.z.array(zod_1.z.string()).optional(),
    transformationApplied: zod_1.z.boolean().optional(),
});
