/**
 * Context Engineering Types
 *
 * Implements the Google ADK "Context as a Compiled View" pattern.
 * Separate Storage (Session) from Presentation (WorkingContext).
 */

import { LLMMessage, LLMRequest } from "../types/index.js";

// ============================================================================
// Core Entities
// ============================================================================

export interface Event {
  id: string;
  type: "message" | "tool_call" | "tool_result" | "control" | "error" | "compaction";
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface Artifact {
  id: string;
  name: string;
  type: string; // mime type or 'text/csv' etc
  summary: string;
  content?: string; // Loaded on demand
  uri?: string; // Reference
  version: string;
}

export interface MemoryResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Storage Layer (Session)
// ============================================================================

export interface Session {
  id: string;
  userId: string;
  events: Event[];
  metadata: Record<string, unknown>;
  variables: Record<string, unknown>; // Scratchpad
}

// ============================================================================
// Presentation Layer (Working Context)
// ============================================================================

export interface WorkingContext {
  id: string; // Ephemeral ID for this compilation
  instructions: string[]; // System instructions (stable prefix)
  history: LLMMessage[]; // Selected/Transformed events
  artifacts: Artifact[]; // Loaded artifacts
  memories: MemoryResult[]; // Reactive/Proactive memories
  tokenCount?: number;
}

// ============================================================================
// Processor Pipeline
// ============================================================================

export interface CompilationOptions {
  model: string;
  tokenLimit?: number;
  includeArtifacts?: boolean;
  maxHistoryMessages?: number;
}

export interface ContextProcessor {
  name: string;
  process(
    context: WorkingContext,
    session: Session,
    options: CompilationOptions
  ): Promise<WorkingContext>;
}

export interface ContextCompiler {
  compile(session: Session, options: CompilationOptions): Promise<LLMRequest>;
}
