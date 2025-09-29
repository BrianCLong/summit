const gql = require('graphql-tag');

const notificationTypes = gql`
  extend type Mutation {
    setAnomalyAlertConfig(
      investigationId: ID!
      enabled: Boolean!
      threshold: Float!
    ): Boolean!
  }
`;

module.exports = notificationTypes;
