import entityResolvers from './entity.js';
import relationshipResolvers from './relationship.js';
import userResolvers from './user.js';
import investigationResolvers from './investigation.js';
import authResolvers from './auth.js';
import { WargameResolver } from '../../resolvers/WargameResolver.js'; // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
import evidenceResolvers from './evidence.js';
import evidenceOkResolvers from './evidenceOk.js';
import healthResolvers from './health.js';
import trustRiskResolvers from './trust-risk.js';
import provenanceResolvers from './provenance.js';
import supportTicketResolvers from './supportTicket.js';
import sprint28Resolvers from './sprint28.js';
import ewResolvers from './electronic-warfare.js';
import { collaborationResolvers } from './collaboration.js';
import { cognitiveSecurityResolvers } from './cognitive-security.js';
import { deduplicationResolvers } from './deduplication.js';
import ticketLinksResolvers from './ticket-links.js';
import { factGovResolvers } from '../../modules/factgov/resolvers.js';
import { osintSynintResolvers } from './osint-synint.js';

// MC Platform v0.4.0 Transcendent Intelligence Resolvers (DISABLED - incomplete)
// import { v040Resolvers } from './v040.js';

// MC Platform v0.4.1 Sovereign Safeguards Resolvers (DISABLED - incomplete)
// import { v041Resolvers } from './v041.js';

// Instantiate the WargameResolver
const wargameResolver = new WargameResolver(); // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY

const resolvers = {
  Query: {
    ...entityResolvers.Query,
    ...userResolvers.Query,
    ...healthResolvers.Query,
    ...investigationResolvers.Query,
    ...(authResolvers.Query || {}),
    ...(evidenceOkResolvers.Query || {}),
    ...(trustRiskResolvers.Query || {}),
    ...(provenanceResolvers.Query || {}),
    ...(supportTicketResolvers.Query || {}),
    ...(sprint28Resolvers.Query || {}),
    ...(ewResolvers.Query || {}),
    ...(collaborationResolvers.Query || {}),
    ...(cognitiveSecurityResolvers.Query || {}),
    ...(deduplicationResolvers.Query || {}),
    ...(ticketLinksResolvers.Query || {}),
    ...(factGovResolvers.Query || {}),
    // MC Platform v0.4.0 Transcendent Intelligence (DISABLED)
    // ...(v040Resolvers.Query || {}),
    // MC Platform v0.4.1 Sovereign Safeguards (DISABLED)
    // ...(v041Resolvers.Query || {}),
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    getCrisisTelemetry:
      wargameResolver.getCrisisTelemetry.bind(wargameResolver),
    getAdversaryIntentEstimates:
      wargameResolver.getAdversaryIntentEstimates.bind(wargameResolver),
    getNarrativeHeatmapData:
      wargameResolver.getNarrativeHeatmapData.bind(wargameResolver),
    getStrategicResponsePlaybooks:
      wargameResolver.getStrategicResponsePlaybooks.bind(wargameResolver),
    getCrisisScenario: wargameResolver.getCrisisScenario.bind(wargameResolver),
    getAllCrisisScenarios:
      wargameResolver.getAllCrisisScenarios.bind(wargameResolver),
  },
  Mutation: {
    ...(osintSynintResolvers.Mutation || {}),
    ...entityResolvers.Mutation,
    ...relationshipResolvers.Mutation,
    ...userResolvers.Mutation,
    ...investigationResolvers.Mutation,
    ...(authResolvers.Mutation || {}),
    ...(evidenceResolvers.Mutation || {}),
    ...(trustRiskResolvers.Mutation || {}),
    ...(provenanceResolvers.Mutation || {}),
    ...(supportTicketResolvers.Mutation || {}),
    ...(sprint28Resolvers.Mutation || {}),
    ...(ewResolvers.Mutation || {}),
    ...(collaborationResolvers.Mutation || {}),
    ...(cognitiveSecurityResolvers.Mutation || {}),
    ...(factGovResolvers.Mutation || {}),
    // MC Platform v0.4.0 Transcendent Intelligence (DISABLED)
    // ...(v040Resolvers.Mutation || {}),
    // MC Platform v0.4.1 Sovereign Safeguards (DISABLED)
    // ...(v041Resolvers.Mutation || {}),
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    runWarGameSimulation:
      wargameResolver.runWarGameSimulation.bind(wargameResolver),
    updateCrisisScenario:
      wargameResolver.updateCrisisScenario.bind(wargameResolver),
    deleteCrisisScenario:
      wargameResolver.deleteCrisisScenario.bind(wargameResolver),
  },
  SupportTicket: supportTicketResolvers.SupportTicket,
  WarRoom: collaborationResolvers.WarRoom,
  Subscription: {
    ...(collaborationResolvers.Subscription || {}),
    ...(cognitiveSecurityResolvers.Subscription || {}),
  },
  // Cognitive Security type resolvers
  CogSecClaim: cognitiveSecurityResolvers.CogSecClaim,
  CogSecCampaign: cognitiveSecurityResolvers.CogSecCampaign,
  CogSecIncident: cognitiveSecurityResolvers.CogSecIncident,
  VerificationAppeal: cognitiveSecurityResolvers.VerificationAppeal,
  AudienceSegment: (cognitiveSecurityResolvers as any).AudienceSegment,
  NarrativeCascade: (cognitiveSecurityResolvers as any).NarrativeCascade,
  NarrativeConflict: (cognitiveSecurityResolvers as any).NarrativeConflict,
  Ticket: ticketLinksResolvers.Ticket,
};

export default resolvers;
