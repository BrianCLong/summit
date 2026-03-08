"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignType = exports.ThreatLevel = void 0;
var ThreatLevel;
(function (ThreatLevel) {
    ThreatLevel["LOW"] = "LOW";
    ThreatLevel["MEDIUM"] = "MEDIUM";
    ThreatLevel["HIGH"] = "HIGH";
    ThreatLevel["CRITICAL"] = "CRITICAL";
})(ThreatLevel || (exports.ThreatLevel = ThreatLevel = {}));
var CampaignType;
(function (CampaignType) {
    CampaignType["COORDINATED_INAUTHENTIC_BEHAVIOR"] = "COORDINATED_INAUTHENTIC_BEHAVIOR";
    CampaignType["NARRATIVE_MANIPULATION"] = "NARRATIVE_MANIPULATION";
    CampaignType["ASTROTURFING"] = "ASTROTURFING";
    CampaignType["PSYOPS"] = "PSYOPS";
    CampaignType["UNKNOWN"] = "UNKNOWN";
})(CampaignType || (exports.CampaignType = CampaignType = {}));
