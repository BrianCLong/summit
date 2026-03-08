"use strict";
/**
 * Multilateral Organization Tracking Types
 * Comprehensive types for tracking UN, regional organizations, and international institutions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VotingPower = exports.MembershipStatus = exports.OrganizationType = void 0;
var OrganizationType;
(function (OrganizationType) {
    OrganizationType["UN_SYSTEM"] = "UN_SYSTEM";
    OrganizationType["REGIONAL_ORGANIZATION"] = "REGIONAL_ORGANIZATION";
    OrganizationType["SECURITY_ALLIANCE"] = "SECURITY_ALLIANCE";
    OrganizationType["ECONOMIC_BLOC"] = "ECONOMIC_BLOC";
    OrganizationType["DEVELOPMENT_BANK"] = "DEVELOPMENT_BANK";
    OrganizationType["SPECIALIZED_AGENCY"] = "SPECIALIZED_AGENCY";
    OrganizationType["INTERGOVERNMENTAL"] = "INTERGOVERNMENTAL";
    OrganizationType["TREATY_ORGANIZATION"] = "TREATY_ORGANIZATION";
    OrganizationType["FORUM"] = "FORUM";
    OrganizationType["COUNCIL"] = "COUNCIL";
})(OrganizationType || (exports.OrganizationType = OrganizationType = {}));
var MembershipStatus;
(function (MembershipStatus) {
    MembershipStatus["FULL_MEMBER"] = "FULL_MEMBER";
    MembershipStatus["ASSOCIATE_MEMBER"] = "ASSOCIATE_MEMBER";
    MembershipStatus["OBSERVER"] = "OBSERVER";
    MembershipStatus["DIALOGUE_PARTNER"] = "DIALOGUE_PARTNER";
    MembershipStatus["CANDIDATE"] = "CANDIDATE";
    MembershipStatus["SUSPENDED"] = "SUSPENDED";
    MembershipStatus["FORMER_MEMBER"] = "FORMER_MEMBER";
    MembershipStatus["APPLICANT"] = "APPLICANT";
})(MembershipStatus || (exports.MembershipStatus = MembershipStatus = {}));
var VotingPower;
(function (VotingPower) {
    VotingPower["VETO_POWER"] = "VETO_POWER";
    VotingPower["WEIGHTED_VOTE"] = "WEIGHTED_VOTE";
    VotingPower["EQUAL_VOTE"] = "EQUAL_VOTE";
    VotingPower["NO_VOTE"] = "NO_VOTE";
    VotingPower["QUALIFIED_MAJORITY"] = "QUALIFIED_MAJORITY";
    VotingPower["CONSENSUS_REQUIRED"] = "CONSENSUS_REQUIRED";
})(VotingPower || (exports.VotingPower = VotingPower = {}));
activity;
Level: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW' | 'DORMANT';
// Analysis
keyIssues: string[];
currentChallenges: string[];
successStories: string[];
reformProposals ?  : Reform[];
// Metadata
website ?  : string;
lastUpdated: Date;
sources: Source[];
