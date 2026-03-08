"use strict";
/**
 * WMD Tracking Type Definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageCondition = exports.FacilityStatus = exports.ConfidenceLevel = exports.ProgramStatus = exports.SecurityLevel = exports.ThreatLevel = exports.WeaponizationLevel = exports.PathogenType = exports.ChemicalFacilityType = exports.ChemicalAgentType = void 0;
var ChemicalAgentType;
(function (ChemicalAgentType) {
    ChemicalAgentType["NERVE_AGENT"] = "nerve_agent";
    ChemicalAgentType["BLISTER_AGENT"] = "blister_agent";
    ChemicalAgentType["CHOKING_AGENT"] = "choking_agent";
    ChemicalAgentType["BLOOD_AGENT"] = "blood_agent";
    ChemicalAgentType["INCAPACITATING"] = "incapacitating";
    ChemicalAgentType["RIOT_CONTROL"] = "riot_control";
    ChemicalAgentType["PRECURSOR"] = "precursor";
    ChemicalAgentType["UNKNOWN"] = "unknown";
})(ChemicalAgentType || (exports.ChemicalAgentType = ChemicalAgentType = {}));
var ChemicalFacilityType;
(function (ChemicalFacilityType) {
    ChemicalFacilityType["PRODUCTION"] = "production";
    ChemicalFacilityType["STORAGE"] = "storage";
    ChemicalFacilityType["DESTRUCTION"] = "destruction";
    ChemicalFacilityType["RESEARCH"] = "research";
    ChemicalFacilityType["DUAL_USE"] = "dual_use";
    ChemicalFacilityType["PRECURSOR_PRODUCTION"] = "precursor_production";
})(ChemicalFacilityType || (exports.ChemicalFacilityType = ChemicalFacilityType = {}));
var PathogenType;
(function (PathogenType) {
    PathogenType["BACTERIA"] = "bacteria";
    PathogenType["VIRUS"] = "virus";
    PathogenType["TOXIN"] = "toxin";
    PathogenType["FUNGUS"] = "fungus";
    PathogenType["PRION"] = "prion";
    PathogenType["UNKNOWN"] = "unknown";
})(PathogenType || (exports.PathogenType = PathogenType = {}));
var WeaponizationLevel;
(function (WeaponizationLevel) {
    WeaponizationLevel["RESEARCH"] = "research";
    WeaponizationLevel["PRODUCTION"] = "production";
    WeaponizationLevel["STOCKPILE"] = "stockpile";
    WeaponizationLevel["WEAPONIZED"] = "weaponized";
    WeaponizationLevel["DEPLOYED"] = "deployed";
    WeaponizationLevel["NONE"] = "none";
})(WeaponizationLevel || (exports.WeaponizationLevel = WeaponizationLevel = {}));
var ThreatLevel;
(function (ThreatLevel) {
    ThreatLevel["CRITICAL"] = "critical";
    ThreatLevel["HIGH"] = "high";
    ThreatLevel["MODERATE"] = "moderate";
    ThreatLevel["LOW"] = "low";
    ThreatLevel["MINIMAL"] = "minimal";
})(ThreatLevel || (exports.ThreatLevel = ThreatLevel = {}));
var SecurityLevel;
(function (SecurityLevel) {
    SecurityLevel["MAXIMUM"] = "maximum";
    SecurityLevel["HIGH"] = "high";
    SecurityLevel["MEDIUM"] = "medium";
    SecurityLevel["LOW"] = "low";
    SecurityLevel["INADEQUATE"] = "inadequate";
})(SecurityLevel || (exports.SecurityLevel = SecurityLevel = {}));
var ProgramStatus;
(function (ProgramStatus) {
    ProgramStatus["ACTIVE"] = "active";
    ProgramStatus["SUSPENDED"] = "suspended";
    ProgramStatus["ABANDONED"] = "abandoned";
    ProgramStatus["DECLARED_ENDED"] = "declared_ended";
    ProgramStatus["COVERT"] = "covert";
    ProgramStatus["SUSPECTED"] = "suspected";
    ProgramStatus["UNKNOWN"] = "unknown";
})(ProgramStatus || (exports.ProgramStatus = ProgramStatus = {}));
var ConfidenceLevel;
(function (ConfidenceLevel) {
    ConfidenceLevel["CONFIRMED"] = "confirmed";
    ConfidenceLevel["HIGH"] = "high";
    ConfidenceLevel["MODERATE"] = "moderate";
    ConfidenceLevel["LOW"] = "low";
    ConfidenceLevel["SUSPECTED"] = "suspected";
})(ConfidenceLevel || (exports.ConfidenceLevel = ConfidenceLevel = {}));
var FacilityStatus;
(function (FacilityStatus) {
    FacilityStatus["OPERATIONAL"] = "operational";
    FacilityStatus["UNDER_CONSTRUCTION"] = "under_construction";
    FacilityStatus["PLANNED"] = "planned";
    FacilityStatus["SUSPENDED"] = "suspended";
    FacilityStatus["SHUTDOWN"] = "shutdown";
    FacilityStatus["DECOMMISSIONED"] = "decommissioned";
})(FacilityStatus || (exports.FacilityStatus = FacilityStatus = {}));
var StorageCondition;
(function (StorageCondition) {
    StorageCondition["WEAPONIZED"] = "weaponized";
    StorageCondition["BULK_STORAGE"] = "bulk_storage";
    StorageCondition["PRECURSOR_FORM"] = "precursor_form";
    StorageCondition["BINARY"] = "binary";
    StorageCondition["DESTRUCTION_QUEUE"] = "destruction_queue";
    StorageCondition["UNKNOWN"] = "unknown";
})(StorageCondition || (exports.StorageCondition = StorageCondition = {}));
