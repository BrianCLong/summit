/**
 * ChatOps Service - Main Entry Point
 *
 * The ChatOps service provides an agentic orchestration layer for Summit's
 * intelligence platform. It enables:
 *
 * 1. Multi-Model Intent Routing - Parallel LLM classification with consensus voting
 * 2. Hierarchical Memory - 3-tier memory for 50-100+ turn conversations
 * 3. Bounded Autonomy - Risk-tiered execution with ReAct traces
 * 4. Platform Adapters - Slack, Teams, Web integration
 *
 * Architecture:
 * ```
 *   Slack/Teams/Web
 *         │
 *         ▼
 *   ┌─────────────────┐
 *   │  ChatOps Core   │
 *   │                 │
 *   │  ┌───────────┐  │
 *   │  │  Intent   │  │  ◀── Multi-model consensus
 *   │  │  Router   │  │
 *   │  └─────┬─────┘  │
 *   │        │        │
 *   │  ┌─────▼─────┐  │
 *   │  │ Hierarchl │  │  ◀── 3-tier memory
 *   │  │  Memory   │  │
 *   │  └─────┬─────┘  │
 *   │        │        │
 *   │  ┌─────▼─────┐  │
 *   │  │  Bounded  │  │  ◀── Risk-tiered execution
 *   │  │ Autonomy  │  │
 *   │  └───────────┘  │
 *   └─────────────────┘
 *         │
 *         ▼
 *   ┌─────────────────┐
 *   │ Knowledge Graph │
 *   │    (Neo4j)      │
 *   └─────────────────┘
 * ```
 */

// Export types
export * from './types.js';

// Export memory system
export {
  HierarchicalMemoryManager,
  createMemoryManager,
  type MemoryManagerConfig,
} from './memory/hierarchical-memory.js';

// Export intent router
export {
  MultiModelIntentRouter,
  createIntentRouter,
  type IntentRouterConfig,
} from './router/intent-router.js';

// Export autonomy engine
export {
  BoundedAutonomyEngine,
  RiskClassifier,
  ReActTraceRecorder,
  createBoundedAutonomyEngine,
  type BoundedAutonomyConfig,
  type ToolRegistry,
  type ApprovalService,
  type AuditService,
} from './autonomy/bounded-autonomy.js';

// Export Slack adapter
export {
  SlackAdapter,
  createSlackAdapter,
  type SlackAdapterConfig,
} from './adapters/slack/slack-adapter.js';

// =============================================================================
// CHATOPS CORE SERVICE
// =============================================================================

import { v4 as uuidv4 } from 'uuid';

import {
  AggregatedIntent,
  ChatMessage,
  ChatResponse,
  ReActTrace,
  SecurityContext,
} from './types.js';
import { HierarchicalMemoryManager, MemoryManagerConfig } from './memory/hierarchical-memory.js';
import { MultiModelIntentRouter, IntentRouterConfig } from './router/intent-router.js';
import {
  BoundedAutonomyEngine,
  BoundedAutonomyConfig,
  ToolRegistry,
  ApprovalService,
  AuditService,
} from './autonomy/bounded-autonomy.js';

export interface ChatOpsServiceConfig {
  memory: MemoryManagerConfig;
  router: IntentRouterConfig;
  autonomy: BoundedAutonomyConfig;
  toolRegistry: ToolRegistry;
  approvalService: ApprovalService;
  auditService: AuditService;
}

export class ChatOpsService {
  private memory: HierarchicalMemoryManager;
  private router: MultiModelIntentRouter;
  private autonomy: BoundedAutonomyEngine;

  constructor(config: ChatOpsServiceConfig) {
    this.memory = new HierarchicalMemoryManager(config.memory);
    this.router = new MultiModelIntentRouter(config.router);
    this.autonomy = new BoundedAutonomyEngine(
      config.autonomy,
      config.toolRegistry,
      config.approvalService,
      config.auditService,
    );
  }

  /**
   * Process a chat message and return a response
   */
  async processMessage(
    message: ChatMessage,
    securityContext: SecurityContext,
  ): Promise<{
    response: ChatResponse;
    intent: AggregatedIntent;
    trace: ReActTrace;
  }> {
    // Step 1: Store the user turn in memory
    await this.memory.addTurn({
      turnId: uuidv4(),
      sessionId: securityContext.sessionId,
      userId: securityContext.userId,
      tenantId: securityContext.tenantId,
      role: 'user',
      content: message.content,
      timestamp: message.timestamp,
      tokenCount: Math.ceil(message.content.length / 4), // Rough estimate
      metadata: {
        investigationId: message.metadata?.investigationId,
      },
    });

    // Step 2: Get context window from memory
    const contextWindow = await this.memory.getContextWindow(
      securityContext.sessionId,
      message.content,
      6000, // Max tokens for context
    );

    // Step 3: Route intent through multi-model consensus
    const intent = await this.router.routeIntent(
      message.content,
      contextWindow.chunks,
      securityContext,
    );

    // Step 4: Execute with bounded autonomy
    const { result, trace } = await this.autonomy.execute(intent, securityContext);

    // Step 5: Format response
    const response = this.formatResponse(intent, result, trace);

    // Step 6: Store assistant turn in memory
    await this.memory.addTurn({
      turnId: uuidv4(),
      sessionId: securityContext.sessionId,
      userId: securityContext.userId,
      tenantId: securityContext.tenantId,
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      tokenCount: Math.ceil(response.content.length / 4),
      metadata: {
        intent: intent.primaryIntent,
        entities: intent.osintEntities,
      },
    });

    return { response, intent, trace };
  }

  /**
   * Format the execution result into a chat response
   */
  private formatResponse(
    intent: AggregatedIntent,
    result: unknown,
    trace: ReActTrace,
  ): ChatResponse {
    // Check for blocked operations
    if (trace.finalOutcome === 'blocked') {
      return {
        content: 'This operation was blocked by security policy. Please contact your administrator if you believe this is an error.',
        confidenceScore: 0,
      };
    }

    // Check for guardrail flags
    const criticalFlags = intent.guardrailFlags.filter(f => f.action === 'block');
    if (criticalFlags.length > 0) {
      return {
        content: 'Your request could not be processed due to policy restrictions.',
        confidenceScore: 0,
      };
    }

    // Format based on intent type
    let content: string;
    const citations = intent.rankedContext.slice(0, 5).map(c => ({
      entityId: c.turnId,
      entityName: c.content.slice(0, 50),
      relevance: c.relevanceScore,
      source: c.tier,
    }));

    if (typeof result === 'string') {
      content = result;
    } else if (Array.isArray(result)) {
      content = `Found ${result.length} results:\n${result.slice(0, 5).map((r, i) => `${i + 1}. ${JSON.stringify(r).slice(0, 100)}`).join('\n')}`;
    } else if (result && typeof result === 'object') {
      content = JSON.stringify(result, null, 2).slice(0, 1000);
    } else {
      content = 'Operation completed successfully.';
    }

    // Add interactive components for certain intents
    const interactive = [];
    if (intent.primaryIntent === 'entity_lookup' && intent.osintEntities.length > 0) {
      interactive.push({
        type: 'button' as const,
        id: 'expand_entities',
        label: 'Show All Entities',
        action: 'expand_entities',
      });
    }

    return {
      content,
      confidenceScore: intent.confidence,
      citations,
      interactive,
    };
  }

  /**
   * Clean up resources
   */
  async close(): Promise<void> {
    await this.memory.close();
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createChatOpsService(config: ChatOpsServiceConfig): ChatOpsService {
  return new ChatOpsService(config);
}

// =============================================================================
// SERVER ENTRY POINT
// =============================================================================

/**
 * Start the ChatOps service with a Slack adapter
 */
export async function startChatOpsServer(
  chatOpsConfig: ChatOpsServiceConfig,
  slackConfig: import('./adapters/slack/slack-adapter.js').SlackAdapterConfig,
  port?: number,
): Promise<{ chatOps: ChatOpsService; slack: import('./adapters/slack/slack-adapter.js').SlackAdapter }> {
  const chatOps = createChatOpsService(chatOpsConfig);
  const { createSlackAdapter } = await import('./adapters/slack/slack-adapter.js');
  const slack = createSlackAdapter(slackConfig);

  // Wire up message handler
  slack.onMessage(async (message, context) => {
    const { response } = await chatOps.processMessage(message, context);
    return response;
  });

  // Start Slack adapter
  await slack.start(port);

  console.log(`ChatOps service started with Slack integration on port ${port ?? 3000}`);

  return { chatOps, slack };
}
