"use strict";
/**
 * Canonical Schema Base Types
 * GA-ready entity and relationship definitions aligned with Council Wishbook
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanonicalRelationshipType = exports.VerificationStatus = exports.RetentionClass = exports.ClearanceLevel = exports.SensitivityLevel = exports.CanonicalEntityType = void 0;
var CanonicalEntityType;
(function (CanonicalEntityType) {
    CanonicalEntityType["PERSON"] = "PERSON";
    CanonicalEntityType["ORGANIZATION"] = "ORGANIZATION";
    CanonicalEntityType["LOCATION"] = "LOCATION";
    CanonicalEntityType["ASSET"] = "ASSET";
    CanonicalEntityType["ACCOUNT"] = "ACCOUNT";
    CanonicalEntityType["EVENT"] = "EVENT";
    CanonicalEntityType["DOCUMENT"] = "DOCUMENT";
    CanonicalEntityType["COMMUNICATION"] = "COMMUNICATION";
    CanonicalEntityType["DEVICE"] = "DEVICE";
    CanonicalEntityType["VEHICLE"] = "VEHICLE";
    CanonicalEntityType["INFRASTRUCTURE"] = "INFRASTRUCTURE";
    CanonicalEntityType["FINANCIAL_INSTRUMENT"] = "FINANCIAL_INSTRUMENT";
    CanonicalEntityType["INDICATOR"] = "INDICATOR";
    CanonicalEntityType["CLAIM"] = "CLAIM";
    CanonicalEntityType["CASE"] = "CASE";
    CanonicalEntityType["NARRATIVE"] = "NARRATIVE";
    CanonicalEntityType["CAMPAIGN"] = "CAMPAIGN";
    CanonicalEntityType["LICENSE"] = "LICENSE";
    CanonicalEntityType["AUTHORITY"] = "AUTHORITY";
    CanonicalEntityType["SENSOR"] = "SENSOR";
    CanonicalEntityType["RUNBOOK"] = "RUNBOOK";
    CanonicalEntityType["EVIDENCE"] = "EVIDENCE";
    CanonicalEntityType["HYPOTHESIS"] = "HYPOTHESIS";
})(CanonicalEntityType || (exports.CanonicalEntityType = CanonicalEntityType = {}));
var SensitivityLevel;
(function (SensitivityLevel) {
    SensitivityLevel["PUBLIC"] = "PUBLIC";
    SensitivityLevel["INTERNAL"] = "INTERNAL";
    SensitivityLevel["CONFIDENTIAL"] = "CONFIDENTIAL";
    SensitivityLevel["RESTRICTED"] = "RESTRICTED";
    SensitivityLevel["TOP_SECRET"] = "TOP_SECRET";
})(SensitivityLevel || (exports.SensitivityLevel = SensitivityLevel = {}));
var ClearanceLevel;
(function (ClearanceLevel) {
    ClearanceLevel["PUBLIC"] = "PUBLIC";
    ClearanceLevel["AUTHORIZED"] = "AUTHORIZED";
    ClearanceLevel["CONFIDENTIAL"] = "CONFIDENTIAL";
    ClearanceLevel["SECRET"] = "SECRET";
    ClearanceLevel["TOP_SECRET"] = "TOP_SECRET";
})(ClearanceLevel || (exports.ClearanceLevel = ClearanceLevel = {}));
var RetentionClass;
(function (RetentionClass) {
    RetentionClass["TRANSIENT"] = "TRANSIENT";
    RetentionClass["SHORT_TERM"] = "SHORT_TERM";
    RetentionClass["MEDIUM_TERM"] = "MEDIUM_TERM";
    RetentionClass["LONG_TERM"] = "LONG_TERM";
    RetentionClass["PERMANENT"] = "PERMANENT";
    RetentionClass["LEGAL_HOLD"] = "LEGAL_HOLD";
})(RetentionClass || (exports.RetentionClass = RetentionClass = {}));
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["UNVERIFIED"] = "UNVERIFIED";
    VerificationStatus["PARTIAL"] = "PARTIAL";
    VerificationStatus["VERIFIED"] = "VERIFIED";
    VerificationStatus["DISPUTED"] = "DISPUTED";
    VerificationStatus["INVALIDATED"] = "INVALIDATED";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
var CanonicalRelationshipType;
(function (CanonicalRelationshipType) {
    // Core relationships (existing)
    CanonicalRelationshipType["CONNECTED_TO"] = "CONNECTED_TO";
    CanonicalRelationshipType["OWNS"] = "OWNS";
    CanonicalRelationshipType["WORKS_FOR"] = "WORKS_FOR";
    CanonicalRelationshipType["LOCATED_AT"] = "LOCATED_AT";
    CanonicalRelationshipType["MENTIONS"] = "MENTIONS";
    CanonicalRelationshipType["COMMUNICATES_WITH"] = "COMMUNICATES_WITH";
    CanonicalRelationshipType["TRANSACTED_WITH"] = "TRANSACTED_WITH";
    CanonicalRelationshipType["ACCESSED"] = "ACCESSED";
    CanonicalRelationshipType["CREATED"] = "CREATED";
    CanonicalRelationshipType["MODIFIED"] = "MODIFIED";
    CanonicalRelationshipType["RELATED_TO"] = "RELATED_TO";
    CanonicalRelationshipType["MEMBER_OF"] = "MEMBER_OF";
    CanonicalRelationshipType["MANAGES"] = "MANAGES";
    CanonicalRelationshipType["REPORTS_TO"] = "REPORTS_TO";
    CanonicalRelationshipType["SUBSIDIARY_OF"] = "SUBSIDIARY_OF";
    CanonicalRelationshipType["PARTNER_OF"] = "PARTNER_OF";
    CanonicalRelationshipType["COMPETITOR_OF"] = "COMPETITOR_OF";
    CanonicalRelationshipType["SIMILAR_TO"] = "SIMILAR_TO";
    // Evidence & provenance (NEW)
    CanonicalRelationshipType["SUPPORTS"] = "SUPPORTS";
    CanonicalRelationshipType["CONTRADICTS"] = "CONTRADICTS";
    CanonicalRelationshipType["DERIVED_FROM"] = "DERIVED_FROM";
    CanonicalRelationshipType["CITES"] = "CITES";
    // Authority & governance (NEW)
    CanonicalRelationshipType["AUTHORIZED_BY"] = "AUTHORIZED_BY";
    CanonicalRelationshipType["GOVERNED_BY"] = "GOVERNED_BY";
    CanonicalRelationshipType["REQUIRES"] = "REQUIRES";
    // Temporal sequences (NEW)
    CanonicalRelationshipType["PRECEDES"] = "PRECEDES";
    CanonicalRelationshipType["FOLLOWS"] = "FOLLOWS";
    CanonicalRelationshipType["CONCURRENT_WITH"] = "CONCURRENT_WITH";
    // Hypothesis relationships (NEW)
    CanonicalRelationshipType["EXPLAINS"] = "EXPLAINS";
    CanonicalRelationshipType["ALTERNATIVE_TO"] = "ALTERNATIVE_TO";
    CanonicalRelationshipType["REFUTES"] = "REFUTES";
})(CanonicalRelationshipType || (exports.CanonicalRelationshipType = CanonicalRelationshipType = {}));
