import entityResolvers from './entity';
import relationshipResolvers from './relationship';
import userResolvers from './user';
import investigationResolvers from './investigation';
import { WargameResolver } from './WargameResolver'; // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
import ssoResolvers from './sso';
import flagResolvers from './flags';
import pluginResolvers from './plugins';

// Instantiate the WargameResolver
const wargameResolver = new WargameResolver(); // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY

const resolvers = {
  Query: {
    ...entityResolvers.Query,
    ...userResolvers.Query,
    ...investigationResolvers.Query,
    ...ssoResolvers.Query,
    ...flagResolvers.Query,
    ...pluginResolvers.Query,
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
    ...ssoResolvers.Mutation,
    ...flagResolvers.Mutation,
    ...pluginResolvers.Mutation,
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    runWarGameSimulation: wargameResolver.runWarGameSimulation.bind(wargameResolver),
    updateCrisisScenario: wargameResolver.updateCrisisScenario.bind(wargameResolver),
    deleteCrisisScenario: wargameResolver.deleteCrisisScenario.bind(wargameResolver),
  },
};

export default resolvers;

