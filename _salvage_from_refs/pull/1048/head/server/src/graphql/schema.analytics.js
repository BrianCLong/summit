const gql = require('graphql-tag');

const analyticsTypeDefs = gql`
  extend type Mutation {
    runCommunityDetection: AnalyticsJobStatus
  }

  type AnalyticsJobStatus {
    message: String!
    communitiesDetected: Int
    nodesUpdated: Int
  }
`;

module.exports = { analyticsTypeDefs };
