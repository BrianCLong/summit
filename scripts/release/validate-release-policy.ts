
import fs from 'fs';
import yaml from 'js-yaml';
import { z } from 'zod';
import path from 'path';

const PolicySchema = z.object({
  default_branch: z.string(),
  freeze: z.object({
    enabled: z.boolean(),
    timezone: z.string().optional(),
    windows: z.array(z.object({
      name: z.string(),
      rrule: z.string().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
      active: z.boolean(),
    })).optional(),
  }).optional(),
  override: z.object({
    allowed: z.boolean(),
    require_reason: z.boolean(),
    reason_min_len: z.number().optional(),
  }).optional(),
  channels: z.record(z.string(), z.object({
    allowed_branches: z.array(z.string()).optional(),
    allowed_from: z.array(z.string()).optional(), // Legacy support
    requirements: z.object({
      evidence: z.array(z.string()),
      shards: z.array(z.string()),
      resilience: z.object({
        dr_drill: z.enum(['required', 'optional', 'none']).default('none'),
        backup_integrity: z.enum(['required', 'optional', 'none']).default('none'),
      }).optional(),
    }).optional(),
    require_evidence: z.boolean().optional(), // Legacy support
  })),
});

async function validatePolicy() {
  const policyPath = path.resolve(process.cwd(), 'release-policy.yml');

  if (!fs.existsSync(policyPath)) {
    console.error(`Policy file not found at ${policyPath}`);
    process.exit(1);
  }

  try {
    const fileContents = fs.readFileSync(policyPath, 'utf8');
    const data = yaml.load(fileContents);

    // console.log('Parsed YAML data:', JSON.stringify(data, null, 2));

    const policy = PolicySchema.parse(data);
    console.log(JSON.stringify({ status: 'valid', policy }, null, 2));
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.error('Policy validation failed:');
      console.error(JSON.stringify(e.errors, null, 2)); // Use e.errors for formatting
      // console.error('Zod Error Detail:', JSON.stringify(e, null, 2));
    } else {
      console.error('Error parsing policy:', e);
    }
    process.exit(1);
  }
}

validatePolicy();
