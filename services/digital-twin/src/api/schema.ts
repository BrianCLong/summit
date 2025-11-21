export const typeDefs = `#graphql
  scalar DateTime
  scalar JSON

  enum TwinState {
    INITIALIZING
    SYNCING
    ACTIVE
    SIMULATING
    DEGRADED
    OFFLINE
  }

  enum TwinType {
    ENTITY
    SYSTEM
    PROCESS
    NETWORK
    ORGANIZATION
    INFRASTRUCTURE
    COMPOSITE
  }

  enum SimulationEngine {
    MONTE_CARLO
    AGENT_BASED
    SYSTEM_DYNAMICS
    HYBRID
  }

  type TwinMetadata {
    id: ID!
    name: String!
    type: TwinType!
    description: String
    version: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    tags: [String!]!
  }

  type StateVector {
    timestamp: DateTime!
    confidence: Float!
    source: String!
    properties: JSON!
    derived: JSON
  }

  type TwinRelationship {
    targetTwinId: ID!
    type: String!
    properties: JSON
  }

  type DigitalTwin {
    metadata: TwinMetadata!
    state: TwinState!
    currentStateVector: StateVector!
    stateHistory: [StateVector!]!
    relationships: [TwinRelationship!]!
    provenanceChain: [String!]!
  }

  type SimulationOutcome {
    scenario: String!
    probability: Float!
    stateVector: StateVector!
    metrics: JSON!
  }

  type SimulationResult {
    id: ID!
    twinId: ID!
    startTime: DateTime!
    endTime: DateTime!
    outcomes: [SimulationOutcome!]!
    insights: [String!]!
    recommendations: [String!]!
  }

  input CreateTwinInput {
    name: String!
    type: TwinType!
    description: String
    initialState: JSON
    tags: [String!]
  }

  input UpdateStateInput {
    twinId: ID!
    properties: JSON!
    source: String!
    confidence: Float
  }

  input SimulationConfigInput {
    engine: SimulationEngine!
    timeHorizon: Float!
    timeStep: Float!
    iterations: Int
    parameters: JSON!
  }

  input ScenarioInput {
    name: String!
    overrides: JSON!
  }

  input RunSimulationInput {
    twinId: ID!
    config: SimulationConfigInput!
    scenarios: [ScenarioInput!]
  }

  type Query {
    twin(id: ID!): DigitalTwin
    twins(type: TwinType, state: TwinState, tags: [String!]): [DigitalTwin!]!
    simulationResult(id: ID!): SimulationResult
  }

  type Mutation {
    createTwin(input: CreateTwinInput!): DigitalTwin!
    updateTwinState(input: UpdateStateInput!): DigitalTwin!
    setTwinState(twinId: ID!, state: TwinState!): DigitalTwin!
    linkTwins(sourceId: ID!, targetId: ID!, type: String!, properties: JSON): Boolean!
    runSimulation(input: RunSimulationInput!): SimulationResult!
    deleteTwin(id: ID!): Boolean!
  }

  type Subscription {
    twinUpdated(twinId: ID): DigitalTwin!
    simulationCompleted(twinId: ID): SimulationResult!
  }
`;
