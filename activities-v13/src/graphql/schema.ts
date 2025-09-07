import { gql } from 'apollo-server';

export const schema = gql`
  input ConfigInput {
    collaborationIntensity: Float = 1.0
    engagementAmplification: Float = 20.0
    globalDataSync: Boolean = true
    hybridCoordination: Boolean = true
    integrityThreshold: Float = 0.001
  }
  type EngagementPlan {
    harmonizedInsight: JSON
    dynamicCoordination: JSON
    dataConvergence: JSON
    truthSync: JSON
    scenarioArchitect: JSON
    integrityAssurance: JSON
    engagementCascade: JSON
    entropyBalancer: JSON
    collectiveSynergy: JSON
    riskMitigator: JSON
    narrativeSynthesizer: JSON
    networkStabilizer: JSON
    planningSim: JSON
  }
  type Mutation {
    deployCollaborative(ids: [ID]!, config: ConfigInput): EngagementPlan
  }
`;