import entityResolvers from './entity';
import relationshipResolvers from './relationship';
import userResolvers from './user';
import investigationResolvers from './investigation';
import { WargameResolver } from './WargameResolver'; // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
import publisherResolvers from './publisher';

// Instantiate the WargameResolver
const wargameResolver = new WargameResolver(); // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY

const resolvers = {
  Query: {
    ...entityResolvers.Query,
    ...userResolvers.Query,
    ...investigationResolvers.Query,
    ...publisherResolvers.Query,
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
    ...publisherResolvers.Mutation,
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    runWarGameSimulation: wargameResolver.runWarGameSimulation.bind(wargameResolver),
    updateCrisisScenario: wargameResolver.updateCrisisScenario.bind(wargameResolver),
    deleteCrisisScenario: wargameResolver.deleteCrisisScenario.bind(wargameResolver),
  },
};

export default resolvers;

