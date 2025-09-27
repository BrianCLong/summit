import { harmonizedInsight } from '../insights/harmonizedInsight';
import { dynamicCoordination } from '../insights/dynamicCoordination';
import { dataConvergence } from '../insights/dataConvergence';
import { truthSync } from '../insights/truthSync';
import { scenarioArchitect } from '../insights/scenarioArchitect';
import { integrityAssurance } from '../insights/integrityAssurance';
import { engagementCascade } from '../insights/engagementCascade';
import { entropyBalancer } from '../insights/entropyBalancer';
import { collectiveSynergy } from '../insights/collectiveSynergy';
import { riskMitigator } from '../insights/riskMitigator';
import { narrativeSynthesizer } from '../insights/narrativeSynthesizer';
import { networkStabilizer } from '../insights/networkStabilizer';
import { planningStudio } from '../planningStudio';

export const resolvers = {
  Mutation: {
    deployCollaborative: async (_, { ids, config }) => {
      const plan = {
        harmonizedInsight: harmonizedInsight(config),
        dynamicCoordination: dynamicCoordination(config),
        dataConvergence: dataConvergence(config),
        truthSync: truthSync(config),
        scenarioArchitect: scenarioArchitect(config),
        integrityAssurance: integrityAssurance(config),
        engagementCascade: engagementCascade(config),
        entropyBalancer: entropyBalancer(config),
        collectiveSynergy: collectiveSynergy(config),
        riskMitigator: riskMitigator(config),
        narrativeSynthesizer: narrativeSynthesizer(config),
        networkStabilizer: networkStabilizer(config),
        planningSim: planningStudio(config),
      };
      return plan;
    },
  },
};