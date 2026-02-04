import { z } from 'zod';

const defaultCapabilities = {
  tool_use: false,
  memory: false,
  planning: false,
  orchestration: false,
  evals: false,
  safety: false,
  observability: false,
  multi_agent: false,
  sandboxing: false,
};

export const CapabilitiesSchema = z.object({
  tool_use: z.boolean().default(false),
  memory: z.boolean().default(false),
  planning: z.boolean().default(false),
  orchestration: z.boolean().default(false),
  evals: z.boolean().default(false),
  safety: z.boolean().default(false),
  observability: z.boolean().default(false),
  multi_agent: z.boolean().default(false),
  sandboxing: z.boolean().default(false),
});

const defaultSignals = {
    active_community: false,
};

export const SignalsSchema = z.object({
  github_stars: z.number().optional(),
  last_commit: z.string().optional(), // Allow loose date string for now
  license: z.string().optional(),
  active_community: z.boolean().default(false),
  docs_quality: z.enum(['High', 'Medium', 'Low', 'None']).optional(),
});

export const ResourceTypeSchema = z.enum([
  'Framework',
  'Tool',
  'Platform',
  'Model',
  'Guide',
  'Benchmark',
  'Community'
]);

export const ResourceSchema = z.object({
  id: z.string().uuid().optional(), // Optional on input, required on output
  name: z.string(),
  type: ResourceTypeSchema,
  url: z.string().url(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  maturity: z.enum(['Experimental', 'Alpha', 'Beta', 'Production', 'Deprecated']).default('Experimental'),
  capabilities: CapabilitiesSchema.default(defaultCapabilities),
  signals: SignalsSchema.default(defaultSignals),
});

export const AgentEvidenceBundleSchema = z.object({
  id: z.string().uuid(),
  resource_id: z.string().uuid(),
  timestamp: z.string().datetime(),

  // The snapshot of the resource at this point in time
  primaryArtifact: ResourceSchema,

  provenance: z.object({
    source: z.string(), // e.g. "manual-entry", "github-crawler"
    method: z.string(), // "seed", "scrape"
    actor: z.string().default("summit-agent-indexer"),
  }),

  verification: z.object({
    status: z.enum(['unverified', 'verified', 'failed']).default('unverified'),
    tests_run: z.array(z.string()).default([]),
    results: z.record(z.any()).default({}),
  }),

  claims: z.array(z.object({
    claim: z.string(),
    evidence: z.string().optional(),
    confidence: z.number().min(0).max(1).default(0.5),
  })).default([]),
});
