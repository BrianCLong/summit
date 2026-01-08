import { gql } from "@apollo/client";

export const GRAPH_QUERY_PREVIEW_SUBSCRIPTION = gql`
  subscription GraphQueryPreview($cypher: String!, $parameters: JSON, $limit: Int!) {
    graphQueryPreview(cypher: $cypher, parameters: $parameters, limit: $limit) {
      eventId
      partial
      progress {
        completed
        total
        percentage
      }
      statistics {
        nodeCount
        edgeCount
      }
      nodes {
        id
        label
        type
        properties
      }
      edges {
        id
        type
        source
        target
        properties
      }
      errors {
        message
      }
    }
  }
`;
