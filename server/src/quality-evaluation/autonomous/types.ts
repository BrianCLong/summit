import { z } from 'zod';

// Epic 1: Evaluation Capability Taxonomy

export enum EvaluationCapabilityType {
  TEST_GENERATION = 'TEST_GENERATION',
  STATIC_ANALYSIS = 'STATIC_ANALYSIS',
  INVARIANT_CHECK = 'INVARIANT_CHECK',
  SCENARIO_VALIDATION = 'SCENARIO_VALIDATION',
}

export enum ProhibitedActionType {
  SELF_APPROVAL = 'SELF_APPROVAL',
  SUPPRESSION = 'SUPPRESSION',
  CRITERIA_MODIFICATION = 'CRITERIA_MODIFICATION',
  MERGE_GATING = 'MERGE_GATING',
  CI_MODIFICATION = 'CI_MODIFICATION',
}

export const EvaluationCapabilitySchema = z.object({
  type: z.nativeEnum(EvaluationCapabilityType),
  version: z.string(),
  description: z.string(),
  allowedActions: z.array(z.string()),
  prohibitedActions: z.array(z.nativeEnum(ProhibitedActionType)),
});

// Manual Type Definition to avoid 'z' namespace issues in this environment
export interface EvaluationCapability {
  type: EvaluationCapabilityType;
  version: string;
  description: string;
  allowedActions: string[];
  prohibitedActions: ProhibitedActionType[];
}

// Epic 3: Evaluation Criteria Transparency

export const EvaluationCriteriaSchema = z.object({
  id: z.string(),
  description: z.string(),
  // Reference to invariants or contracts
  reference: z.string().optional(),
  // Expected logic or condition
  logic: z.string(),
  // Must be static, not dynamic/hidden
  isStatic: z.literal(true),
});

export interface EvaluationCriteria {
  id: string;
  description: string;
  reference?: string;
  logic: string;
  isStatic: true;
}

export const EvaluationRequestSchema = z.object({
  traceId: z.string(),
  agentId: z.string(),
  capability: z.nativeEnum(EvaluationCapabilityType),
  // The artifact being evaluated (code, output, etc.)
  target: z.any(),
  criteria: z.array(EvaluationCriteriaSchema),
  // Constraints for the harness
  constraints: z.object({
    timeoutMs: z.number().max(30000), // Max 30s
    maxSteps: z.number().max(100),
    memoryLimitMb: z.number().max(512),
  }),
});

export interface EvaluationRequest {
  traceId: string;
  agentId: string;
  capability: EvaluationCapabilityType;
  target: any;
  criteria: EvaluationCriteria[];
  constraints: {
    timeoutMs: number;
    maxSteps: number;
    memoryLimitMb: number;
  };
}

// Epic 4: Reporting

export const EvaluationReportSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  agentId: z.string(),
  capability: z.nativeEnum(EvaluationCapabilityType),
  capabilityVersion: z.string(),
  criteriaResults: z.array(z.object({
    criteriaId: z.string(),
    passed: z.boolean(),
    reason: z.string(),
    context: z.any().optional(),
  })),
  // Advisory only flag
  isAdvisory: z.literal(true),
  limitations: z.array(z.string()),
  executionStats: z.object({
    durationMs: z.number(),
    memoryUsageMb: z.number(),
    stepsTaken: z.number(),
  }),
});

export interface EvaluationReport {
  id: string;
  timestamp: Date;
  agentId: string;
  capability: EvaluationCapabilityType;
  capabilityVersion: string;
  criteriaResults: {
    criteriaId: string;
    passed: boolean;
    reason: string;
    context?: any;
  }[];
  isAdvisory: true;
  limitations: string[];
  executionStats: {
    durationMs: number;
    memoryUsageMb: number;
    stepsTaken: number;
  };
}
