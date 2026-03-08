"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const entity_js_1 = __importDefault(require("./entity.js"));
const relationship_js_1 = __importDefault(require("./relationship.js"));
const user_js_1 = __importDefault(require("./user.js"));
const investigation_js_1 = __importDefault(require("./investigation.js"));
const auth_js_1 = __importDefault(require("./auth.js"));
const WargameResolver_js_1 = require("../../resolvers/WargameResolver.js"); // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
const evidence_js_1 = __importDefault(require("./evidence.js"));
const evidenceOk_js_1 = __importDefault(require("./evidenceOk.js"));
const health_js_1 = __importDefault(require("./health.js"));
const trust_risk_js_1 = __importDefault(require("./trust-risk.js"));
const provenance_js_1 = __importDefault(require("./provenance.js"));
const supportTicket_js_1 = __importDefault(require("./supportTicket.js"));
const sprint28_js_1 = __importDefault(require("./sprint28.js"));
const electronic_warfare_js_1 = __importDefault(require("./electronic-warfare.js"));
const collaboration_js_1 = require("./collaboration.js");
const cases_js_1 = require("./cases.js");
const comments_js_1 = require("./comments.js");
const cognitive_security_js_1 = require("./cognitive-security.js");
const deduplication_js_1 = require("./deduplication.js");
const ticket_links_js_1 = __importDefault(require("./ticket-links.js"));
const resolvers_js_1 = require("../../modules/factgov/resolvers.js");
const osint_synint_js_1 = require("./osint-synint.js");
// MC Platform v0.4.0 Transcendent Intelligence Resolvers (DISABLED - incomplete)
// import { v040Resolvers } from './v040.js';
// MC Platform v0.4.1 Sovereign Safeguards Resolvers (DISABLED - incomplete)
// import { v041Resolvers } from './v041.js';
// Instantiate the WargameResolver
const wargameResolver = new WargameResolver_js_1.WargameResolver(); // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
const resolvers = {
    Query: {
        ...entity_js_1.default.Query,
        ...user_js_1.default.Query,
        ...health_js_1.default.Query,
        ...investigation_js_1.default.Query,
        ...(auth_js_1.default.Query || {}),
        ...(evidenceOk_js_1.default.Query || {}),
        ...(trust_risk_js_1.default.Query || {}),
        ...(provenance_js_1.default.Query || {}),
        ...(supportTicket_js_1.default.Query || {}),
        ...(sprint28_js_1.default.Query || {}),
        ...(electronic_warfare_js_1.default.Query || {}),
        ...(collaboration_js_1.collaborationResolvers.Query || {}),
        ...(cases_js_1.caseResolvers.Query || {}),
        ...(comments_js_1.commentResolvers.Query || {}),
        ...(cognitive_security_js_1.cognitiveSecurityResolvers.Query || {}),
        ...(deduplication_js_1.deduplicationResolvers.Query || {}),
        ...(ticket_links_js_1.default.Query || {}),
        ...(resolvers_js_1.factGovResolvers.Query || {}),
        // MC Platform v0.4.0 Transcendent Intelligence (DISABLED)
        // ...(v040Resolvers.Query || {}),
        // MC Platform v0.4.1 Sovereign Safeguards (DISABLED)
        // ...(v041Resolvers.Query || {}),
        // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
        getCrisisTelemetry: wargameResolver.getCrisisTelemetry.bind(wargameResolver),
        getAdversaryIntentEstimates: wargameResolver.getAdversaryIntentEstimates.bind(wargameResolver),
        getNarrativeHeatmapData: wargameResolver.getNarrativeHeatmapData.bind(wargameResolver),
        getStrategicResponsePlaybooks: wargameResolver.getStrategicResponsePlaybooks.bind(wargameResolver),
        getCrisisScenario: wargameResolver.getCrisisScenario.bind(wargameResolver),
        getAllCrisisScenarios: wargameResolver.getAllCrisisScenarios.bind(wargameResolver),
    },
    Mutation: {
        ...(osint_synint_js_1.osintSynintResolvers.Mutation || {}),
        ...entity_js_1.default.Mutation,
        ...relationship_js_1.default.Mutation,
        ...user_js_1.default.Mutation,
        ...investigation_js_1.default.Mutation,
        ...(auth_js_1.default.Mutation || {}),
        ...(evidence_js_1.default.Mutation || {}),
        ...(trust_risk_js_1.default.Mutation || {}),
        ...(provenance_js_1.default.Mutation || {}),
        ...(supportTicket_js_1.default.Mutation || {}),
        ...(sprint28_js_1.default.Mutation || {}),
        ...(electronic_warfare_js_1.default.Mutation || {}),
        ...(collaboration_js_1.collaborationResolvers.Mutation || {}),
        ...(cases_js_1.caseResolvers.Mutation || {}),
        ...(comments_js_1.commentResolvers.Mutation || {}),
        ...(cognitive_security_js_1.cognitiveSecurityResolvers.Mutation || {}),
        ...(resolvers_js_1.factGovResolvers.Mutation || {}),
        // MC Platform v0.4.0 Transcendent Intelligence (DISABLED)
        // ...(v040Resolvers.Mutation || {}),
        // MC Platform v0.4.1 Sovereign Safeguards (DISABLED)
        // ...(v041Resolvers.Mutation || {}),
        // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
        runWarGameSimulation: wargameResolver.runWarGameSimulation.bind(wargameResolver),
        updateCrisisScenario: wargameResolver.updateCrisisScenario.bind(wargameResolver),
        deleteCrisisScenario: wargameResolver.deleteCrisisScenario.bind(wargameResolver),
    },
    SupportTicket: supportTicket_js_1.default.SupportTicket,
    WarRoom: collaboration_js_1.collaborationResolvers.WarRoom,
    Case: cases_js_1.caseResolvers.Case,
    Comment: comments_js_1.commentResolvers.Comment,
    Subscription: {
        ...(collaboration_js_1.collaborationResolvers.Subscription || {}),
        ...(cognitive_security_js_1.cognitiveSecurityResolvers.Subscription || {}),
    },
    // Cognitive Security type resolvers
    CogSecClaim: cognitive_security_js_1.cognitiveSecurityResolvers.CogSecClaim,
    CogSecCampaign: cognitive_security_js_1.cognitiveSecurityResolvers.CogSecCampaign,
    CogSecIncident: cognitive_security_js_1.cognitiveSecurityResolvers.CogSecIncident,
    VerificationAppeal: cognitive_security_js_1.cognitiveSecurityResolvers.VerificationAppeal,
    AudienceSegment: cognitive_security_js_1.cognitiveSecurityResolvers.AudienceSegment,
    NarrativeCascade: cognitive_security_js_1.cognitiveSecurityResolvers.NarrativeCascade,
    NarrativeConflict: cognitive_security_js_1.cognitiveSecurityResolvers.NarrativeConflict,
    Ticket: ticket_links_js_1.default.Ticket,
};
exports.default = resolvers;
