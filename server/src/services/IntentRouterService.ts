import { IntentClassificationService, IntentResult } from "./IntentClassificationService.js";
import { GraphRAGQueryService } from "./GraphRAGQueryService.js";
import { logger } from "../utils/logger.js";
import { tracer } from "../observability/tracing.js";

export interface RouterResponse {
  answer: string;
  intent: IntentResult;
  citations: any[];
  freshness_proof?: {
    timestamp: string;
    data_as_of?: string;
    live_lookup: boolean;
  };
  next_steps?: string[];
}

export class IntentRouterService {
  constructor(
    private classifier: IntentClassificationService,
    private ragService: GraphRAGQueryService
  ) {}

  async route(query: string, context: any): Promise<RouterResponse> {
    return tracer.trace("intent.route", async (span) => {
      span.setAttribute("intent.query_length", query.length);
      if (context.tenantId) span.setAttribute("tenant.id", context.tenantId);

      // 1. Classify
      const intent = await this.classifier.classify(query, context);
      logger.info({ intent }, "Intent classified");

      span.setAttribute("intent.primary", intent.primary_intent);
      if (intent.sub_intent) span.setAttribute("intent.sub", intent.sub_intent);

      // 2. Clarification Needed?
      if (intent.primary_intent === "clarification") {
        return {
          answer: intent.clarifying_question || "Could you clarify?",
          intent,
          citations: [],
        };
      }

      // 3. Routing
      if (intent.primary_intent === "retrieval") {
        return this.handleRetrieval(query, intent, context);
      } else if (intent.primary_intent === "action") {
        return this.handleAction(query, intent, context);
      }

      return {
        answer: "I'm not sure how to handle this request.",
        intent,
        citations: [],
      };
    });
  }

  private async handleRetrieval(
    query: string,
    intent: IntentResult,
    context: any
  ): Promise<RouterResponse> {
    // Enforce Freshness Logic (Placeholder)
    const requiresLive = intent.freshness_requirement?.requires_live;

    logger.info({ requiresLive, allowedSources: intent.allowed_sources }, "Retrieval constraints");

    // Call GraphRAG
    try {
      const ragResponse = await this.ragService.query({
        investigationId: context.investigationId || "default-investigation",
        tenantId: context.tenantId || "default-tenant",
        userId: context.userId || "unknown-user",
        question: query,
        autoExecute: true,
      });

      return {
        answer: ragResponse.answer,
        intent,
        citations: ragResponse.citations,
        freshness_proof: {
          timestamp: new Date().toISOString(),
          live_lookup: !!requiresLive,
          data_as_of: new Date().toISOString(), // Mock: In real system, get from GraphRAG metadata
        },
      };
    } catch (error: any) {
      logger.error({ error }, "GraphRAG query failed in Router");
      return {
        answer: "I encountered an error retrieving that information.",
        intent,
        citations: [],
      };
    }
  }

  private async handleAction(
    query: string,
    intent: IntentResult,
    context: any
  ): Promise<RouterResponse> {
    // Mock Action Execution
    return {
      answer: `I have noted your request to ${intent.sub_intent} ${intent.entities.join(", ")}. This is a mock action.`,
      intent,
      citations: [],
      next_steps: ["Confirm action", "Undo"],
    };
  }
}
