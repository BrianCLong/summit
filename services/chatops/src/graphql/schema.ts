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

import { gql } from 'graphql-tag';
import { PubSub } from 'graphql-subscriptions';
import { GraphQLScalarType, Kind } from 'graphql';
import type { Pool } from 'pg';
import type Redis from 'ioredis';

import type { SessionManager, Session } from '../session/session-manager.js';
import type { ApprovalService, ApprovalRequest } from '../approval/approval-service.js';
import type { AuditService } from '../audit/audit-service.js';
import type {
  ConversationTurn,
  OSINTEntity,
  ReActStep,
  SecurityContext,
} from '../types.js';

// =============================================================================
// GRAPHQL TYPE DEFINITIONS
// =============================================================================

export const typeDefs = gql`
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

const DateTimeScalar = new GraphQLScalarType({
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
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize(value) {
    return value;
  },
  parseValue(value) {
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      try {
        return JSON.parse(ast.value);
      } catch {
        return ast.value;
      }
    }
    return null;
  },
});

// =============================================================================
// RESOLVER CONTEXT
// =============================================================================

export interface GraphQLContext {
  sessionManager: SessionManager;
  approvalService: ApprovalService;
  auditService: AuditService;
  postgres: Pool;
  redis: Redis;
  pubsub: PubSub;
  securityContext: SecurityContext;
}

// =============================================================================
// RESOLVERS
// =============================================================================

export const resolvers = {
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
    session: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ): Promise<Session | null> => {
      const session = await ctx.sessionManager.getSession(id);

      // Authorization check
      if (session && session.tenantId !== ctx.securityContext.tenantId) {
        if (!ctx.securityContext.permissions.includes('cross_tenant:access')) {
          throw new Error('Access denied: cross-tenant access not permitted');
        }
      }

      return session;
    },

    sessions: async (
      _: unknown,
      { filter }: { filter?: { status?: string; platform?: string; userId?: string; limit?: number; offset?: number } },
      ctx: GraphQLContext
    ): Promise<Session[]> => {
      return ctx.sessionManager.getSessionsByTenant(
        ctx.securityContext.tenantId,
        {
          status: filter?.status as any,
          platform: filter?.platform as any,
          limit: filter?.limit,
          offset: filter?.offset,
        }
      );
    },

    myActiveSessions: async (
      _: unknown,
      __: unknown,
      ctx: GraphQLContext
    ): Promise<Session[]> => {
      return ctx.sessionManager.getActiveSessionsForUser(ctx.securityContext.userId);
    },

    sessionStats: async (
      _: unknown,
      { tenantId }: { tenantId?: string },
      ctx: GraphQLContext
    ) => {
      const effectiveTenantId = tenantId || ctx.securityContext.tenantId;

      if (effectiveTenantId !== ctx.securityContext.tenantId) {
        if (!ctx.securityContext.permissions.includes('cross_tenant:access')) {
          throw new Error('Access denied');
        }
      }

      return ctx.sessionManager.getSessionStats(effectiveTenantId);
    },

    approvalRequest: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ) => {
      return ctx.approvalService.getRequest(id);
    },

    pendingApprovals: async (
      _: unknown,
      { sessionId }: { sessionId?: string },
      ctx: GraphQLContext
    ) => {
      if (sessionId) {
        return ctx.approvalService.getPendingForSession(sessionId);
      }
      return ctx.approvalService.getPendingForTenant(ctx.securityContext.tenantId);
    },

    myPendingApprovals: async (
      _: unknown,
      __: unknown,
      ctx: GraphQLContext
    ) => {
      return ctx.approvalService.getPendingForApprover(ctx.securityContext.userId);
    },

    trace: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ) => {
      const result = await ctx.postgres.query(
        `SELECT * FROM chatops_traces WHERE id = $1`,
        [id]
      );
      return result.rows[0] || null;
    },

    sessionTraces: async (
      _: unknown,
      { sessionId }: { sessionId: string },
      ctx: GraphQLContext
    ) => {
      const result = await ctx.postgres.query(
        `SELECT * FROM chatops_traces WHERE session_id = $1 ORDER BY started_at DESC`,
        [sessionId]
      );
      return result.rows;
    },

    auditEvents: async (
      _: unknown,
      { query }: { query: { sessionId?: string; userId?: string; tenantId?: string; eventTypes?: string[]; startTime?: Date; endTime?: Date; limit?: number; offset?: number } },
      ctx: GraphQLContext
    ) => {
      return ctx.auditService.queryEvents({
        sessionId: query.sessionId,
        userId: query.userId,
        tenantId: query.tenantId || ctx.securityContext.tenantId,
        eventTypes: query.eventTypes as any,
        startTime: query.startTime,
        endTime: query.endTime,
        limit: query.limit,
        offset: query.offset,
      });
    },

    auditIntegrity: async (
      _: unknown,
      { startId, endId }: { startId: string; endId: string },
      ctx: GraphQLContext
    ) => {
      return ctx.auditService.verifyIntegrity(startId, endId);
    },

    health: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
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
    createSession: async (
      _: unknown,
      { input }: { input: { platform: string; channelId: string; threadId?: string; metadata?: any } },
      ctx: GraphQLContext
    ): Promise<Session> => {
      return ctx.sessionManager.createSession({
        userId: ctx.securityContext.userId,
        tenantId: ctx.securityContext.tenantId,
        platform: input.platform as any,
        channelId: input.channelId,
        threadId: input.threadId,
        securityContext: ctx.securityContext,
        metadata: input.metadata,
      });
    },

    sendMessage: async (
      _: unknown,
      { input }: { input: { sessionId: string; content: string; attachments?: any[] } },
      ctx: GraphQLContext
    ) => {
      // Add turn to session
      const turn: ConversationTurn = {
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

    suspendSession: async (
      _: unknown,
      { sessionId, reason }: { sessionId: string; reason?: string },
      ctx: GraphQLContext
    ) => {
      await ctx.sessionManager.suspendSession(sessionId, reason);
      const session = await ctx.sessionManager.getSession(sessionId);
      return session;
    },

    resumeSession: async (
      _: unknown,
      { sessionId }: { sessionId: string },
      ctx: GraphQLContext
    ) => {
      return ctx.sessionManager.resumeSession(sessionId);
    },

    expireSession: async (
      _: unknown,
      { sessionId }: { sessionId: string },
      ctx: GraphQLContext
    ) => {
      await ctx.sessionManager.expireSession(sessionId, 'manual');
      return true;
    },

    handoffSession: async (
      _: unknown,
      { sessionId, platform, channelId }: { sessionId: string; platform: string; channelId: string },
      ctx: GraphQLContext
    ) => {
      return ctx.sessionManager.handoffSession(sessionId, {
        platform: platform as any,
        channelId,
      });
    },

    submitApprovalDecision: async (
      _: unknown,
      { input }: { input: { requestId: string; decision: string; comment?: string } },
      ctx: GraphQLContext
    ) => {
      if (input.decision === 'approve') {
        await ctx.approvalService.approve(
          input.requestId,
          ctx.securityContext.userId,
          input.comment
        );
      } else {
        await ctx.approvalService.deny(
          input.requestId,
          ctx.securityContext.userId,
          input.comment || 'Denied'
        );
      }

      const request = await ctx.approvalService.getRequest(input.requestId);

      // Publish for subscriptions
      ctx.pubsub.publish(`approval:${input.requestId}:resolved`, {
        approvalResolved: request,
      });

      return request;
    },

    cancelApprovalRequest: async (
      _: unknown,
      { requestId }: { requestId: string },
      ctx: GraphQLContext
    ) => {
      await ctx.approvalService.cancel(requestId, 'Cancelled by user');
      return ctx.approvalService.getRequest(requestId);
    },

    compressTurns: async (
      _: unknown,
      { sessionId }: { sessionId: string },
      ctx: GraphQLContext
    ) => {
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

    extractFacts: async (
      _: unknown,
      { sessionId }: { sessionId: string },
      ctx: GraphQLContext
    ) => {
      // Would integrate with fact extractor
      return ['Fact 1', 'Fact 2'];
    },
  },

  // ==========================================================================
  // SUBSCRIPTIONS
  // ==========================================================================

  Subscription: {
    sessionUpdated: {
      subscribe: (_: unknown, { sessionId }: { sessionId: string }, ctx: GraphQLContext) => {
        return ctx.pubsub.asyncIterator(`session:${sessionId}:updated`);
      },
    },

    newMessage: {
      subscribe: (_: unknown, { sessionId }: { sessionId: string }, ctx: GraphQLContext) => {
        return ctx.pubsub.asyncIterator(`session:${sessionId}:message`);
      },
    },

    approvalRequested: {
      subscribe: (_: unknown, { sessionId }: { sessionId?: string }, ctx: GraphQLContext) => {
        if (sessionId) {
          return ctx.pubsub.asyncIterator(`session:${sessionId}:approval`);
        }
        return ctx.pubsub.asyncIterator(`tenant:${ctx.securityContext.tenantId}:approval`);
      },
    },

    approvalResolved: {
      subscribe: (_: unknown, { requestId }: { requestId: string }, ctx: GraphQLContext) => {
        return ctx.pubsub.asyncIterator(`approval:${requestId}:resolved`);
      },
    },

    traceStep: {
      subscribe: (_: unknown, { traceId }: { traceId: string }, ctx: GraphQLContext) => {
        return ctx.pubsub.asyncIterator(`trace:${traceId}:step`);
      },
    },

    traceCompleted: {
      subscribe: (_: unknown, { sessionId }: { sessionId: string }, ctx: GraphQLContext) => {
        return ctx.pubsub.asyncIterator(`session:${sessionId}:trace:completed`);
      },
    },
  },

  // ==========================================================================
  // TYPE RESOLVERS
  // ==========================================================================

  Session: {
    turns: async (session: Session, _: unknown, ctx: GraphQLContext) => {
      // Load turns if not already loaded
      if (session.turns.length === 0) {
        const result = await ctx.postgres.query(
          `SELECT * FROM chatops_turns WHERE session_id = $1 ORDER BY timestamp ASC`,
          [session.id]
        );
        return result.rows;
      }
      return session.turns;
    },

    turnCount: (session: Session) => session.turns.length,

    linkedSessions: async (session: Session, _: unknown, ctx: GraphQLContext) => {
      if (!session.metadata.linkedSessions?.length) return [];
      return ctx.sessionManager.getLinkedSessions(session.id);
    },
  },

  ReActTrace: {
    steps: async (trace: any, _: unknown, ctx: GraphQLContext) => {
      const result = await ctx.postgres.query(
        `SELECT * FROM chatops_trace_steps WHERE trace_id = $1 ORDER BY timestamp ASC`,
        [trace.id]
      );
      return result.rows;
    },
  },
};

// =============================================================================
// FACTORY
// =============================================================================

export function createGraphQLSchema() {
  return { typeDefs, resolvers };
}
