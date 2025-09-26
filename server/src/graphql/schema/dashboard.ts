import { gql } from 'graphql-tag';

export const dashboardTypeDefs = gql`
  extend type Query {
    dashboardConfiguration(id: ID): DashboardConfiguration
  }

  type DashboardConfiguration {
    id: ID!
    name: String!
    description: String
    layout: String!
    settings: JSON
    updatedAt: DateTime!
    widgets: [DashboardWidget!]!
  }

  type DashboardWidget {
    id: ID!
    type: String!
    title: String!
    position: DashboardWidgetPosition!
    config: JSON
    dataSource: JSON
    refreshInterval: Int
  }

  type DashboardWidgetPosition {
    x: Int!
    y: Int!
    w: Int!
    h: Int!
  }

  input DashboardWidgetPositionInput {
    x: Int!
    y: Int!
    w: Int!
    h: Int!
  }

  input DashboardWidgetInput {
    id: ID
    type: String!
    title: String!
    position: DashboardWidgetPositionInput!
    config: JSON
    dataSource: JSON
    refreshInterval: Int
  }

  input SaveDashboardConfigurationInput {
    id: ID
    name: String!
    description: String
    layout: String! = "grid"
    settings: JSON
    widgets: [DashboardWidgetInput!]!
  }

  extend type Mutation {
    saveDashboardConfiguration(input: SaveDashboardConfigurationInput!): DashboardConfiguration!
  }
`;

export default dashboardTypeDefs;
