import { gql } from '@apollo/client';

export const FEATURE_TOUR_PROGRESS = gql`
  query FeatureTourProgresses {
    featureTourProgresses {
      id
      tourKey
      completed
      completedAt
      lastStep
    }
  }
`;

export const RECORD_FEATURE_TOUR_PROGRESS = gql`
  mutation RecordFeatureTourProgress($input: FeatureTourProgressInput!) {
    recordFeatureTourProgress(input: $input) {
      id
      tourKey
      completed
      completedAt
      lastStep
    }
  }
`;
