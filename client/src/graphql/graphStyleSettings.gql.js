import { gql } from '@apollo/client';

export const GET_GRAPH_STYLE_SETTINGS = gql`
  query GetGraphStyleSettings {
    graphStyleSettings {
      nodeTypeColors
      nodeSize
      edgeColor
      edgeWidth
      updatedAt
    }
  }
`;

export const UPDATE_GRAPH_STYLE_SETTINGS = gql`
  mutation UpdateGraphStyleSettings($input: GraphStyleSettingsInput!) {
    updateGraphStyleSettings(input: $input) {
      nodeTypeColors
      nodeSize
      edgeColor
      edgeWidth
      updatedAt
    }
  }
`;
