import entityResolvers from './entity';
import relationshipResolvers from './relationship';
import userResolvers from './user';
import investigationResolvers from './investigation';
import { WargameResolver } from '../../resolvers/WargameResolver.js'; // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
import evidenceResolvers from './evidence.js';
import evidenceOkResolvers from './evidenceOk.js';
import trustRiskResolvers from './trust-risk.js';
import provenanceResolvers from './provenance.js';
import supportTicketResolvers from './supportTicket.js';
import sprint28Resolvers from './sprint28.js';

// MC Platform v0.4.0 Transcendent Intelligence Resolvers (DISABLED - incomplete)
// import { v040Resolvers } from './v040';

// MC Platform v0.4.1 Sovereign Safeguards Resolvers (DISABLED - incomplete)
// import { v041Resolvers } from './v041';

// Instantiate the WargameResolver
const wargameResolver = new WargameResolver(); // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY

const resolvers = {
  Query: {
    ...entityResolvers.Query,
    ...userResolvers.Query,
    ...investigationResolvers.Query,
    ...(evidenceOkResolvers.Query || {}),
    ...(trustRiskResolvers.Query || {}),
    ...(provenanceResolvers.Query || {}),
    ...(supportTicketResolvers.Query || {}),
    ...(sprint28Resolvers.Query || {}),
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
    ...entityResolvers.Mutation,
    ...relationshipResolvers.Mutation,
    ...userResolvers.Mutation,
    ...investigationResolvers.Mutation,
    ...(evidenceResolvers.Mutation || {}),
    ...(trustRiskResolvers.Mutation || {}),
    ...(provenanceResolvers.Mutation || {}),
    ...(supportTicketResolvers.Mutation || {}),
    ...(sprint28Resolvers.Mutation || {}),
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
};

export default resolvers;
