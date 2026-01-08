/**
 * @summit/explainability-sdk
 *
 * Provides instrumentation wrappers for capturing AI operation inference chains.
 * Every AI operation (RAG query, graph traversal, policy check) emits structured
 * events that are collected and assembled into auditable proof trees.
 */

import { v4 as uuidv4 } from "uuid";
import { EventEmitter } from "events";

export interface InferenceContext {
  inferenceId: string;
  parentInferenceId?: string;
  userId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface InferenceEvent {
  eventType: "rag.query" | "graph.traversal" | "policy.decision" | "model.invocation";
  inferenceId: string;
  parentInferenceId?: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

/**
 * Instrumentation wrapper for RAG queries
 */
export class RAGInstrumentation {
  private emitter: EventEmitter;

  constructor(emitter: EventEmitter) {
    this.emitter = emitter;
  }

  async wrapQuery<T>(context: InferenceContext, queryFn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    this.emitter.emit("inference.event", {
      eventType: "rag.query",
      inferenceId: context.inferenceId,
      parentInferenceId: context.parentInferenceId,
      timestamp: new Date(),
      data: {
        phase: "start",
        metadata: context.metadata,
      },
    } as InferenceEvent);

    try {
      const result = await queryFn();
      const latency = Date.now() - startTime;

      this.emitter.emit("inference.event", {
        eventType: "rag.query",
        inferenceId: context.inferenceId,
        parentInferenceId: context.parentInferenceId,
        timestamp: new Date(),
        data: {
          phase: "complete",
          latency,
          resultCount: Array.isArray(result) ? result.length : 1,
        },
      } as InferenceEvent);

      return result;
    } catch (error) {
      this.emitter.emit("inference.event", {
        eventType: "rag.query",
        inferenceId: context.inferenceId,
        parentInferenceId: context.parentInferenceId,
        timestamp: new Date(),
        data: {
          phase: "error",
          error: error instanceof Error ? error.message : String(error),
        },
      } as InferenceEvent);
      throw error;
    }
  }
}

/**
 * Instrumentation wrapper for graph traversals
 */
export class GraphInstrumentation {
  private emitter: EventEmitter;

  constructor(emitter: EventEmitter) {
    this.emitter = emitter;
  }

  async wrapCypherQuery<T>(
    context: InferenceContext,
    cypher: string,
    params: Record<string, unknown>,
    executeFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    this.emitter.emit("inference.event", {
      eventType: "graph.traversal",
      inferenceId: context.inferenceId,
      parentInferenceId: context.parentInferenceId,
      timestamp: new Date(),
      data: {
        phase: "start",
        cypher,
        params,
      },
    } as InferenceEvent);

    try {
      const result = await executeFn();
      const latency = Date.now() - startTime;

      this.emitter.emit("inference.event", {
        eventType: "graph.traversal",
        inferenceId: context.inferenceId,
        parentInferenceId: context.parentInferenceId,
        timestamp: new Date(),
        data: {
          phase: "complete",
          latency,
          recordCount: Array.isArray(result) ? result.length : 1,
        },
      } as InferenceEvent);

      return result;
    } catch (error) {
      this.emitter.emit("inference.event", {
        eventType: "graph.traversal",
        inferenceId: context.inferenceId,
        timestamp: new Date(),
        data: {
          phase: "error",
          error: error instanceof Error ? error.message : String(error),
        },
      } as InferenceEvent);
      throw error;
    }
  }
}

/**
 * Creates a new inference context with unique ID
 */
export function createInferenceContext(
  userId: string,
  parentInferenceId?: string,
  metadata?: Record<string, unknown>
): InferenceContext {
  return {
    inferenceId: uuidv4(),
    parentInferenceId,
    userId,
    timestamp: new Date(),
    metadata,
  };
}

export { EventEmitter };
