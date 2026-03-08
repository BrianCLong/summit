"use strict";
/**
 * Foreign Policy Analysis Types
 * Comprehensive analysis of foreign policy positions, strategies, and evolution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyShiftType = exports.PolicyPosition = exports.PolicyDomain = void 0;
var PolicyDomain;
(function (PolicyDomain) {
    PolicyDomain["SECURITY"] = "SECURITY";
    PolicyDomain["DEFENSE"] = "DEFENSE";
    PolicyDomain["TRADE"] = "TRADE";
    PolicyDomain["DIPLOMACY"] = "DIPLOMACY";
    PolicyDomain["ECONOMIC"] = "ECONOMIC";
    PolicyDomain["HUMAN_RIGHTS"] = "HUMAN_RIGHTS";
    PolicyDomain["ENVIRONMENT"] = "ENVIRONMENT";
    PolicyDomain["DEVELOPMENT"] = "DEVELOPMENT";
    PolicyDomain["INTELLIGENCE"] = "INTELLIGENCE";
    PolicyDomain["CYBER"] = "CYBER";
    PolicyDomain["SPACE"] = "SPACE";
    PolicyDomain["ENERGY"] = "ENERGY";
    PolicyDomain["MIGRATION"] = "MIGRATION";
    PolicyDomain["HEALTH"] = "HEALTH";
    PolicyDomain["COUNTERTERRORISM"] = "COUNTERTERRORISM";
    PolicyDomain["NUCLEAR"] = "NUCLEAR";
    PolicyDomain["HUMANITARIAN"] = "HUMANITARIAN";
})(PolicyDomain || (exports.PolicyDomain = PolicyDomain = {}));
var PolicyPosition;
(function (PolicyPosition) {
    PolicyPosition["STRONGLY_SUPPORT"] = "STRONGLY_SUPPORT";
    PolicyPosition["SUPPORT"] = "SUPPORT";
    PolicyPosition["NEUTRAL"] = "NEUTRAL";
    PolicyPosition["OPPOSE"] = "OPPOSE";
    PolicyPosition["STRONGLY_OPPOSE"] = "STRONGLY_OPPOSE";
    PolicyPosition["ABSTAIN"] = "ABSTAIN";
    PolicyPosition["CONDITIONAL"] = "CONDITIONAL";
    PolicyPosition["EVOLVING"] = "EVOLVING";
})(PolicyPosition || (exports.PolicyPosition = PolicyPosition = {}));
var PolicyShiftType;
(function (PolicyShiftType) {
    PolicyShiftType["MAJOR_REVERSAL"] = "MAJOR_REVERSAL";
    PolicyShiftType["GRADUAL_SHIFT"] = "GRADUAL_SHIFT";
    PolicyShiftType["TACTICAL_ADJUSTMENT"] = "TACTICAL_ADJUSTMENT";
    PolicyShiftType["RHETORICAL_CHANGE"] = "RHETORICAL_CHANGE";
    PolicyShiftType["LEADERSHIP_DRIVEN"] = "LEADERSHIP_DRIVEN";
    PolicyShiftType["CRISIS_DRIVEN"] = "CRISIS_DRIVEN";
    PolicyShiftType["DOMESTIC_DRIVEN"] = "DOMESTIC_DRIVEN";
    PolicyShiftType["ALLIANCE_DRIVEN"] = "ALLIANCE_DRIVEN";
})(PolicyShiftType || (exports.PolicyShiftType = PolicyShiftType = {}));
