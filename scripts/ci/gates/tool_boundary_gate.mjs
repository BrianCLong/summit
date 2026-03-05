import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { validateSchema } from '../lib/json_schema_validate.mjs';
import yaml from 'js-yaml';

export function runToolBoundaryGate() {
  const violations = [];
  const scannedFixtures = [];
  const root = join(process.cwd(), 'GOLDEN/datasets/governance-fixtures/tool-call');
  const schemaPath = join(process.cwd(), 'docs/governance/schemas/tool.call.schema.json');
  const policyPath = join(process.cwd(), 'docs/governance/tooling/TOOL_POLICY.yml');

  try {
    const schemaContent = readFileSync(schemaPath, 'utf8');
    const schema = JSON.parse(schemaContent);
    const policyContent = readFileSync(policyPath, 'utf8');
    const policy = yaml.load(policyContent);
    const types = ['valid', 'invalid'];

    for (const type of types) {
      const dir = join(root, type);
      const files = readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        scannedFixtures.push(file);
        const content = readFileSync(join(dir, file), 'utf8');
        const data = JSON.parse(content);

        // Validation 1: Match against the base schema
        const { valid, errors } = validateSchema(schema, data);
        if (type === 'valid' && !valid) {
            violations.push(`Valid fixture ${file} failed schema validation: ${JSON.stringify(errors)}`);
            continue;
        }

        // Validation 2: Check tool existence and scope rules
        const toolPolicy = policy.tools[data.tool_name];
        if (!toolPolicy) {
          violations.push(`Tool ${data.tool_name} not found in TOOL_POLICY.yml`);
          continue;
        }

        if (!toolPolicy.allowed_scopes.includes(data.declared_scope)) {
          violations.push(`Tool ${data.tool_name} requested unauthorized scope: ${data.declared_scope}`);
        }

        // Validation 3: Ensure invalid fixtures fail
        if (type === 'invalid') {
          // If we reached here without a violation, that means the invalid fixture unexpectedly passed
          const hasViolation = !toolPolicy || !toolPolicy.allowed_scopes.includes(data.declared_scope);
          if (!hasViolation) {
            violations.push(`Invalid fixture ${file} unexpectedly passed boundary rules`);
          } else {
             // It failed as expected, so remove the violation since this is a test fixture meant to fail
             violations.pop();
          }
        }
      }
    }
  } catch (err) {
    violations.push(`Failed to process fixtures: ${err.message}`);
  }

  return { scannedFixtures, violations };
}
