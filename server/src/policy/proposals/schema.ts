import { z } from 'zod';

export const ChangeType = z.enum([
  'ENFORCE_GUARDRAIL_PURPOSE',
  'ENFORCE_GUARDRAIL_DENY',
  'RESTRICT_CROSS_TENANT',
  'ADD_DENY_RULE',
]);

export type ChangeType = z.infer<typeof ChangeType>;

export const RiskScore = z.number().min(0).max(10);

export const VerificationPlan = z.object({
  commands: z.array(z.string()),
  manualChecks: z.array(z.string()),
});

export const ProposalTrigger = z.object({
  type: z.enum(['drift', 'manual', 'simulation_failure']),
  source: z.string(),
  details: z.record(z.any()),
  timestamp: z.string().datetime(),
});

export const ProposalArtifacts = z.object({
  patchPath: z.string(),
  rollbackPath: z.string(),
  metadataPath: z.string(),
});

export const ProposalSchema = z.object({
  id: z.string(),
  schemaVersion: z.literal('v1'),
  createdAt: z.string().datetime(),
  target: z.string(), // e.g., "tenant:template_strict" or file path
  triggers: z.array(ProposalTrigger),
  changeType: ChangeType,
  rationale: z.string(),
  safetyClaims: z.array(z.string()),
  riskScore: RiskScore,
  riskFactors: z.array(z.string()),
  expectedImpact: z.object({
    stricter: z.array(z.string()),
    breakageRisk: z.array(z.string()),
  }),
  verificationPlan: VerificationPlan,
  simulationResults: z.object({
    passed: z.boolean(),
    summary: z.string(),
    simId: z.string().optional(),
  }),
  artifacts: ProposalArtifacts,
});

export type Proposal = z.infer<typeof ProposalSchema>;

// Input for generating a proposal
export const ProposalRequestSchema = z.object({
  targetBundleId: z.string(),
  changeType: ChangeType,
  args: z.record(z.any()).default({}), // Arguments for the transform (e.g., specific rule ID)
  rationale: z.string(),
  triggers: z.array(ProposalTrigger).default([]),
});

export type ProposalRequest = z.infer<typeof ProposalRequestSchema>;
