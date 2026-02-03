import fs from 'fs';
import yaml from 'js-yaml';
import { z } from 'zod';

const GateRuleSchema = z.object({
  require: z.array(z.record(z.boolean())).optional(),
  deny_if: z.array(z.record(z.boolean())).optional(),
});

const PolicySchema = z.object({
  version: z.number(),
  gates: z.object({
    ingest: GateRuleSchema,
    execution: GateRuleSchema,
    evidence: GateRuleSchema,
  }),
});

export type RetrievalPolicy = z.infer<typeof PolicySchema>;

export function validatePolicyFile(filepath: string): RetrievalPolicy {
  const content = fs.readFileSync(filepath, 'utf8');
  const raw = yaml.load(content);
  return PolicySchema.parse(raw);
}
