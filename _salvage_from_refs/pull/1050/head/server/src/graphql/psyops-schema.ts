import { gql } from 'apollo-server-express';

const psyOpsSchema = gql`
  # Input for creating an adversary simulation
  input AdversarySimulationInput {
    name: String!
    adversaryType: String! # APT, Ransomware, Nation-State, etc.
    config: AdversaryConfigInput!
  }

  # Configuration for adversary simulation
  input AdversaryConfigInput {
    temperature: Float! # AI creativity level (0.0-1.0)
    persistence: String! # low, medium, high
    obfuscation: Boolean! # Enable obfuscation techniques
    targetIndustry: String # technology, finance, healthcare, etc.
    complexity: String # basic, medium, advanced
  }

  # Input for simulation execution configuration
  input SimulationConfig {
    temperature: Float
    maxTTPs: Int
  }

  # Counter-PsyOps Engine status and metrics
  type CounterPsyOpsEngine {
    status: String!
    activeScenarios: Int!
    detectedThreats: Int!
    deployedCountermeasures: Int!
    lastUpdate: DateTime
  }

  # Disinformation detection status and metrics
  type DisinformationDetection {
    status: String!
    processedContent: Int!
    detectedCampaigns: Int!
    confidenceScore: Float!
    lastScan: DateTime
  }

  # Adversary simulation status and metrics
  type AdversarySimulationStatus {
    status: String!
    activeSimulations: Int!
    generatedTTPs: Int!
    lastExecution: DateTime
  }

  # Adversary simulation model
  type AdversarySimulation {
    id: ID!
    name: String!
    adversaryType: String!
    status: String! # created, running, completed, failed
    createdAt: DateTime!
    lastExecution: DateTime
    config: AdversaryConfig!
    results: AdversaryResults
  }

  # Adversary configuration
  type AdversaryConfig {
    temperature: Float!
    persistence: String!
    obfuscation: Boolean!
    targetIndustry: String
    complexity: String
  }

  # Results from adversary simulation
  type AdversaryResults {
    ttps: [String!]! # Generated Tactics, Techniques, and Procedures
    intent: String! # Estimated adversary intent
    confidence: Float! # Confidence score (0.0-1.0)
    mitreTactics: [String!]! # MITRE ATT&CK tactics
    temporalModel: JSON # Temporal attack progression
    obfuscationTechniques: [String!] # Obfuscation methods used
  }

  # PsyOps analysis result
  type PsyOpsAnalysis {
    id: ID!
    text: String!
    score: Float! # Risk score (0.0-1.0)
    tags: [String!]! # Detected patterns
    countermeasures: [String!]! # Recommended defensive actions
    timestamp: DateTime!
    source: String! # Source of the content
  }

  # Threat detection metrics
  type ThreatMetrics {
    totalAnalyzed: Int!
    threatsDetected: Int!
    averageScore: Float!
    lastUpdate: DateTime!
  }

  # Mutation response types
  type EngineToggleResponse {
    status: String!
    message: String!
  }

  type SimulationCreationResponse {
    id: ID!
    name: String!
    status: String!
    message: String!
  }

  extend type Query {
    # Get PsyOps engine status and metrics
    counterPsyOpsEngine: CounterPsyOpsEngine!
    disinformationDetection: DisinformationDetection!
    adversarySimulation: AdversarySimulationStatus!

    # Get all adversary simulations
    adversarySimulations: [AdversarySimulation!]!
    
    # Get specific adversary simulation
    getAdversarySimulation(id: ID!): AdversarySimulation

    # Get PsyOps analysis results
    getPsyOpsAnalyses(limit: Int, offset: Int): [PsyOpsAnalysis!]!
    
    # Get threat detection metrics
    getThreatMetrics: ThreatMetrics!
  }

  extend type Mutation {
    # Toggle Counter-PsyOps Engine
    toggleCounterPsyOpsEngine(enabled: Boolean!): EngineToggleResponse!
    
    # Create new adversary simulation
    createAdversarySimulation(input: AdversarySimulationInput!): SimulationCreationResponse!
    
    # Execute adversary simulation
    executeAdversarySimulation(id: ID!, config: SimulationConfig): AdversarySimulation!
    
    # Analyze content for PsyOps patterns
    analyzePsyOpsContent(text: String!, source: String): PsyOpsAnalysis!
    
    # Generate countermeasures for detected threats
    generateCountermeasures(analysisId: ID!): [String!]!
  }

  # Subscription for real-time updates
  extend type Subscription {
    # Real-time PsyOps threat detection updates
    psyOpsThreats: PsyOpsAnalysis!
    
    # Real-time simulation status updates
    simulationUpdates(simulationId: ID!): AdversarySimulation!
    
    # Real-time engine status updates
    engineStatus: CounterPsyOpsEngine!
  }
`;

export default psyOpsSchema;