"use strict";
/**
 * Canonical Entity and Relationship Types for Graph Core
 *
 * This module defines the complete canonical model including:
 * - 21 Entity Types (Person, Org, Asset, Account, Location, Event, Document,
 *   Communication, Device, Vehicle, Infrastructure, FinancialInstrument,
 *   Indicator, Claim, Case, Narrative, Campaign, InfrastructureService,
 *   Sensor, Runbook, Authority, License)
 * - 30 Relationship Types covering structure, network, evidence, authority, temporal
 * - Policy Labels with 7 mandatory fields
 * - Bitemporal support (validFrom/validTo + observedAt/recordedAt)
 *
 * @module graph-core/canonical
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceAction = exports.VerificationStatus = exports.RetentionClass = exports.ClearanceLevel = exports.SensitivityLevel = exports.CanonicalRelationshipType = exports.CanonicalEntityType = void 0;
exports.getAllEntityTypes = getAllEntityTypes;
exports.getAllRelationshipTypes = getAllRelationshipTypes;
exports.isValidEntityType = isValidEntityType;
exports.isValidRelationshipType = isValidRelationshipType;
exports.getClearanceHierarchy = getClearanceHierarchy;
exports.compareClearance = compareClearance;
exports.getSensitivityHierarchy = getSensitivityHierarchy;
exports.compareSensitivity = compareSensitivity;
exports.requiresLegalBasis = requiresLegalBasis;
// =============================================================================
// ENUMS
// =============================================================================
/**
 * Canonical Entity Types - 21 types covering intelligence domain
 */
var CanonicalEntityType;
(function (CanonicalEntityType) {
    CanonicalEntityType["PERSON"] = "Person";
    CanonicalEntityType["ORGANIZATION"] = "Organization";
    CanonicalEntityType["ASSET"] = "Asset";
    CanonicalEntityType["ACCOUNT"] = "Account";
    CanonicalEntityType["LOCATION"] = "Location";
    CanonicalEntityType["EVENT"] = "Event";
    CanonicalEntityType["DOCUMENT"] = "Document";
    CanonicalEntityType["COMMUNICATION"] = "Communication";
    CanonicalEntityType["DEVICE"] = "Device";
    CanonicalEntityType["VEHICLE"] = "Vehicle";
    CanonicalEntityType["INFRASTRUCTURE"] = "Infrastructure";
    CanonicalEntityType["FINANCIAL_INSTRUMENT"] = "FinancialInstrument";
    CanonicalEntityType["INDICATOR"] = "Indicator";
    CanonicalEntityType["CLAIM"] = "Claim";
    CanonicalEntityType["CASE"] = "Case";
    CanonicalEntityType["NARRATIVE"] = "Narrative";
    CanonicalEntityType["CAMPAIGN"] = "Campaign";
    CanonicalEntityType["INFRASTRUCTURE_SERVICE"] = "InfrastructureService";
    CanonicalEntityType["SENSOR"] = "Sensor";
    CanonicalEntityType["RUNBOOK"] = "Runbook";
    CanonicalEntityType["AUTHORITY"] = "Authority";
    CanonicalEntityType["LICENSE"] = "License";
})(CanonicalEntityType || (exports.CanonicalEntityType = CanonicalEntityType = {}));
/**
 * Canonical Relationship Types - 30 types covering all relationship patterns
 */
var CanonicalRelationshipType;
(function (CanonicalRelationshipType) {
    // Structure (7)
    CanonicalRelationshipType["CONNECTED_TO"] = "CONNECTED_TO";
    CanonicalRelationshipType["OWNS"] = "OWNS";
    CanonicalRelationshipType["WORKS_FOR"] = "WORKS_FOR";
    CanonicalRelationshipType["LOCATED_AT"] = "LOCATED_AT";
    CanonicalRelationshipType["MEMBER_OF"] = "MEMBER_OF";
    CanonicalRelationshipType["MANAGES"] = "MANAGES";
    CanonicalRelationshipType["REPORTS_TO"] = "REPORTS_TO";
    // Network (4)
    CanonicalRelationshipType["COMMUNICATES_WITH"] = "COMMUNICATES_WITH";
    CanonicalRelationshipType["TRANSACTED_WITH"] = "TRANSACTED_WITH";
    CanonicalRelationshipType["SIMILAR_TO"] = "SIMILAR_TO";
    CanonicalRelationshipType["RELATED_TO"] = "RELATED_TO";
    // Hierarchy (3)
    CanonicalRelationshipType["SUBSIDIARY_OF"] = "SUBSIDIARY_OF";
    CanonicalRelationshipType["PARTNER_OF"] = "PARTNER_OF";
    CanonicalRelationshipType["COMPETITOR_OF"] = "COMPETITOR_OF";
    // Actions (4)
    CanonicalRelationshipType["ACCESSED"] = "ACCESSED";
    CanonicalRelationshipType["CREATED"] = "CREATED";
    CanonicalRelationshipType["MODIFIED"] = "MODIFIED";
    CanonicalRelationshipType["MENTIONS"] = "MENTIONS";
    // Evidence & Provenance (4)
    CanonicalRelationshipType["SUPPORTS"] = "SUPPORTS";
    CanonicalRelationshipType["CONTRADICTS"] = "CONTRADICTS";
    CanonicalRelationshipType["DERIVED_FROM"] = "DERIVED_FROM";
    CanonicalRelationshipType["CITES"] = "CITES";
    // Authority & Governance (3)
    CanonicalRelationshipType["AUTHORIZED_BY"] = "AUTHORIZED_BY";
    CanonicalRelationshipType["GOVERNED_BY"] = "GOVERNED_BY";
    CanonicalRelationshipType["REQUIRES"] = "REQUIRES";
    // Temporal Sequences (3)
    CanonicalRelationshipType["PRECEDES"] = "PRECEDES";
    CanonicalRelationshipType["FOLLOWS"] = "FOLLOWS";
    CanonicalRelationshipType["CONCURRENT_WITH"] = "CONCURRENT_WITH";
    // Hypothesis (3)
    CanonicalRelationshipType["EXPLAINS"] = "EXPLAINS";
    CanonicalRelationshipType["ALTERNATIVE_TO"] = "ALTERNATIVE_TO";
    CanonicalRelationshipType["REFUTES"] = "REFUTES";
})(CanonicalRelationshipType || (exports.CanonicalRelationshipType = CanonicalRelationshipType = {}));
/**
 * Sensitivity levels for data classification
 */
var SensitivityLevel;
(function (SensitivityLevel) {
    SensitivityLevel["PUBLIC"] = "PUBLIC";
    SensitivityLevel["INTERNAL"] = "INTERNAL";
    SensitivityLevel["CONFIDENTIAL"] = "CONFIDENTIAL";
    SensitivityLevel["RESTRICTED"] = "RESTRICTED";
    SensitivityLevel["TOP_SECRET"] = "TOP_SECRET";
})(SensitivityLevel || (exports.SensitivityLevel = SensitivityLevel = {}));
/**
 * Clearance levels for access control
 */
var ClearanceLevel;
(function (ClearanceLevel) {
    ClearanceLevel["PUBLIC"] = "PUBLIC";
    ClearanceLevel["AUTHORIZED"] = "AUTHORIZED";
    ClearanceLevel["CONFIDENTIAL"] = "CONFIDENTIAL";
    ClearanceLevel["SECRET"] = "SECRET";
    ClearanceLevel["TOP_SECRET"] = "TOP_SECRET";
})(ClearanceLevel || (exports.ClearanceLevel = ClearanceLevel = {}));
/**
 * Retention classes for lifecycle management
 */
var RetentionClass;
(function (RetentionClass) {
    RetentionClass["TRANSIENT"] = "TRANSIENT";
    RetentionClass["SHORT_TERM"] = "SHORT_TERM";
    RetentionClass["MEDIUM_TERM"] = "MEDIUM_TERM";
    RetentionClass["LONG_TERM"] = "LONG_TERM";
    RetentionClass["PERMANENT"] = "PERMANENT";
    RetentionClass["LEGAL_HOLD"] = "LEGAL_HOLD";
})(RetentionClass || (exports.RetentionClass = RetentionClass = {}));
/**
 * Verification status for provenance
 */
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["UNVERIFIED"] = "UNVERIFIED";
    VerificationStatus["PARTIAL"] = "PARTIAL";
    VerificationStatus["VERIFIED"] = "VERIFIED";
    VerificationStatus["DISPUTED"] = "DISPUTED";
    VerificationStatus["INVALIDATED"] = "INVALIDATED";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
/**
 * Provenance action types
 */
var ProvenanceAction;
(function (ProvenanceAction) {
    ProvenanceAction["INGEST"] = "INGEST";
    ProvenanceAction["TRANSFORM"] = "TRANSFORM";
    ProvenanceAction["ENRICH"] = "ENRICH";
    ProvenanceAction["MERGE"] = "MERGE";
    ProvenanceAction["SPLIT"] = "SPLIT";
    ProvenanceAction["VALIDATE"] = "VALIDATE";
})(ProvenanceAction || (exports.ProvenanceAction = ProvenanceAction = {}));
// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
/**
 * Get all entity type values as array
 */
function getAllEntityTypes() {
    return Object.values(CanonicalEntityType);
}
/**
 * Get all relationship type values as array
 */
function getAllRelationshipTypes() {
    return Object.values(CanonicalRelationshipType);
}
/**
 * Check if a string is a valid entity type
 */
function isValidEntityType(type) {
    return Object.values(CanonicalEntityType).includes(type);
}
/**
 * Check if a string is a valid relationship type
 */
function isValidRelationshipType(type) {
    return Object.values(CanonicalRelationshipType).includes(type);
}
/**
 * Get clearance level hierarchy (higher index = higher clearance)
 */
function getClearanceHierarchy() {
    return [
        ClearanceLevel.PUBLIC,
        ClearanceLevel.AUTHORIZED,
        ClearanceLevel.CONFIDENTIAL,
        ClearanceLevel.SECRET,
        ClearanceLevel.TOP_SECRET,
    ];
}
/**
 * Compare two clearance levels
 * Returns: negative if a < b, 0 if equal, positive if a > b
 */
function compareClearance(a, b) {
    const hierarchy = getClearanceHierarchy();
    return hierarchy.indexOf(a) - hierarchy.indexOf(b);
}
/**
 * Get sensitivity level hierarchy (higher index = more sensitive)
 */
function getSensitivityHierarchy() {
    return [
        SensitivityLevel.PUBLIC,
        SensitivityLevel.INTERNAL,
        SensitivityLevel.CONFIDENTIAL,
        SensitivityLevel.RESTRICTED,
        SensitivityLevel.TOP_SECRET,
    ];
}
/**
 * Compare two sensitivity levels
 * Returns: negative if a < b, 0 if equal, positive if a > b
 */
function compareSensitivity(a, b) {
    const hierarchy = getSensitivityHierarchy();
    return hierarchy.indexOf(a) - hierarchy.indexOf(b);
}
/**
 * Check if sensitivity requires legal basis
 * Legal basis is required for sensitivity > INTERNAL
 */
function requiresLegalBasis(sensitivity) {
    return compareSensitivity(sensitivity, SensitivityLevel.INTERNAL) > 0;
}
