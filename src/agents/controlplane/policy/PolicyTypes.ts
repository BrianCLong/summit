/**
 * PolicyTypes — shared types for the Summit Policy Decision Point.
 *
 * EVD-AFCP-POLICY-004
 */

import type { DataClassification, RiskLevel } from "../registry/AgentDescriptor.js";

export interface PolicyInput {
  /** Agent id being evaluated. */
  agentId: string;

  /** Capability the agent is being asked to exercise. */
  capability: string;

  /** Tools the agent will use for this task. */
  requestedTools: string[];

  /** Tools this agent is authorised to use (from its descriptor). */
  allowedTools: string[];

  /** Datasets the task will touch. */
  requestedDatasets: string[];

  /** Datasets this agent is authorised to touch (from its descriptor). */
  allowedDatasets: string[];

  /** Classification of the data involved in the task. */
  dataClassification: DataClassification;

  /** Risk level of the task. */
  taskRisk: RiskLevel;

  /** Whether a human has already approved this task. */
  humanApprovalGranted: boolean;

  /** Whether the task has been tagged as requiring human approval. */
  requiresHumanApproval: boolean;
}

export interface PolicyDecision {
  allow: boolean;

  /** Reasons for denial (empty when allow === true). */
  reasons: string[];
}
