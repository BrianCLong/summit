#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..', '..');
const schemaPath = path.join(repoRoot, 'schemas', 'cogwar', 'campaign.v1.schema.json');
const examplesDir = path.join(repoRoot, 'examples', 'cogwar', 'ru-ua');
const distDir = path.join(repoRoot, 'dist', 'cogwar');

function stableSort(value) {
  if (Array.isArray(value)) {
    return value.map(item => stableSort(item));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stableSort(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableSort(value), null, 2) + '\n';
}

function loadSchema() {
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

function loadCampaigns() {
  const files = fs
    .readdirSync(examplesDir)
    .filter(name => name.endsWith('.campaign.json'))
    .sort();
  return files.map(file => {
    const fullPath = path.join(examplesDir, file);
    const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    return { file, content };
  });
}

function validateCampaigns(schema, campaigns) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const failures = [];
  for (const campaign of campaigns) {
    const ok = validate(campaign.content);
    if (!ok) {
      failures.push({ file: campaign.file, errors: validate.errors });
    }
  }
  return failures;
}

function buildPacks(campaigns) {
  const payload = {
    schema_version: 'cogwar.campaign.v1',
    campaigns: campaigns
      .map(item => item.content)
      .sort((a, b) => a.campaign_id.localeCompare(b.campaign_id)),
  };
  return payload;
}

function writeOutputs(packs) {
  fs.mkdirSync(distDir, { recursive: true });
  const packsJson = stableStringify(packs);
  fs.writeFileSync(path.join(distDir, 'packs.json'), packsJson);

  const metrics = {
    schema_version: packs.schema_version,
    campaigns: packs.campaigns.length,
    narratives: packs.campaigns.reduce(
      (sum, campaign) => sum + campaign.narratives.length,
      0
    ),
    indicators: packs.campaigns.reduce(
      (sum, campaign) => sum + campaign.indicators.length,
      0
    ),
  };
  fs.writeFileSync(path.join(distDir, 'metrics.json'), stableStringify(metrics));

  const contentSha = crypto.createHash('sha256').update(packsJson).digest('hex');
  const gitCommit =
    process.env.GITHUB_SHA ||
    process.env.GIT_COMMIT ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    'UNKNOWN';

  const stamp = {
    schema_version: packs.schema_version,
    content_sha256: contentSha,
    git_commit: gitCommit,
  };
  fs.writeFileSync(path.join(distDir, 'stamp.json'), stableStringify(stamp));
}

function main() {
  const schema = loadSchema();
  const campaigns = loadCampaigns();
  const failures = validateCampaigns(schema, campaigns);
  if (failures.length > 0) {
    const message = failures
      .map(failure => {
        const details = failure.errors
          ?.map(error => `${error.instancePath || '/'}:${error.keyword}`)
          .sort()
          .join(', ');
        return `${failure.file}: ${details}`;
      })
      .join('\n');
    throw new Error(`Schema validation failed:\n${message}`);
  }
  const packs = buildPacks(campaigns);
  writeOutputs(packs);
}

main();
