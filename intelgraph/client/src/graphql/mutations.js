import { gql } from '@apollo/client'

export const DEPLOY_COLLABORATIVE = gql`
  mutation DeployCollaborative($ids: [ID!]!, $config: ConfigInput) {
    deployCollaborative(ids: $ids, config: $config) {
      ids
      generatedAt
      highlights
      recommendedActions
      metrics {
        name
        label
        score
        trend
        summary
      }
      config {
        collaborationIntensity
        engagementAmplification
        globalDataSync
        hybridCoordination
        integrityThreshold
        complianceStandard
        opportunityPrecision
        stabilizationNexus
        engagementIntensity
        coherenceScale
      }
    }
  }
`
