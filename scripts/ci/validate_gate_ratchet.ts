#!/usr/bin/env -S npx tsx

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';

const GateSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  status: z.enum(['required', 'report_only']),
  description: z.string(),
  owner: z.string(),
  workflow_job: z.string().optional(), // Mapping to workflow file/job
  promotion_criteria: z.object({
    min_consecutive_green: z.number().int().min(1),
    min_pass_rate_percent: z.number().min(0).max(100),
    max_flake_retry_percent: z.number().min(0).max(100),
    max_duration_seconds_p95: z.number().positive(),
  }),
});

const ConfigSchema = z.object({
  gates: z.array(GateSchema).refine(
    (gates) => {
      const ids = gates.map((g) => g.id);
      return new Set(ids).size === ids.length;
    },
    { message: 'Gate IDs must be unique' }
  ),
});

const CONFIG_PATH = path.join(process.cwd(), 'ci/gate-ratchet.yml');

function validate() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      console.error(`Config file not found at ${CONFIG_PATH}`);
      process.exit(1);
    }

    const fileContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = yaml.load(fileContent);

    const result = ConfigSchema.safeParse(parsed);

    if (!result.success) {
      console.error('Validation failed:');
      console.error(JSON.stringify(result.error.format(), null, 2));
      process.exit(1);
    }

    console.log('✅ ci/gate-ratchet.yml is valid.');
  } catch (error) {
    console.error('Error validation config:', error);
    process.exit(1);
  }
}

validate();
