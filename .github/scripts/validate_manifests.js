// Validate YAML/JSON manifests in examples/ against contracts/*.schema.json
import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..', '..');
const schemasDir = path.join(ROOT, 'contracts');
const wfSchemaPath = path.join(schemasDir, 'workflow.schema.json');
const rbSchemaPath = path.join(schemasDir, 'runbook.schema.json');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function load(file) {
  const raw = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.yaml') || file.endsWith('.yml')) return YAML.parse(raw);
  return JSON.parse(raw);
}

function formatErrors(errors = []) {
  return errors
    .map(
      (e) =>
        `  • ${e.instancePath || '/'} ${e.message}${e.params && e.params.allowedValues ? ` (allowed: ${e.params.allowedValues})` : ''}`,
    )
    .join('\n');
}

(async () => {
  const wfSchema = JSON.parse(fs.readFileSync(wfSchemaPath, 'utf8'));
  const rbSchema = JSON.parse(fs.readFileSync(rbSchemaPath, 'utf8'));
  const validateWF = ajv.compile(wfSchema);
  const validateRB = ajv.compile(rbSchema);

  const files = await glob(
    [
      'examples/workflows/**/*.{yaml,yml,json}',
      'examples/runbooks/**/*.{yaml,yml,json}',
    ],
    { nodir: true },
  );
  if (!files.length) {
    console.warn('No manifests found under examples/.');
    process.exit(0);
  }

  let failed = 0;
  for (const f of files) {
    const doc = load(f);
    const kind = doc?.kind;
    const validate =
      kind === 'Workflow' ? validateWF : kind === 'Runbook' ? validateRB : null;
    if (!validate) {
      console.error(`✖ ${f}: unknown kind ${kind}`);
      failed++;
      continue;
    }
    const ok = validate(doc);
    if (!ok) {
      console.error(
        `✖ ${f}: schema validation failed\n${formatErrors(validate.errors)}`,
      );
      failed++;
    } else {
      console.log(`✔ ${f}`);
    }
  }

  if (failed) {
    console.error(`\n${failed} file(s) failed schema validation.`);
    process.exit(1);
  }
})();
