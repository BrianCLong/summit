"use strict";
/**
 * Crisis Diplomacy Types
 * Comprehensive types for monitoring conflict mediation, peace processes, and crisis communications
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediationType = exports.EscalationLevel = exports.CrisisPhase = exports.CrisisType = void 0;
var CrisisType;
(function (CrisisType) {
    CrisisType["ARMED_CONFLICT"] = "ARMED_CONFLICT";
    CrisisType["TERRITORIAL_DISPUTE"] = "TERRITORIAL_DISPUTE";
    CrisisType["DIPLOMATIC_CRISIS"] = "DIPLOMATIC_CRISIS";
    CrisisType["HUMANITARIAN_CRISIS"] = "HUMANITARIAN_CRISIS";
    CrisisType["POLITICAL_CRISIS"] = "POLITICAL_CRISIS";
    CrisisType["ECONOMIC_CRISIS"] = "ECONOMIC_CRISIS";
    CrisisType["REFUGEE_CRISIS"] = "REFUGEE_CRISIS";
    CrisisType["HOSTAGE_CRISIS"] = "HOSTAGE_CRISIS";
    CrisisType["NUCLEAR_CRISIS"] = "NUCLEAR_CRISIS";
    CrisisType["CYBER_CRISIS"] = "CYBER_CRISIS";
    CrisisType["TERRORIST_INCIDENT"] = "TERRORIST_INCIDENT";
    CrisisType["INTERNATIONAL_INCIDENT"] = "INTERNATIONAL_INCIDENT";
})(CrisisType || (exports.CrisisType = CrisisType = {}));
var CrisisPhase;
(function (CrisisPhase) {
    CrisisPhase["EMERGING"] = "EMERGING";
    CrisisPhase["ESCALATING"] = "ESCALATING";
    CrisisPhase["PEAK"] = "PEAK";
    CrisisPhase["DE_ESCALATING"] = "DE_ESCALATING";
    CrisisPhase["STABILIZING"] = "STABILIZING";
    CrisisPhase["RESOLVED"] = "RESOLVED";
    CrisisPhase["FROZEN"] = "FROZEN";
    CrisisPhase["RECURRING"] = "RECURRING";
})(CrisisPhase || (exports.CrisisPhase = CrisisPhase = {}));
var EscalationLevel;
(function (EscalationLevel) {
    EscalationLevel["LOW"] = "LOW";
    EscalationLevel["MODERATE"] = "MODERATE";
    EscalationLevel["HIGH"] = "HIGH";
    EscalationLevel["CRITICAL"] = "CRITICAL";
    EscalationLevel["MAXIMUM"] = "MAXIMUM";
})(EscalationLevel || (exports.EscalationLevel = EscalationLevel = {}));
var MediationType;
(function (MediationType) {
    MediationType["DIRECT_NEGOTIATION"] = "DIRECT_NEGOTIATION";
    MediationType["THIRD_PARTY_MEDIATION"] = "THIRD_PARTY_MEDIATION";
    MediationType["SHUTTLE_DIPLOMACY"] = "SHUTTLE_DIPLOMACY";
    MediationType["TRACK_ONE"] = "TRACK_ONE";
    MediationType["TRACK_TWO"] = "TRACK_TWO";
    MediationType["TRACK_THREE"] = "TRACK_THREE";
    MediationType["MULTI_TRACK"] = "MULTI_TRACK";
    MediationType["UN_MEDIATION"] = "UN_MEDIATION";
    MediationType["REGIONAL_MEDIATION"] = "REGIONAL_MEDIATION";
    MediationType["GOOD_OFFICES"] = "GOOD_OFFICES";
    MediationType["ARBITRATION"] = "ARBITRATION";
    MediationType["CONCILIATION"] = "CONCILIATION";
})(MediationType || (exports.MediationType = MediationType = {}));
