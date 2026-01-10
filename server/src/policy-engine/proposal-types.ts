// @ts-nocheck
import { z } from 'zod';

// Define the schema for a change operation
export const ConfigOperationSchema = z.enum(['add', 'remove', 'replace']);

export const ProposedChangeSchema = z.object({
  target: z.string(), // file path
  keyPath: z.string(), // dot-notation path to config key
  operation: ConfigOperationSchema,
  value: z.any(), // The new value (for add/replace) or undefined (for remove)
  originalValue: z.any().optional(), // For verification
});

export type ProposedChange = z.infer<typeof ProposedChangeSchema>;

// Risk Assessment Schema
export const RiskAssessmentSchema = z.object({
  blastRadius: z.enum(['low', 'medium', 'high', 'critical']),
  falsePositiveRisk: z.enum(['low', 'medium', 'high']),
  rollbackSteps: z.array(z.string()),
});

export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;

// Verification Schema
export const VerificationSchema = z.object({
  commands: z.array(z.string()),
  expectedSignals: z.array(z.string()),
});

export type Verification = z.infer<typeof VerificationSchema>;

// Proposal Status Schema
export const ProposalStatusSchema = z.enum(['proposed', 'approved', 'rejected', 'applied']);

export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;

// Main Policy Change Proposal Schema
export const PolicyChangeProposalSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(), // ISO 8601
  createdBy: z.string(), // "policy-auto-tuning-engine" usually
  inputEvidenceRefs: z.array(z.string()), // IDs of alerts/incidents
  rationale: z.string(),
  machineRationale: z.object({
    trigger: z.string(),
    confidence: z.number().min(0).max(1),
    features: z.record(z.any()),
  }),
  proposedChanges: z.array(ProposedChangeSchema),
  riskAssessment: RiskAssessmentSchema,
  verification: VerificationSchema,
  status: ProposalStatusSchema,
});

export type PolicyChangeProposal = z.infer<typeof PolicyChangeProposalSchema>;

// Evidence Types (Input to the engine)
export interface SecurityEvidence {
  id: string;
  type: 'deny_spike' | 'tool_mix_shift' | 'burst_behavior' | 'redaction_trigger';
  timestamp: string;
  data: Record<string, any>;
  source: string;
}
