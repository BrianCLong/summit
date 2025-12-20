/**
 * GraphQL Schema for Cross-Border Assistant Interoperability
 */

export const crossBorderTypeDefs = /* GraphQL */ `
  """
  Partner nation in the cross-border assistant network
  """
  type PartnerNation {
    id: ID!
    code: String!
    name: String!
    region: String!
    status: PartnerStatus!
    endpoint: PartnerEndpoint!
    capabilities: AssistantCapabilities!
    languages: [String!]!
    trustLevel: TrustLevel!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum PartnerStatus {
    ACTIVE
    PENDING
    SUSPENDED
    INACTIVE
  }

  type PartnerEndpoint {
    baseUrl: String!
    protocol: String!
    version: String!
    authMethod: String!
  }

  type AssistantCapabilities {
    domains: [String!]!
    operations: [String!]!
    maxContextSize: Int!
    supportsStreaming: Boolean!
    supportsMultimodal: Boolean!
    responseTimeMs: Int!
  }

  type TrustLevel {
    level: Int!
    maxDataClassification: DataClassification!
    allowedOperations: [String!]!
    requiresApproval: Boolean!
    auditRequired: Boolean!
  }

  enum DataClassification {
    PUBLIC
    INTERNAL
    CONFIDENTIAL
    RESTRICTED
    TOP_SECRET
  }

  type PartnerHealth {
    partnerId: ID!
    status: HealthStatus!
    latencyMs: Int!
    lastChecked: DateTime!
    errorRate: Float!
    uptime: Float!
  }

  enum HealthStatus {
    HEALTHY
    DEGRADED
    UNHEALTHY
    UNKNOWN
  }

  """
  Cross-border session for assistant collaboration
  """
  type CrossBorderSession {
    id: ID!
    originNation: String!
    targetNation: String!
    state: HandoverState!
    context: SessionContext!
    handoverChain: [HandoverRecord!]!
    createdAt: DateTime!
    updatedAt: DateTime!
    expiresAt: DateTime!
  }

  enum HandoverState {
    INITIATED
    CONTEXT_TRANSFER
    AWAITING_ACCEPTANCE
    ACCEPTED
    IN_PROGRESS
    COMPLETED
    FAILED
    ROLLED_BACK
  }

  type SessionContext {
    conversationId: ID!
    language: String!
    targetLanguage: String
    intent: String!
    summary: String!
    dataClassification: DataClassification!
  }

  type HandoverRecord {
    id: ID!
    fromNation: String!
    toNation: String!
    timestamp: DateTime!
    reason: String!
    status: String!
    durationMs: Int!
  }

  """
  Cross-border message
  """
  type CrossBorderMessage {
    id: ID!
    sessionId: ID!
    type: MessageType!
    content: String!
    language: String!
    translations: JSON
    timestamp: DateTime!
  }

  enum MessageType {
    USER
    ASSISTANT
    SYSTEM
    HANDOVER
  }

  """
  Translation result
  """
  type TranslationResult {
    originalText: String!
    translatedText: String!
    sourceLanguage: String!
    targetLanguage: String!
    confidence: Float!
    processingTimeMs: Int!
  }

  """
  Language detection result
  """
  type LanguageDetection {
    language: String!
    confidence: Float!
    alternatives: [LanguageAlternative!]!
  }

  type LanguageAlternative {
    language: String!
    confidence: Float!
  }

  """
  Gateway status
  """
  type GatewayStatus {
    nodeId: String!
    region: String!
    activePartners: Int!
    activeSessions: Int!
    supportedLanguages: Int!
    auditEntries: Int!
  }

  """
  Handover response
  """
  type HandoverResponse {
    sessionId: ID!
    accepted: Boolean!
    targetSessionId: ID
    estimatedWaitMs: Int
    rejectionReason: String
  }

  # Input types
  input CreateSessionInput {
    targetNation: String!
    intent: String!
    language: String!
    dataClassification: DataClassification
  }

  input SendMessageInput {
    sessionId: ID!
    content: String!
    translate: Boolean
    targetLanguage: String
  }

  input TranslateInput {
    text: String!
    targetLanguage: String!
    sourceLanguage: String
  }

  input PartnerSearchInput {
    domain: String
    language: String
    classification: DataClassification
    region: String
  }

  # Queries
  extend type Query {
    """
    Get all active partner nations
    """
    crossBorderPartners: [PartnerNation!]!

    """
    Get partner by country code
    """
    crossBorderPartner(code: String!): PartnerNation

    """
    Find partners matching criteria
    """
    findCrossBorderPartners(input: PartnerSearchInput!): [PartnerNation!]!

    """
    Get partner health status
    """
    crossBorderPartnerHealth(code: String!): PartnerHealth

    """
    Get cross-border session by ID
    """
    crossBorderSession(id: ID!): CrossBorderSession

    """
    Get all active cross-border sessions
    """
    crossBorderSessions: [CrossBorderSession!]!

    """
    Get messages for a session
    """
    crossBorderMessages(sessionId: ID!): [CrossBorderMessage!]!

    """
    Detect language of text
    """
    detectLanguage(text: String!): LanguageDetection!

    """
    Get supported languages
    """
    supportedLanguages: [String!]!

    """
    Get gateway status
    """
    crossBorderGatewayStatus: GatewayStatus!
  }

  # Mutations
  extend type Mutation {
    """
    Create a new cross-border session
    """
    createCrossBorderSession(input: CreateSessionInput!): CrossBorderSession!

    """
    Send a message in a cross-border session
    """
    sendCrossBorderMessage(input: SendMessageInput!): CrossBorderMessage!

    """
    Complete a cross-border session
    """
    completeCrossBorderSession(sessionId: ID!): Boolean!

    """
    Initiate handover to another partner
    """
    initiateCrossBorderHandover(
      sessionId: ID!
      targetNation: String!
      reason: String!
    ): HandoverResponse!

    """
    Translate text
    """
    translateText(input: TranslateInput!): TranslationResult!
  }

  # Subscriptions
  extend type Subscription {
    """
    Subscribe to session state changes
    """
    crossBorderSessionState(sessionId: ID!): CrossBorderSession!

    """
    Subscribe to new messages in a session
    """
    crossBorderMessageReceived(sessionId: ID!): CrossBorderMessage!
  }
`;
