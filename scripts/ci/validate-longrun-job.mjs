import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import yaml from 'js-yaml';

const workspaceRoot = process.cwd();
const schemaPath = path.join(
  workspaceRoot,
  'libs',
  'maestro',
  'longrun',
  'job.schema.json',
);

const loadJobSpec = (jobPath) => {
  const raw = fs.readFileSync(jobPath, 'utf-8');
  if (jobPath.endsWith('.json')) {
    return JSON.parse(raw);
  }
  return yaml.load(raw);
};

const collectJobPaths = () => {
  const paths = new Set();
  const samplePath = path.join(
    workspaceRoot,
    'docs',
    'maestro',
    'longrun.sample.yaml',
  );
  if (fs.existsSync(samplePath)) {
    paths.add(samplePath);
  }

  const jobsDir = path.join(workspaceRoot, '.maestro', 'jobs');
  if (fs.existsSync(jobsDir)) {
    for (const entry of fs.readdirSync(jobsDir)) {
      const fullPath = path.join(jobsDir, entry);
      if (!fs.statSync(fullPath).isFile()) {
        continue;
      }
      if (/(\.ya?ml|\.json)$/i.test(entry)) {
        paths.add(fullPath);
      }
    }
  }

  const envPaths = process.env.LONGRUN_JOB_PATHS;
  if (envPaths) {
    envPaths
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((p) => paths.add(path.resolve(workspaceRoot, p)));
  }

  return Array.from(paths);
};

const main = () => {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Missing schema at ${schemaPath}`);
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const jobPaths = collectJobPaths();
  if (jobPaths.length === 0) {
    console.log('No LongRunJob specs found; advisory validation skipped.');
    return;
  }

  console.log('LongRunJob advisory validation (dry-run):');

  for (const jobPath of jobPaths) {
    const job = loadJobSpec(jobPath);
    const ok = validate(job);
    if (!ok) {
      console.error(`Invalid job spec: ${jobPath}`);
      console.error(validate.errors);
      process.exitCode = 1;
      continue;
    }

    const mode = job.mode ?? 'advisory';
    console.log(`\n- ${jobPath}`);
    console.log(`  job_id: ${job.job_id}`);
    console.log(`  goal: ${job.goal}`);
    console.log(`  mode: ${mode}`);
    console.log(`  scope_paths: ${job.scope_paths.join(', ')}`);
    console.log(`  allowed_tools: ${job.allowed_tools.join(', ')}`);
    console.log(
      `  budgets: $${job.budgets.per_hour_usd}/hr, $${job.budgets.total_usd} total, ${job.budgets.tokens} tokens`,
    );
    console.log(
      `  model_policy: search=${job.model_policy.search_model}, build=${job.model_policy.build_model}, debug=${job.model_policy.debug_model}`,
    );
    console.log(`  quality_gates.required: ${job.quality_gates.required.join(', ')}`);
    console.log(
      `  stop_conditions: max_iterations=${job.stop_conditions.max_iterations}, max_stall=${job.stop_conditions.max_stall_iterations}`,
    );
  }

  if (process.exitCode === 1) {
    throw new Error('LongRunJob validation failed.');
  }
};

main();
