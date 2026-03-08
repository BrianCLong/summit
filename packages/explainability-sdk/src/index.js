"use strict";
/**
 * @summit/explainability-sdk
 *
 * Provides instrumentation wrappers for capturing AI operation inference chains.
 * Every AI operation (RAG query, graph traversal, policy check) emits structured
 * events that are collected and assembled into auditable proof trees.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEmitter = exports.GraphInstrumentation = exports.RAGInstrumentation = void 0;
exports.createInferenceContext = createInferenceContext;
const uuid_1 = require("uuid");
const events_1 = require("events");
Object.defineProperty(exports, "EventEmitter", { enumerable: true, get: function () { return events_1.EventEmitter; } });
/**
 * Instrumentation wrapper for RAG queries
 */
class RAGInstrumentation {
    emitter;
    constructor(emitter) {
        this.emitter = emitter;
    }
    async wrapQuery(context, queryFn) {
        const startTime = Date.now();
        this.emitter.emit('inference.event', {
            eventType: 'rag.query',
            inferenceId: context.inferenceId,
            parentInferenceId: context.parentInferenceId,
            timestamp: new Date(),
            data: {
                phase: 'start',
                metadata: context.metadata,
            },
        });
        try {
            const result = await queryFn();
            const latency = Date.now() - startTime;
            this.emitter.emit('inference.event', {
                eventType: 'rag.query',
                inferenceId: context.inferenceId,
                parentInferenceId: context.parentInferenceId,
                timestamp: new Date(),
                data: {
                    phase: 'complete',
                    latency,
                    resultCount: Array.isArray(result) ? result.length : 1,
                },
            });
            return result;
        }
        catch (error) {
            this.emitter.emit('inference.event', {
                eventType: 'rag.query',
                inferenceId: context.inferenceId,
                parentInferenceId: context.parentInferenceId,
                timestamp: new Date(),
                data: {
                    phase: 'error',
                    error: error instanceof Error ? error.message : String(error),
                },
            });
            throw error;
        }
    }
}
exports.RAGInstrumentation = RAGInstrumentation;
/**
 * Instrumentation wrapper for graph traversals
 */
class GraphInstrumentation {
    emitter;
    constructor(emitter) {
        this.emitter = emitter;
    }
    async wrapCypherQuery(context, cypher, params, executeFn) {
        const startTime = Date.now();
        this.emitter.emit('inference.event', {
            eventType: 'graph.traversal',
            inferenceId: context.inferenceId,
            parentInferenceId: context.parentInferenceId,
            timestamp: new Date(),
            data: {
                phase: 'start',
                cypher,
                params,
            },
        });
        try {
            const result = await executeFn();
            const latency = Date.now() - startTime;
            this.emitter.emit('inference.event', {
                eventType: 'graph.traversal',
                inferenceId: context.inferenceId,
                parentInferenceId: context.parentInferenceId,
                timestamp: new Date(),
                data: {
                    phase: 'complete',
                    latency,
                    recordCount: Array.isArray(result) ? result.length : 1,
                },
            });
            return result;
        }
        catch (error) {
            this.emitter.emit('inference.event', {
                eventType: 'graph.traversal',
                inferenceId: context.inferenceId,
                timestamp: new Date(),
                data: {
                    phase: 'error',
                    error: error instanceof Error ? error.message : String(error),
                },
            });
            throw error;
        }
    }
}
exports.GraphInstrumentation = GraphInstrumentation;
/**
 * Creates a new inference context with unique ID
 */
function createInferenceContext(userId, parentInferenceId, metadata) {
    return {
        inferenceId: (0, uuid_1.v4)(),
        parentInferenceId,
        userId,
        timestamp: new Date(),
        metadata,
    };
}
