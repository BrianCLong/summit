"use strict";
/**
 * Foreign Fighters Types
 * Types for tracking foreign fighters and returnees
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturnReason = exports.ThreatLevel = exports.FighterStatus = void 0;
var FighterStatus;
(function (FighterStatus) {
    FighterStatus["TRAVELING"] = "TRAVELING";
    FighterStatus["IN_CONFLICT_ZONE"] = "IN_CONFLICT_ZONE";
    FighterStatus["RETURNED"] = "RETURNED";
    FighterStatus["DETAINED"] = "DETAINED";
    FighterStatus["DECEASED"] = "DECEASED";
    FighterStatus["UNKNOWN"] = "UNKNOWN";
})(FighterStatus || (exports.FighterStatus = FighterStatus = {}));
var ThreatLevel;
(function (ThreatLevel) {
    ThreatLevel["CRITICAL"] = "CRITICAL";
    ThreatLevel["HIGH"] = "HIGH";
    ThreatLevel["MEDIUM"] = "MEDIUM";
    ThreatLevel["LOW"] = "LOW";
    ThreatLevel["MINIMAL"] = "MINIMAL";
})(ThreatLevel || (exports.ThreatLevel = ThreatLevel = {}));
var ReturnReason;
(function (ReturnReason) {
    ReturnReason["DISILLUSIONMENT"] = "DISILLUSIONMENT";
    ReturnReason["INJURY"] = "INJURY";
    ReturnReason["FAMILY"] = "FAMILY";
    ReturnReason["DEPORTATION"] = "DEPORTATION";
    ReturnReason["MISSION"] = "MISSION";
    ReturnReason["CONFLICT_END"] = "CONFLICT_END";
    ReturnReason["UNKNOWN"] = "UNKNOWN";
})(ReturnReason || (exports.ReturnReason = ReturnReason = {}));
