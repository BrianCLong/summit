"use strict";
// @ts-nocheck
/**
 * ChatOps GraphQL Schema & Resolvers
 *
 * Defines the complete GraphQL API for the ChatOps service:
 * - Session management
 * - Conversation operations
 * - Approval workflows
 * - Audit queries
 * - Real-time subscriptions
 *
 * Integrates with:
 * - Session Manager
 * - Approval Service
 * - Audit Service
 * - Intent Router
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = exports.typeDefs = void 0;
exports.createGraphQLSchema = createGraphQLSchema;
const graphql_tag_1 = require("graphql-tag");
const graphql_1 = require("graphql");
// =============================================================================
// GRAPHQL TYPE DEFINITIONS
// =============================================================================
exports.typeDefs = (0, graphql_tag_1.gql) `
  # ==========================================================================
  # SCALARS
  # ==========================================================================

  scalar DateTime
  scalar JSON

  # ==========================================================================
  # ENUMS
  # ==========================================================================

  enum SessionStatus {
    ACTIVE
    IDLE
    SUSPENDED
    EXPIRED
    TERMINATED
  }

  enum Platform {
    SLACK
    TEAMS
    WEB
    API
  }

  enum RiskLevel {
    AUTONOMOUS
    HITL
    PROHIBITED
  }

  enum ApprovalStatus {
    PENDING
    APPROVED
    DENIED
    EXPIRED
    CANCELLED
  }

  enum ConversationRole {
    USER
    ASSISTANT
    SYSTEM
  }

  enum EntityType {
    THREAT_ACTOR
    MALWARE
    INFRASTRUCTURE
    VULNERABILITY
    CAMPAIGN
    TTP
    TOOL
    INDICATOR
  }

  enum AuditEventType {
    TRACE_STARTED
    TRACE_STEP
    TRACE_COMPLETED
    TOOL_INVOKED
    APPROVAL_REQUESTED
    APPROVAL_GRANTED
    APPROVAL_DENIED
    GUARDRAIL_TRIGGERED
    SECURITY_EVENT
  }

  # ==========================================================================
  # TYPES
  # ==========================================================================

  type Session {
    id: ID!
    userId: String!
    tenantId: String!
    platform: Platform!
    channelId: String!
    threadId: String
    status: SessionStatus!
    turns: [ConversationTurn!]!
    summary: String
    extractedEntities: [OSINTEntity!]!
    metadata: SessionMetadata!
    createdAt: DateTime!
    updatedAt: DateTime!
    expiresAt: DateTime!
    lastActivityAt: DateTime!
    turnCount: Int!
    linkedSessions: [Session!]
  }

  type SessionMetadata {
    userAgent: String
    ipAddress: String
    locale: String
    timezone: String
    linkedSessionIds: [ID!]
    parentSessionId: ID
    investigation: InvestigationContext
    custom: JSON
  }

  type InvestigationContext {
    id: ID!
    name: String!
    phase: String!
  }

  type ConversationTurn {
    id: ID!
    role: ConversationRole!
    content: String!
    tokenCount: Int!
    entities: [OSINTEntity!]
    metadata: JSON
    timestamp: DateTime!
  }

  type OSINTEntity {
    type: EntityType!
    value: String!
    confidence: Float!
    source: String
    context: String
    linkedGraphIds: [ID!]
  }

  type ApprovalRequest {
    id: ID!
    sessionId: ID!
    traceId: ID!
    toolId: String!
    operation: String!
    parameters: JSON!
    riskLevel: RiskLevel!
    requesterId: String!
    requiredApprovers: [String!]!
    approvals: [ApprovalDecision!]!
    status: ApprovalStatus!
    createdAt: DateTime!
    expiresAt: DateTime!
    resolvedAt: DateTime
    reason: String
  }

  type ApprovalDecision {
    approverId: String!
    decision: String!
    timestamp: DateTime!
    comment: String
  }

  type ReActTrace {
    id: ID!
    sessionId: ID!
    query: String!
    steps: [ReActStep!]!
    status: String!
    startedAt: DateTime!
    completedAt: DateTime
    totalDurationMs: Int
    tokenCount: Int
    toolInvocations: Int
  }

  type ReActStep {
    id: ID!
    type: String!
    content: String!
    timestamp: DateTime!
    metadata: JSON
  }

  type AuditEvent {
    id: ID!
    eventType: AuditEventType!
    sessionId: ID
    userId: String!
    tenantId: String!
    traceId: ID
    data: JSON!
    timestamp: DateTime!
    hash: String!
    previousHash: String
  }

  type SessionStats {
    totalSessions: Int!
    activeSessions: Int!
    idleSessions: Int!
    avgTurnsPerSession: Float!
    avgSessionDurationMs: Float!
    sessionsByPlatform: JSON!
    sessionsByTenant: JSON!
  }

  type HealthStatus {
    status: String!
    checks: [HealthCheck!]!
    slos: [SLOStatus!]!
  }

  type HealthCheck {
    name: String!
    status: String!
    latencyMs: Float
    message: String
  }

  type SLOStatus {
    name: String!
    target: Float!
    current: Float!
    status: String!
    windowHours: Int!
  }

  type MessageResponse {
    sessionId: ID!
    turnId: ID!
    response: String!
    entities: [OSINTEntity!]!
    traceId: ID
    riskLevel: RiskLevel
    approvalRequired: Boolean!
    approvalRequestId: ID
  }

  type ConversationSummary {
    id: ID!
    sessionId: ID!
    content: String!
    turnRange: [Int!]!
    keyFacts: [String!]!
    entityCount: Int!
    timestamp: DateTime!
  }

  # ==========================================================================
  # INPUTS
  # ==========================================================================

  input CreateSessionInput {
    platform: Platform!
    channelId: String!
    threadId: String
    metadata: SessionMetadataInput
  }

  input SessionMetadataInput {
    userAgent: String
    locale: String
    timezone: String
    investigationId: ID
  }

  input SendMessageInput {
    sessionId: ID!
    content: String!
    attachments: [AttachmentInput!]
  }

  input AttachmentInput {
    type: String!
    name: String!
    url: String!
  }

  input ApprovalDecisionInput {
    requestId: ID!
    decision: String!
    comment: String
  }

  input AuditQueryInput {
    sessionId: ID
    userId: String
    tenantId: String
    eventTypes: [AuditEventType!]
    startTime: DateTime
    endTime: DateTime
    limit: Int
    offset: Int
  }

  input SessionFilterInput {
    status: SessionStatus
    platform: Platform
    userId: String
    limit: Int
    offset: Int
  }

  # ==========================================================================
  # QUERIES
  # ==========================================================================

  type Query {
    # Session queries
    session(id: ID!): Session
    sessions(filter: SessionFilterInput): [Session!]!
    myActiveSessions: [Session!]!
    sessionStats(tenantId: String): SessionStats!

    # Approval queries
    approvalRequest(id: ID!): ApprovalRequest
    pendingApprovals(sessionId: ID): [ApprovalRequest!]!
    myPendingApprovals: [ApprovalRequest!]!

    # Trace queries
    trace(id: ID!): ReActTrace
    sessionTraces(sessionId: ID!): [ReActTrace!]!

    # Audit queries
    auditEvents(query: AuditQueryInput!): [AuditEvent!]!
    auditIntegrity(startId: ID!, endId: ID!): Boolean!

    # Health
    health: HealthStatus!
  }

  # ==========================================================================
  # MUTATIONS
  # ==========================================================================

  type Mutation {
    # Session operations
    createSession(input: CreateSessionInput!): Session!
    sendMessage(input: SendMessageInput!): MessageResponse!
    suspendSession(sessionId: ID!, reason: String): Session!
    resumeSession(sessionId: ID!): Session!
    expireSession(sessionId: ID!): Boolean!
    handoffSession(sessionId: ID!, platform: Platform!, channelId: String!): Session!

    # Approval operations
    submitApprovalDecision(input: ApprovalDecisionInput!): ApprovalRequest!
    cancelApprovalRequest(requestId: ID!): ApprovalRequest!

    # Admin operations
    compressTurns(sessionId: ID!): ConversationSummary!
    extractFacts(sessionId: ID!): [String!]!
  }

  # ==========================================================================
  # SUBSCRIPTIONS
  # ==========================================================================

  type Subscription {
    # Session subscriptions
    sessionUpdated(sessionId: ID!): Session!
    newMessage(sessionId: ID!): ConversationTurn!

    # Approval subscriptions
    approvalRequested(sessionId: ID): ApprovalRequest!
    approvalResolved(requestId: ID!): ApprovalRequest!

    # Trace subscriptions
    traceStep(traceId: ID!): ReActStep!
    traceCompleted(sessionId: ID!): ReActTrace!
  }
`;
// =============================================================================
// CUSTOM SCALARS
// =============================================================================
const DateTimeScalar = new graphql_1.GraphQLScalarType({
    name: 'DateTime',
    description: 'Date time scalar',
    serialize(value) {
        if (value instanceof Date) {
            return value.toISOString();
        }
        return value;
    },
    parseValue(value) {
        if (typeof value === 'string') {
            return new Date(value);
        }
        return null;
    },
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.STRING) {
            return new Date(ast.value);
        }
        return null;
    },
});
const JSONScalar = new graphql_1.GraphQLScalarType({
    name: 'JSON',
    description: 'Arbitrary JSON value',
    serialize(value) {
        return value;
    },
    parseValue(value) {
        return value;
    },
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.STRING) {
            try {
                return JSON.parse(ast.value);
            }
            catch {
                return ast.value;
            }
        }
        return null;
    },
});
// =============================================================================
// RESOLVERS
// =============================================================================
exports.resolvers = {
    // Custom scalars
    DateTime: DateTimeScalar,
    JSON: JSONScalar,
    // Enum mappings
    SessionStatus: {
        ACTIVE: 'active',
        IDLE: 'idle',
        SUSPENDED: 'suspended',
        EXPIRED: 'expired',
        TERMINATED: 'terminated',
    },
    Platform: {
        SLACK: 'slack',
        TEAMS: 'teams',
        WEB: 'web',
        API: 'api',
    },
    RiskLevel: {
        AUTONOMOUS: 'autonomous',
        HITL: 'hitl',
        PROHIBITED: 'prohibited',
    },
    // ==========================================================================
    // QUERIES
    // ==========================================================================
    Query: {
        session: async (_, { id }, ctx) => {
            const session = await ctx.sessionManager.getSession(id);
            // Authorization check
            if (session && session.tenantId !== ctx.securityContext.tenantId) {
                if (!ctx.securityContext.permissions.includes('cross_tenant:access')) {
                    throw new Error('Access denied: cross-tenant access not permitted');
                }
            }
            return session;
        },
        sessions: async (_, { filter }, ctx) => {
            return ctx.sessionManager.getSessionsByTenant(ctx.securityContext.tenantId, {
                status: filter?.status,
                platform: filter?.platform,
                limit: filter?.limit,
                offset: filter?.offset,
            });
        },
        myActiveSessions: async (_, __, ctx) => {
            return ctx.sessionManager.getActiveSessionsForUser(ctx.securityContext.userId);
        },
        sessionStats: async (_, { tenantId }, ctx) => {
            const effectiveTenantId = tenantId || ctx.securityContext.tenantId;
            if (effectiveTenantId !== ctx.securityContext.tenantId) {
                if (!ctx.securityContext.permissions.includes('cross_tenant:access')) {
                    throw new Error('Access denied');
                }
            }
            return ctx.sessionManager.getSessionStats(effectiveTenantId);
        },
        approvalRequest: async (_, { id }, ctx) => {
            return ctx.approvalService.getRequest(id);
        },
        pendingApprovals: async (_, { sessionId }, ctx) => {
            if (sessionId) {
                return ctx.approvalService.getPendingForSession(sessionId);
            }
            return ctx.approvalService.getPendingForTenant(ctx.securityContext.tenantId);
        },
        myPendingApprovals: async (_, __, ctx) => {
            return ctx.approvalService.getPendingForApprover(ctx.securityContext.userId);
        },
        trace: async (_, { id }, ctx) => {
            const result = await ctx.postgres.query(`SELECT * FROM chatops_traces WHERE id = $1`, [id]);
            return result.rows[0] || null;
        },
        sessionTraces: async (_, { sessionId }, ctx) => {
            const result = await ctx.postgres.query(`SELECT * FROM chatops_traces WHERE session_id = $1 ORDER BY started_at DESC`, [sessionId]);
            return result.rows;
        },
        auditEvents: async (_, { query }, ctx) => {
            return ctx.auditService.queryEvents({
                sessionId: query.sessionId,
                userId: query.userId,
                tenantId: query.tenantId || ctx.securityContext.tenantId,
                eventTypes: query.eventTypes,
                startTime: query.startTime,
                endTime: query.endTime,
                limit: query.limit,
                offset: query.offset,
            });
        },
        auditIntegrity: async (_, { startId, endId }, ctx) => {
            return ctx.auditService.verifyIntegrity(startId, endId);
        },
        health: async (_, __, ctx) => {
            // Would integrate with observability service
            return {
                status: 'healthy',
                checks: [
                    { name: 'database', status: 'pass', message: 'Connected' },
                    { name: 'redis', status: 'pass', message: 'Connected' },
                ],
                slos: [],
            };
        },
    },
    // ==========================================================================
    // MUTATIONS
    // ==========================================================================
    Mutation: {
        createSession: async (_, { input }, ctx) => {
            return ctx.sessionManager.createSession({
                userId: ctx.securityContext.userId,
                tenantId: ctx.securityContext.tenantId,
                platform: input.platform,
                channelId: input.channelId,
                threadId: input.threadId,
                securityContext: ctx.securityContext,
                metadata: input.metadata,
            });
        },
        sendMessage: async (_, { input }, ctx) => {
            // Add turn to session
            const turn = {
                id: `turn-${Date.now()}`,
                role: 'user',
                content: input.content,
                tokenCount: Math.ceil(input.content.length / 4),
                timestamp: new Date(),
            };
            await ctx.sessionManager.addTurn(input.sessionId, turn);
            // Publish for subscriptions
            ctx.pubsub.publish(`session:${input.sessionId}:message`, {
                newMessage: turn,
            });
            // In production, this would trigger the intent router
            return {
                sessionId: input.sessionId,
                turnId: turn.id,
                response: 'Processing your request...',
                entities: [],
                approvalRequired: false,
            };
        },
        suspendSession: async (_, { sessionId, reason }, ctx) => {
            await ctx.sessionManager.suspendSession(sessionId, reason);
            const session = await ctx.sessionManager.getSession(sessionId);
            return session;
        },
        resumeSession: async (_, { sessionId }, ctx) => {
            return ctx.sessionManager.resumeSession(sessionId);
        },
        expireSession: async (_, { sessionId }, ctx) => {
            await ctx.sessionManager.expireSession(sessionId, 'manual');
            return true;
        },
        handoffSession: async (_, { sessionId, platform, channelId }, ctx) => {
            return ctx.sessionManager.handoffSession(sessionId, {
                platform: platform,
                channelId,
            });
        },
        submitApprovalDecision: async (_, { input }, ctx) => {
            if (input.decision === 'approve') {
                await ctx.approvalService.approve(input.requestId, ctx.securityContext.userId, input.comment);
            }
            else {
                await ctx.approvalService.deny(input.requestId, ctx.securityContext.userId, input.comment || 'Denied');
            }
            const request = await ctx.approvalService.getRequest(input.requestId);
            // Publish for subscriptions
            ctx.pubsub.publish(`approval:${input.requestId}:resolved`, {
                approvalResolved: request,
            });
            return request;
        },
        cancelApprovalRequest: async (_, { requestId }, ctx) => {
            await ctx.approvalService.cancel(requestId, 'Cancelled by user');
            return ctx.approvalService.getRequest(requestId);
        },
        compressTurns: async (_, { sessionId }, ctx) => {
            // Would integrate with turn compressor
            return {
                id: `summary-${Date.now()}`,
                sessionId,
                content: 'Summary would be generated here',
                turnRange: [0, 10],
                keyFacts: [],
                entityCount: 0,
                timestamp: new Date(),
            };
        },
        extractFacts: async (_, { sessionId }, ctx) => {
            // Would integrate with fact extractor
            return ['Fact 1', 'Fact 2'];
        },
    },
    // ==========================================================================
    // SUBSCRIPTIONS
    // ==========================================================================
    Subscription: {
        sessionUpdated: {
            subscribe: (_, { sessionId }, ctx) => {
                return ctx.pubsub.asyncIterator(`session:${sessionId}:updated`);
            },
        },
        newMessage: {
            subscribe: (_, { sessionId }, ctx) => {
                return ctx.pubsub.asyncIterator(`session:${sessionId}:message`);
            },
        },
        approvalRequested: {
            subscribe: (_, { sessionId }, ctx) => {
                if (sessionId) {
                    return ctx.pubsub.asyncIterator(`session:${sessionId}:approval`);
                }
                return ctx.pubsub.asyncIterator(`tenant:${ctx.securityContext.tenantId}:approval`);
            },
        },
        approvalResolved: {
            subscribe: (_, { requestId }, ctx) => {
                return ctx.pubsub.asyncIterator(`approval:${requestId}:resolved`);
            },
        },
        traceStep: {
            subscribe: (_, { traceId }, ctx) => {
                return ctx.pubsub.asyncIterator(`trace:${traceId}:step`);
            },
        },
        traceCompleted: {
            subscribe: (_, { sessionId }, ctx) => {
                return ctx.pubsub.asyncIterator(`session:${sessionId}:trace:completed`);
            },
        },
    },
    // ==========================================================================
    // TYPE RESOLVERS
    // ==========================================================================
    Session: {
        turns: async (session, _, ctx) => {
            // Load turns if not already loaded
            if (session.turns.length === 0) {
                const result = await ctx.postgres.query(`SELECT * FROM chatops_turns WHERE session_id = $1 ORDER BY timestamp ASC`, [session.id]);
                return result.rows;
            }
            return session.turns;
        },
        turnCount: (session) => session.turns.length,
        linkedSessions: async (session, _, ctx) => {
            if (!session.metadata.linkedSessions?.length)
                return [];
            return ctx.sessionManager.getLinkedSessions(session.id);
        },
    },
    ReActTrace: {
        steps: async (trace, _, ctx) => {
            const result = await ctx.postgres.query(`SELECT * FROM chatops_trace_steps WHERE trace_id = $1 ORDER BY timestamp ASC`, [trace.id]);
            return result.rows;
        },
    },
};
// =============================================================================
// FACTORY
// =============================================================================
function createGraphQLSchema() {
    return { typeDefs: exports.typeDefs, resolvers: exports.resolvers };
}
