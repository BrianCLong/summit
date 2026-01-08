import { readFileSync, existsSync } from 'fs';
import { load } from 'js-yaml';
import { z } from 'zod';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Schema Definition ---

const GateLevel = z.string().refine(val => ['report_only', 'required'].includes(val));

const StageSchema = z.object({
  description: z.string(),
  gates: z.object({
    promotion_guard: GateLevel,
    deps_approval: GateLevel,
    policy_drift: GateLevel,
    field_budgets: GateLevel,
    observability_verify: GateLevel,
  }),
});

const MappingSchema = z.object({
  pattern: z.string(),
  stage: z.string(),
});

// NOTE: Zod v4 might have different record validation behavior?
// In Zod 3, z.record(ValueType) means keys are strings.
// But the error says "Invalid key in record".
// Maybe Zod v4 expects z.record(KeyType, ValueType)?

const PolicySchema = z.object({
  stages: z.record(z.string(), StageSchema), // Try explicitly defining key type
  mappings: z.array(MappingSchema),
});

// --- Validation Logic ---

function validatePolicy(filepath: string) {
  if (!existsSync(filepath)) {
    console.error(`Error: Policy file not found at ${filepath}`);
    process.exit(1);
  }

  const content = readFileSync(filepath, 'utf8');
  let data;

  try {
    data = load(content);
  } catch (e: any) {
    console.error(`Error parsing YAML: ${e.message}`);
    process.exit(1);
  }

  try {
    const policy = PolicySchema.parse(data);

    // Additional Validation: Check if mapped stages exist
    const stageKeys = Object.keys(policy.stages);
    for (const mapping of policy.mappings) {
      if (!stageKeys.includes(mapping.stage)) {
        throw new Error(`Mapping references undefined stage: ${mapping.stage}`);
      }
    }

    console.log('✅ Maturity stages policy is valid.');
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      console.error('Validation Error:', JSON.stringify(e.format(), null, 2));
    } else {
      console.error(`Validation Error: ${e.message}`);
    }
    process.exit(1);
  }
}

// --- Main Execution ---

const policyPath = process.argv[2] || join(__dirname, '../../ci/maturity-stages.yml');
validatePolicy(policyPath);
