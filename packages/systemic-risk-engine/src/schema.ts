export const RiskPropagationGraphSchema = `
type Institution {
  id: ID!
  name: String!
  sector: String!
  trustScore: Float!
  dependencies: [Institution!]! @relationship(type: "DEPENDS_ON", direction: OUT)
}

type RiskEvent {
  id: ID!
  severity: Float!
  vector: String!
  affectedInstitutions: [Institution!]! @relationship(type: "IMPACTS", direction: OUT)
}

type SystemicRiskSnapshot {
  id: ID!
  timestamp: DateTime!
  sriScore: Float!
  contributingEvents: [RiskEvent!]! @relationship(type: "INCLUDES", direction: OUT)
}
`;
