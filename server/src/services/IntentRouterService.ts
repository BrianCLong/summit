
import { IntentClassificationService, IntentResult } from './IntentClassificationService.js';
import { GraphRAGQueryService } from './GraphRAGQueryService.js';
import { logger } from '../utils/logger.js';
import { PlannerOrchestrator, TaskExecutor, GraphStore, PlanSynthesisResult } from '@summit/work-graph/planner';
import { toolbus } from './ToolbusService.js';
import crypto from 'crypto';

// In-memory implementation for ephemeral planning sessions
class MemoryGraphStore implements GraphStore {
    private nodes = new Map<string, any>();
    private edges = new Map<string, any>();

    async getNode<T>(id: string): Promise<T | null> {
        return this.nodes.get(id) || null;
    }
    async getNodes<T>(filter?: Partial<T>): Promise<T[]> {
        return Array.from(this.nodes.values()).filter(n => {
            if (!filter) return true;
            return Object.entries(filter).every(([k, v]) => n[k] === v);
        });
    }
    async createNode<T>(node: T): Promise<T> {
        this.nodes.set((node as any).id, node);
        return node;
    }
    async updateNode<T>(id: string, updates: Partial<T>): Promise<T | null> {
        const node = this.nodes.get(id);
        if (!node) return null;
        Object.assign(node, updates);
        return node;
    }
    async createEdge(edge: any): Promise<any> {
        this.edges.set(edge.id, edge);
        return edge;
    }
    async getEdges(filter?: any): Promise<any[]> {
         return Array.from(this.edges.values()).filter(e => {
            if (!filter) return true;
            return Object.entries(filter).every(([k, v]) => e[k] === v);
        });
    }
}

class ToolbusExecutor implements TaskExecutor {
    async execute(connectorId: string, action: string, params: Record<string, unknown>, context: any): Promise<any> {
        // Convert generic context to ConnectorContext partial if needed
        return toolbus.executeTool(connectorId, action, params, context);
    }
}

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
        // 1. Classify
        const intent = await this.classifier.classify(query, context);
        logger.info({ intent }, 'Intent classified');

        // 2. Clarification Needed?
        if (intent.primary_intent === 'clarification') {
            return {
                answer: intent.clarifying_question || "Could you clarify?",
                intent,
                citations: []
            };
        }

        // 3. Routing
        if (intent.primary_intent === 'retrieval') {
            return this.handleRetrieval(query, intent, context);
        } else if (intent.primary_intent === 'action') {
            return this.handleAction(query, intent, context);
        }

        return {
            answer: "I'm not sure how to handle this request.",
            intent,
            citations: []
        };
    }

    private async handleRetrieval(query: string, intent: IntentResult, context: any): Promise<RouterResponse> {
        // Enforce Freshness Logic (Placeholder)
        const requiresLive = intent.freshness_requirement?.requires_live;

        logger.info({ requiresLive, allowedSources: intent.allowed_sources }, 'Retrieval constraints');

        // Call GraphRAG
        try {
            const ragResponse = await this.ragService.query({
                investigationId: context.investigationId || 'default-investigation',
                tenantId: context.tenantId || 'default-tenant',
                userId: context.userId || 'unknown-user',
                question: query,
                autoExecute: true
            });

            return {
                answer: ragResponse.answer,
                intent,
                citations: ragResponse.citations,
                freshness_proof: {
                    timestamp: new Date().toISOString(),
                    live_lookup: !!requiresLive,
                    data_as_of: new Date().toISOString() // Mock: In real system, get from GraphRAG metadata
                }
            };
        } catch (error: any) {
            logger.error({ error }, 'GraphRAG query failed in Router');
            return {
                answer: "I encountered an error retrieving that information.",
                intent,
                citations: []
            };
        }
    }

    private async handleAction(query: string, intent: IntentResult, context: any): Promise<RouterResponse> {
        logger.info({ intent }, 'Routing to PlannerOrchestrator');

        const store = new MemoryGraphStore();
        const planner = new PlannerOrchestrator(store);

        // Map classification intent to Work Graph Intent
        const graphIntent: any = {
             id: crypto.randomUUID(),
             type: 'intent',
             title: query,
             description: `Action: ${intent.sub_intent} on ${intent.entities.join(', ')}. Context: ${JSON.stringify(intent)}`,
             source: 'internal',
             priority: 'P2',
             status: 'captured',
             evidence: [],
             createdAt: new Date(),
             updatedAt: new Date(),
             createdBy: context.userId || 'system',
        };

        try {
            const plan = await planner.synthesizePlan(graphIntent);
            let executionResult = 'Plan generated but not executed.';

            // Execute if requested (defaulting to true for agentic autonomous mode)
            if (context.autoExecute !== false) {
                 const executor = new ToolbusExecutor();
                 logger.info('Executing plan via Toolbus');
                 await planner.executePlan(plan, executor, { ...context, logger });
                 executionResult = 'Plan executed successfully.';
            }

            return {
                answer: `${executionResult} I have processed ${plan.tickets.length} steps.`,
                intent,
                citations: [], // Actions might need to return citations too?
                next_steps: plan.tickets.map(t => t.title),
                freshness_proof: {
                    timestamp: new Date().toISOString(),
                    live_lookup: true
                }
            };
        } catch (error: any) {
            logger.error({ error }, 'Planning or execution failed');
             return {
                answer: `I attempted to process the action but encountered an error: ${error.message}`,
                intent,
                citations: []
            };
        }
    }
}
