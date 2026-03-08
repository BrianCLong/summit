"use strict";
/**
 * Represents a phase in an Influence Operation campaign.
 * Based on the Summit Influence Ops Phase Model v1.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignPhaseStatus = exports.CampaignPhaseName = void 0;
var CampaignPhaseName;
(function (CampaignPhaseName) {
    CampaignPhaseName["SHAPING"] = "Shaping";
    CampaignPhaseName["SEEDING"] = "Seeding";
    CampaignPhaseName["AMPLIFICATION"] = "Amplification";
    CampaignPhaseName["CONSOLIDATION"] = "Consolidation";
    CampaignPhaseName["REACTIVATION"] = "Reactivation";
})(CampaignPhaseName || (exports.CampaignPhaseName = CampaignPhaseName = {}));
var CampaignPhaseStatus;
(function (CampaignPhaseStatus) {
    CampaignPhaseStatus["PLANNED"] = "Planned";
    CampaignPhaseStatus["ACTIVE"] = "Active";
    CampaignPhaseStatus["COMPLETED"] = "Completed";
    CampaignPhaseStatus["SUSPENDED"] = "Suspended";
})(CampaignPhaseStatus || (exports.CampaignPhaseStatus = CampaignPhaseStatus = {}));
