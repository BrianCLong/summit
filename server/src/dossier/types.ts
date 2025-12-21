import { z } from 'zod';

export const CreateAssuranceSchema = z.object({
  type: z.string().min(1),
  content: z.string().min(1),
  source: z.string().min(1),
  startDate: z.string().datetime().optional(), // ISO string
  endDate: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

export const CreateRiskSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['active', 'mitigated', 'accepted']),
  mitigationPlan: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const CreateArtifactSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  uri: z.string().url(),
  hash: z.string().regex(/^[a-f0-9]{64}$/i, "Must be a valid SHA256 hash"),
  source: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type CreateAssuranceInput = z.infer<typeof CreateAssuranceSchema>;
export type CreateRiskInput = z.infer<typeof CreateRiskSchema>;
export type CreateArtifactInput = z.infer<typeof CreateArtifactSchema>;

export interface Assurance {
  id: string;
  type: string;
  content: string;
  source: string;
  startDate?: string;
  endDate?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Risk {
  id: string;
  category: string;
  description: string;
  severity: string;
  status: string;
  mitigationPlan?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Artifact {
  id: string;
  type: string;
  name: string;
  uri: string;
  hash: string;
  source?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface DossierExport {
  dossierId: string;
  accountId: string;
  generatedAt: string;
  assurances: Assurance[];
  risks: Risk[];
  artifacts: Artifact[];
  timeline: { type: string; date: string; data: Assurance | Risk | Artifact }[];
  manifestHash: string; // Hash of this export content
}
