"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentRouterService = void 0;
const logger_js_1 = require("../utils/logger.js");
const tracing_js_1 = require("../observability/tracing.js");
class IntentRouterService {
    classifier;
    ragService;
    constructor(classifier, ragService) {
        this.classifier = classifier;
        this.ragService = ragService;
    }
    async route(query, context) {
        return tracing_js_1.tracer.trace("intent.route", async (span) => {
            span.setAttribute("intent.query_length", query.length);
            if (context.tenantId)
                span.setAttribute("tenant.id", context.tenantId);
            // 1. Classify
            const intent = await this.classifier.classify(query, context);
            logger_js_1.logger.info({ intent }, "Intent classified");
            span.setAttribute("intent.primary", intent.primary_intent);
            if (intent.sub_intent)
                span.setAttribute("intent.sub", intent.sub_intent);
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
            }
            else if (intent.primary_intent === "action") {
                return this.handleAction(query, intent, context);
            }
            return {
                answer: "I'm not sure how to handle this request.",
                intent,
                citations: [],
            };
        });
    }
    async handleRetrieval(query, intent, context) {
        // Enforce Freshness Logic (Placeholder)
        const requiresLive = intent.freshness_requirement?.requires_live;
        logger_js_1.logger.info({ requiresLive, allowedSources: intent.allowed_sources }, "Retrieval constraints");
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
        }
        catch (error) {
            logger_js_1.logger.error({ error }, "GraphRAG query failed in Router");
            return {
                answer: "I encountered an error retrieving that information.",
                intent,
                citations: [],
            };
        }
    }
    async handleAction(query, intent, context) {
        // Mock Action Execution
        return {
            answer: `I have noted your request to ${intent.sub_intent} ${intent.entities.join(", ")}. This is a mock action.`,
            intent,
            citations: [],
            next_steps: ["Confirm action", "Undo"],
        };
    }
}
exports.IntentRouterService = IntentRouterService;
