import { gql } from '@apollo/client';

export const GET_GRAPH_LAYOUT_PREFERENCE = gql`
  query GetGraphLayoutPreference {
    graphLayoutPreference {
      layout
      physicsEnabled
      options
      updatedAt
    }
  }
`;

export const SAVE_GRAPH_LAYOUT_PREFERENCE = gql`
  mutation SaveGraphLayoutPreference($input: GraphLayoutPreferenceInput!) {
    saveGraphLayoutPreference(input: $input) {
      layout
      physicsEnabled
      options
      updatedAt
    }
  }
`;
