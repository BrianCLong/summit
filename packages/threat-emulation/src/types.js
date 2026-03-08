"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatActorMotivation = exports.ThreatActorCategory = void 0;
/**
 * Threat Actor Categories
 */
var ThreatActorCategory;
(function (ThreatActorCategory) {
    ThreatActorCategory["APT"] = "apt";
    ThreatActorCategory["NATION_STATE"] = "nation-state";
    ThreatActorCategory["CYBERCRIME"] = "cybercrime";
    ThreatActorCategory["HACKTIVIST"] = "hacktivist";
    ThreatActorCategory["INSIDER"] = "insider";
    ThreatActorCategory["SCRIPT_KIDDIE"] = "script-kiddie";
})(ThreatActorCategory || (exports.ThreatActorCategory = ThreatActorCategory = {}));
/**
 * Threat Actor Motivation
 */
var ThreatActorMotivation;
(function (ThreatActorMotivation) {
    ThreatActorMotivation["ESPIONAGE"] = "espionage";
    ThreatActorMotivation["FINANCIAL"] = "financial";
    ThreatActorMotivation["DISRUPTION"] = "disruption";
    ThreatActorMotivation["DESTRUCTION"] = "destruction";
    ThreatActorMotivation["IDEOLOGY"] = "ideology";
    ThreatActorMotivation["COERCION"] = "coercion";
    ThreatActorMotivation["REVENGE"] = "revenge";
    ThreatActorMotivation["UNKNOWN"] = "unknown";
})(ThreatActorMotivation || (exports.ThreatActorMotivation = ThreatActorMotivation = {}));
