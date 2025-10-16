#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import glob from 'glob';
import process from 'node:process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const root = process.cwd();
const schemas = {
  changeplan: {
    schema: 'docs/schemas/changeplan.schema.json',
    patterns: [
      '**/*changeplan.yaml',
      '**/*ChangePlan.yaml',
      'docs/examples/changeplan.yaml',
    ],
  },
  experiment: {
    schema: 'docs/schemas/experiment.schema.json',
    patterns: ['**/*experiment.yaml', 'docs/examples/experiment.yaml'],
  },
  runbook: {
    schema: 'docs/schemas/runbook.schema.json',
    patterns: ['**/*runbook.yaml', 'docs/examples/runbook.yaml'],
  },
  migration: {
    schema: 'docs/schemas/migration.schema.json',
    patterns: [
      '**/*migration.yaml',
      '**/*migrations.yaml',
      'docs/examples/migration.yaml',
    ],
  },
  perf: {
    schema: 'docs/schemas/perf-budget.schema.json',
    patterns: ['**/perf.budget.json', 'docs/examples/perf.budget.json'],
  },
  journey: {
    schema: 'docs/schemas/journey-budget.schema.json',
    patterns: ['**/journey.budget.json', 'docs/examples/journey.budget.json'],
  },
  cbl: {
    schema: 'docs/schemas/cbl.schema.json',
    patterns: [
      '**/*.cbl.yaml',
      '**/*.cbl.yml',
      'docs/examples/cbl.example.yaml',
    ],
  },
  airgap: {
    schema: 'docs/schemas/airgap-bundle.schema.json',
    patterns: ['**/*.airgap.json', '**/*.bundle.json'],
  },
  evidence: {
    schema: 'docs/schemas/evidence-pack-v2.schema.json',
    patterns: ['**/*evidence*.json'],
  },
};

const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
addFormats(ajv);
const results = [];

for (const [key, cfg] of Object.entries(schemas)) {
  const schemaPath = path.join(root, cfg.schema);
  if (!fs.existsSync(schemaPath)) {
    results.push({
      key,
      status: 'skipped',
      reason: `missing schema ${cfg.schema}`,
    });
    continue;
  }
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const validate = ajv.compile(schema);
  const files = [
    ...new Set(
      cfg.patterns.flatMap((p) =>
        glob.sync(p, {
          cwd: root,
          nodir: true,
          ignore: ['**/node_modules/**', '.git/**'],
        }),
      ),
    ),
  ].filter((f) => fs.existsSync(f));
  if (files.length === 0) {
    results.push({ key, status: 'skipped', reason: 'no matching files' });
    continue;
  }

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const raw = fs.readFileSync(file, 'utf8');
    let data;
    try {
      data =
        ext === '.yaml' || ext === '.yml' ? yaml.load(raw) : JSON.parse(raw);
    } catch (e) {
      results.push({
        key,
        file,
        status: 'error',
        errors: [{ message: `Parse error: ${e.message}` }],
      });
      continue;
    }
    const ok = validate(data);
    if (!ok) {
      const errs = validate.errors?.map((e) => ({
        instancePath: e.instancePath,
        message: e.message,
        schemaPath: e.schemaPath,
      })) ?? [{ message: 'Unknown validation error' }];
      results.push({ key, file, status: 'fail', errors: errs });
    } else {
      results.push({ key, file, status: 'pass' });
    }
  }
}

const summary = [];
let failed = 0;
const byKey = results.reduce((acc, r) => {
  (acc[r.key] ??= []).push(r);
  return acc;
}, {});
summary.push('# ✅ DSL Validation Report');
for (const [key, items] of Object.entries(byKey)) {
  const p = items.filter((i) => i.status === 'pass').length;
  const f = items.filter(
    (i) => i.status === 'fail' || i.status === 'error',
  ).length;
  const s = items.filter((i) => i.status === 'skipped').length;
  failed += f;
  summary.push(`\n## ${key} — pass:${p} fail:${f} skip:${s}`);
  for (const it of items) {
    if (it.status === 'pass')
      summary.push(`- ✅ ${it.file ?? it.reason ?? ''}`);
    else if (it.status === 'skipped')
      summary.push(`- ⚪ skipped: ${it.reason}`);
    else if (it.status === 'error')
      summary.push(`- ❌ ${it.file}: ${it.errors[0].message}`);
    else if (it.status === 'fail') {
      summary.push(`- ❌ ${it.file}`);
      it.errors
        .slice(0, 10)
        .forEach((e) =>
          summary.push(
            `  - ${e.instancePath || '/'} — ${e.message} (${e.schemaPath})`,
          ),
        );
      if (it.errors.length > 10)
        summary.push(`  - …and ${it.errors.length - 10} more`);
    }
  }
}
fs.writeFileSync('validation-summary.md', summary.join('\n'));
console.log(summary.join('\n'));
process.exit(failed > 0 ? 1 : 0);
