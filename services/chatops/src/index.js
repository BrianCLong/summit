"use strict";
// @ts-nocheck
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatOpsService = exports.createSlackAdapter = exports.SlackAdapter = exports.createBoundedAutonomyEngine = exports.ReActTraceRecorder = exports.RiskClassifier = exports.BoundedAutonomyEngine = exports.createIntentRouter = exports.MultiModelIntentRouter = exports.createMemoryManager = exports.HierarchicalMemoryManager = void 0;
exports.createChatOpsService = createChatOpsService;
exports.startChatOpsServer = startChatOpsServer;
// Export types
__exportStar(require("./types.js"), exports);
// Export memory system
var hierarchical_memory_js_1 = require("./memory/hierarchical-memory.js");
Object.defineProperty(exports, "HierarchicalMemoryManager", { enumerable: true, get: function () { return hierarchical_memory_js_1.HierarchicalMemoryManager; } });
Object.defineProperty(exports, "createMemoryManager", { enumerable: true, get: function () { return hierarchical_memory_js_1.createMemoryManager; } });
// Export intent router
var intent_router_js_1 = require("./router/intent-router.js");
Object.defineProperty(exports, "MultiModelIntentRouter", { enumerable: true, get: function () { return intent_router_js_1.MultiModelIntentRouter; } });
Object.defineProperty(exports, "createIntentRouter", { enumerable: true, get: function () { return intent_router_js_1.createIntentRouter; } });
// Export autonomy engine
var bounded_autonomy_js_1 = require("./autonomy/bounded-autonomy.js");
Object.defineProperty(exports, "BoundedAutonomyEngine", { enumerable: true, get: function () { return bounded_autonomy_js_1.BoundedAutonomyEngine; } });
Object.defineProperty(exports, "RiskClassifier", { enumerable: true, get: function () { return bounded_autonomy_js_1.RiskClassifier; } });
Object.defineProperty(exports, "ReActTraceRecorder", { enumerable: true, get: function () { return bounded_autonomy_js_1.ReActTraceRecorder; } });
Object.defineProperty(exports, "createBoundedAutonomyEngine", { enumerable: true, get: function () { return bounded_autonomy_js_1.createBoundedAutonomyEngine; } });
// Export Slack adapter
var slack_adapter_js_1 = require("./adapters/slack/slack-adapter.js");
Object.defineProperty(exports, "SlackAdapter", { enumerable: true, get: function () { return slack_adapter_js_1.SlackAdapter; } });
Object.defineProperty(exports, "createSlackAdapter", { enumerable: true, get: function () { return slack_adapter_js_1.createSlackAdapter; } });
// =============================================================================
// CHATOPS CORE SERVICE
// =============================================================================
const uuid_1 = require("uuid");
const hierarchical_memory_js_2 = require("./memory/hierarchical-memory.js");
const intent_router_js_2 = require("./router/intent-router.js");
const bounded_autonomy_js_2 = require("./autonomy/bounded-autonomy.js");
class ChatOpsService {
    memory;
    router;
    autonomy;
    constructor(config) {
        this.memory = new hierarchical_memory_js_2.HierarchicalMemoryManager(config.memory);
        this.router = new intent_router_js_2.MultiModelIntentRouter(config.router);
        this.autonomy = new bounded_autonomy_js_2.BoundedAutonomyEngine(config.autonomy, config.toolRegistry, config.approvalService, config.auditService);
    }
    /**
     * Process a chat message and return a response
     */
    async processMessage(message, securityContext) {
        // Step 1: Store the user turn in memory
        await this.memory.addTurn({
            turnId: (0, uuid_1.v4)(),
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
        const contextWindow = await this.memory.getContextWindow(securityContext.sessionId, message.content, 6000);
        // Step 3: Route intent through multi-model consensus
        const intent = await this.router.routeIntent(message.content, contextWindow.chunks, securityContext);
        // Step 4: Execute with bounded autonomy
        const { result, trace } = await this.autonomy.execute(intent, securityContext);
        // Step 5: Format response
        const response = this.formatResponse(intent, result, trace);
        // Step 6: Store assistant turn in memory
        await this.memory.addTurn({
            turnId: (0, uuid_1.v4)(),
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
    formatResponse(intent, result, trace) {
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
        let content;
        const citations = intent.rankedContext.slice(0, 5).map(c => ({
            entityId: c.turnId,
            entityName: c.content.slice(0, 50),
            relevance: c.relevanceScore,
            source: c.tier,
        }));
        if (typeof result === 'string') {
            content = result;
        }
        else if (Array.isArray(result)) {
            content = `Found ${result.length} results:\n${result.slice(0, 5).map((r, i) => `${i + 1}. ${JSON.stringify(r).slice(0, 100)}`).join('\n')}`;
        }
        else if (result && typeof result === 'object') {
            content = JSON.stringify(result, null, 2).slice(0, 1000);
        }
        else {
            content = 'Operation completed successfully.';
        }
        // Add interactive components for certain intents
        const interactive = [];
        if (intent.primaryIntent === 'entity_lookup' && intent.osintEntities.length > 0) {
            interactive.push({
                type: 'button',
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
    async close() {
        await this.memory.close();
    }
}
exports.ChatOpsService = ChatOpsService;
// =============================================================================
// FACTORY
// =============================================================================
function createChatOpsService(config) {
    return new ChatOpsService(config);
}
// =============================================================================
// SERVER ENTRY POINT
// =============================================================================
/**
 * Start the ChatOps service with a Slack adapter
 */
async function startChatOpsServer(chatOpsConfig, slackConfig, port) {
    const chatOps = createChatOpsService(chatOpsConfig);
    const { createSlackAdapter } = await Promise.resolve().then(() => __importStar(require('./adapters/slack/slack-adapter.js')));
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
