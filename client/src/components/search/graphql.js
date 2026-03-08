"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRAPH_QUERY_PREVIEW_SUBSCRIPTION = void 0;
const client_1 = require("@apollo/client");
exports.GRAPH_QUERY_PREVIEW_SUBSCRIPTION = (0, client_1.gql) `
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
