/**
 * AgentDescriptor — typed contract for a registered agent.
 *
 * Every agent in the Summit control plane must satisfy this interface
 * before it can be registered or selected by the router.
 *
 * EVD-AFCP-ARCH-001
 */

export type RiskLevel = "low" | "medium" | "high";

export type DataClassification = "public" | "internal" | "confidential" | "restricted";

export interface AgentDescriptor {
  /** Stable, globally-unique agent identifier (UUID or URN). */
  id: string;

  /** Human-readable display name. */
  name: string;

  /** Semantic capability tokens the agent can fulfil (e.g. "text-summarise", "code-review"). */
  capabilities: string[];

  /** Tool identifiers the agent is authorised to invoke. */
  tools: string[];

  /** Dataset identifiers the agent is allowed to read or write. */
  datasets: string[];

  /** Maximum data classification this agent may handle. */
  maxDataClassification: DataClassification;

  /** Inherent blast-radius level of the agent. */
  riskLevel: RiskLevel;

  /**
   * 0–1 score.  1 = fully deterministic (same inputs always produce same
   * outputs).  Used as a routing tie-breaker for high-risk tasks.
   */
  determinismScore: number;

  /**
   * 0–1 score.  1 = full structured telemetry emitted per call.
   * Required >= 0.5 for high-risk tasks.
   */
  observabilityScore: number;

  /**
   * When true the agent emits structured audit records compatible with
   * the Summit Flight Recorder schema.
   */
  auditEnabled: boolean;

  /** Optional human-readable description. */
  description?: string;

  /** Optional ISO-8601 timestamp of last health check. */
  lastHealthCheck?: string;
}
