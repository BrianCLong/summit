import { gql } from 'graphql-tag';

export const crystalTypeDefs = gql`
  enum CrystalPanelType {
    AGENT
    TERMINAL
    DIFF
    EDITOR
    LOGS
    TOOLS
  }

  enum CrystalAttachmentType {
    TEXT
    IMAGE
    FILE
  }

  type CrystalPanelLayout {
    x: Int!
    y: Int!
    w: Int!
    h: Int!
    preset: String
  }

  type CrystalPanel {
    id: ID!
    type: CrystalPanelType!
    name: String!
    layout: CrystalPanelLayout!
    state: JSON
  }

  type CrystalAttachment {
    id: ID!
    type: CrystalAttachmentType!
    name: String!
    size: Int!
    contentType: String!
    purpose: String!
    retention: String!
    uri: String
    createdAt: DateTime!
  }

  type CrystalWorktree {
    id: ID!
    branch: String!
    repoPath: String!
    worktreePath: String!
    status: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    lastRebasedAt: DateTime
    lastSquashedAt: DateTime
  }

  type CrystalRunLogEntry {
    id: ID!
    timestamp: DateTime!
    stream: String!
    message: String!
  }

  type CrystalRun {
    id: ID!
    definitionId: ID!
    status: String!
    startedAt: DateTime!
    completedAt: DateTime
    exitCode: Int
    provenanceId: ID!
    logs: [CrystalRunLogEntry!]!
  }

  type CrystalRunDefinition {
    id: ID!
    name: String!
    command: String!
    timeoutMs: Int
    environment: JSON
  }

  type CrystalAgent {
    id: ID!
    adapterKey: String!
    status: String!
    capabilities: [String!]!
    createdAt: DateTime!
  }

  type CrystalMessage {
    id: ID!
    agentId: ID!
    role: String!
    content: String!
    createdAt: DateTime!
    attachmentIds: [ID!]
    richOutput: JSON
  }

  type CrystalSLOSnapshot {
    gatewayReadP95: Float!
    gatewayReadP99: Float!
    gatewayWriteP95: Float!
    gatewayWriteP99: Float!
    subscriptionP95: Float!
    graphHopP95: Float!
    graphHopP99: Float!
  }

  type CrystalBudgetSnapshot {
    environment: String!
    monthlyLimitUsd: Float!
    monthlySpendUsd: Float!
    alertThresholdHit: Boolean!
  }

  type CrystalCostSnapshot {
    budgets: [CrystalBudgetSnapshot!]!
  }

  type CrystalSession {
    id: ID!
    name: String!
    description: String
    status: String!
    theme: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    purposeTags: [String!]!
    retention: String!
    worktree: CrystalWorktree!
    panels: [CrystalPanel!]!
    attachments: [CrystalAttachment!]!
    runScripts: [CrystalRunDefinition!]!
    runs: [CrystalRun!]!
    agents: [CrystalAgent!]!
    messages: [CrystalMessage!]!
    provenanceId: ID!
    slo: CrystalSLOSnapshot!
    cost: CrystalCostSnapshot!
  }

  type CrystalAdapter {
    key: ID!
    name: String!
    description: String!
    capabilities: [String!]!
  }

  input CrystalAttachmentInput {
    type: CrystalAttachmentType!
    name: String!
    size: Int!
    contentType: String!
    purpose: String!
    retention: String
    uri: String
  }

  input CrystalRunDefinitionInput {
    name: String!
    command: String!
    timeoutMs: Int
    environment: JSON
  }

  input CrystalPanelPresetInput {
    type: CrystalPanelType!
    name: String
    preset: String
  }

  input CreateCrystalSessionInput {
    name: String!
    description: String
    projectPath: String!
    mainBranch: String
    theme: String
    purposeTags: [String!]
    retention: String
    adapters: [String!]
    panelPresets: [CrystalPanelPresetInput!]
    runScripts: [CrystalRunDefinitionInput!]
    attachments: [CrystalAttachmentInput!]
  }

  input StartCrystalRunInput {
    sessionId: ID!
    runDefinitionId: ID!
    commandOverride: String
    timeoutMs: Int
    environment: JSON
  }

  input RecordCrystalMessageInput {
    sessionId: ID!
    agentId: ID!
    role: String!
    content: String!
    attachmentIds: [ID!]
  }

  input CrystalPanelLayoutInput {
    panelId: ID!
    x: Int!
    y: Int!
    w: Int!
    h: Int!
    preset: String
  }

  input UpdateCrystalPanelsInput {
    sessionId: ID!
    panels: [CrystalPanelLayoutInput!]!
  }

  extend type Query {
    crystalSessions: [CrystalSession!]!
    crystalSession(id: ID!): CrystalSession
    crystalAdapters: [CrystalAdapter!]!
    crystalBudgets: [CrystalBudgetSnapshot!]!
  }

  extend type Mutation {
    createCrystalSession(input: CreateCrystalSessionInput!): CrystalSession!
    startCrystalRun(input: StartCrystalRunInput!): CrystalRun!
    recordCrystalMessage(input: RecordCrystalMessageInput!): CrystalMessage!
    updateCrystalPanels(input: UpdateCrystalPanelsInput!): CrystalSession!
    closeCrystalSession(sessionId: ID!): CrystalSession!
  }

  type CrystalRunLogEvent {
    sessionId: ID!
    runId: ID!
    entry: CrystalRunLogEntry!
  }

  extend type Subscription {
    crystalRunLogs(sessionId: ID!, runId: ID!): CrystalRunLogEvent!
  }
`;
