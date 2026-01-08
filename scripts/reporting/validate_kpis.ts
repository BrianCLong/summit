import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

const KpiSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  formula: z.string(),
  unit: z.enum(['percent', 'count', 'ms', 'currency']),
  threshold: z.object({
    warn: z.number(),
    fail: z.number(),
  }),
  allowed_sources: z.array(z.string()),
});

const ConfigSchema = z.object({
  kpis: z.array(KpiSchema),
  display_rules: z.object({
    rounding: z.number().int().min(0),
    pass_color: z.string(),
    warn_color: z.string(),
    fail_color: z.string(),
  }),
});

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error('Usage: tsx validate_kpis.ts <path-to-kpis.yml>');
    process.exit(1);
  }

  const kpiPath = args[0];

  try {
    const fileContent = fs.readFileSync(kpiPath, 'utf8');
    const data = yaml.load(fileContent);

    ConfigSchema.parse(data);
    console.log(`✅ KPI configuration at ${kpiPath} is valid.`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation failed:');
      console.error(JSON.stringify(error.errors, null, 2));
    } else {
      console.error('❌ Error reading or parsing file:', error);
    }
    process.exit(1);
  }
}

main();
