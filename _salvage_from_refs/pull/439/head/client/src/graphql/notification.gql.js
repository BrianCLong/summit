import { gql } from '@apollo/client';

export const SET_ANOMALY_ALERT_CONFIG = gql`
  mutation SetAnomalyAlertConfig(
    $investigationId: ID!
    $enabled: Boolean!
    $threshold: Float!
  ) {
    setAnomalyAlertConfig(
      investigationId: $investigationId
      enabled: $enabled
      threshold: $threshold
    )
  }
`;

