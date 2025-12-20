import entityResolvers from './entity';
import relationshipResolvers from './relationship';
import userResolvers from './user';
import investigationResolvers from './investigation';
import { WargameResolver } from '../../resolvers/WargameResolver.js'; // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
import evidenceResolvers from './evidence.js';
import evidenceOkResolvers from './evidenceOk.js';
import trustRiskResolvers from './trust-risk.js';
import provenanceResolvers from './provenance.js';
// MC Platform v0.4.0 Transcendent Intelligence Resolvers
import { v040Resolvers } from './v040';
// MC Platform v0.4.1 Sovereign Safeguards Resolvers
import { v041Resolvers } from './v041';
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
        // MC Platform v0.4.0 Transcendent Intelligence
        ...(v040Resolvers.Query || {}),
        // MC Platform v0.4.1 Sovereign Safeguards
        ...(v041Resolvers.Query || {}),
        // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
        getCrisisTelemetry: wargameResolver.getCrisisTelemetry.bind(wargameResolver),
        getAdversaryIntentEstimates: wargameResolver.getAdversaryIntentEstimates.bind(wargameResolver),
        getNarrativeHeatmapData: wargameResolver.getNarrativeHeatmapData.bind(wargameResolver),
        getStrategicResponsePlaybooks: wargameResolver.getStrategicResponsePlaybooks.bind(wargameResolver),
        getCrisisScenario: wargameResolver.getCrisisScenario.bind(wargameResolver),
        getAllCrisisScenarios: wargameResolver.getAllCrisisScenarios.bind(wargameResolver),
    },
    Mutation: {
        ...entityResolvers.Mutation,
        ...relationshipResolvers.Mutation,
        ...userResolvers.Mutation,
        ...investigationResolvers.Mutation,
        ...(evidenceResolvers.Mutation || {}),
        ...(trustRiskResolvers.Mutation || {}),
        ...(provenanceResolvers.Mutation || {}),
        // MC Platform v0.4.0 Transcendent Intelligence
        ...(v040Resolvers.Mutation || {}),
        // MC Platform v0.4.1 Sovereign Safeguards
        ...(v041Resolvers.Mutation || {}),
        // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
        runWarGameSimulation: wargameResolver.runWarGameSimulation.bind(wargameResolver),
        updateCrisisScenario: wargameResolver.updateCrisisScenario.bind(wargameResolver),
        deleteCrisisScenario: wargameResolver.deleteCrisisScenario.bind(wargameResolver),
    },
};
export default resolvers;
//# sourceMappingURL=index.js.map