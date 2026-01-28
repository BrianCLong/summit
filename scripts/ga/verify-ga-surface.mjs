#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

const requiredFeatures = [
  'Demo Mode Hard Gate',
  'Rate Limiting',
  'AuthN/AuthZ Helpers',
  'Observability Taxonomy',
  'Data Classification & Governance',
  'Policy Preflight & Receipts',
  'Ingestion Security Hardening',
  'Generative UI Plan Contract',
  'GA Gate Artifact Closure'
];

const allowedTiers = new Set(['A', 'B', 'C']);
const allowedCiStatus = new Set(['wired', 'pending', 'manual']);

const errors = [];

async function readJson(relativePath) {
  const absolute = path.join(repoRoot, relativePath);
  const content = await fs.readFile(absolute, 'utf8');
  return JSON.parse(content);
}

async function ensureFileContains(relativePath, keyword) {
  const absolute = path.join(repoRoot, relativePath);
  try {
    const content = await fs.readFile(absolute, 'utf8');
    if (!content.toLowerCase().includes(String(keyword).toLowerCase())) {
      errors.push(`Keyword "${keyword}" not found in ${relativePath}`);
    }
  } catch (err) {
    errors.push(`Cannot read ${relativePath}: ${err.message}`);
  }
}

async function validateVerificationMap() {
  const map = await readJson('docs/ga/verification-map.json');
  const featureNames = map.map((entry) => entry.feature);
  const sortedFeatureNames = [...featureNames].sort((a, b) => {
    const left = a.toLowerCase();
    const right = b.toLowerCase();
    if (left < right) {
      return -1;
    }
    if (left > right) {
      return 1;
    }
    return 0;
  });

  const isSorted = featureNames.every(
    (feature, index) => feature === sortedFeatureNames[index]
  );
  if (!isSorted) {
    errors.push(
      'verification-map.json entries must be sorted by feature name (case-insensitive).'
    );
  }

  for (const feature of requiredFeatures) {
    if (!featureNames.includes(feature)) {
      errors.push(`Missing required feature in verification-map.json: ${feature}`);
    }
  }

  for (const entry of map) {
    if (!entry.feature || typeof entry.feature !== 'string') {
      errors.push('Each verification entry must include a feature name.');
    }
    if (!allowedTiers.has(entry.tier)) {
      errors.push(`Invalid tier for ${entry.feature}: ${entry.tier}`);
    }
    if (!allowedCiStatus.has(entry.ciStatus)) {
      errors.push(`Invalid ciStatus for ${entry.feature}: ${entry.ciStatus}`);
    }
    if (!entry.artifact) {
      errors.push(`Missing artifact reference for ${entry.feature}`);
    }
    if (!Array.isArray(entry.evidence) || entry.evidence.length === 0) {
      errors.push(`Evidence list missing for ${entry.feature}`);
      continue;
    }

    for (const [index, evidencePath] of entry.evidence.entries()) {
      const absolute = path.join(repoRoot, evidencePath);
      try {
        await fs.access(absolute);
      } catch (err) {
        errors.push(`Evidence path not found for ${entry.feature}: ${evidencePath}`);
        continue;
      }
      const keyword = Array.isArray(entry.keywords)
        ? entry.keywords[index] ?? entry.keywords.at(-1)
        : entry.keyword;
      if (keyword) {
        await ensureFileContains(evidencePath, keyword);
      }
    }
  }
}

async function validateDocs() {
  const testingStrategy = await fs.readFile(path.join(repoRoot, 'docs/ga/TESTING-STRATEGY.md'), 'utf8');
  ['Tier A', 'Tier B', 'Tier C', 'ga-verify'].forEach((token) => {
    if (!testingStrategy.includes(token)) {
      errors.push(`docs/ga/TESTING-STRATEGY.md must mention ${token}`);
    }
  });

  const legacyDoc = await fs.readFile(path.join(repoRoot, 'docs/ga/LEGACY-MODE.md'), 'utf8');
  ['What Legacy Mode Allows', 'What Legacy Mode Never Allows', 'Guardrails', 'Exit Criteria', 'Verification Requirements'].forEach((heading) => {
    if (!legacyDoc.includes(heading)) {
      errors.push(`docs/ga/LEGACY-MODE.md missing heading: ${heading}`);
    }
  });

  const verificationDoc = await fs.readFile(path.join(repoRoot, 'docs/ga/MVP-4-GA-VERIFICATION.md'), 'utf8');
  requiredFeatures.forEach((feature) => {
    if (!verificationDoc.includes(feature)) {
      errors.push(`docs/ga/MVP-4-GA-VERIFICATION.md missing feature row: ${feature}`);
    }
  });

  await ensureFileContains('PROVENANCE_SCHEMA.md', 'Provenance');
}

async function validateAgentContract() {
  try {
    const contract = await readJson('agent-contract.json');
    if (!contract.version || !contract.allowedZones) {
      errors.push('agent-contract.json must include version and allowedZones.');
    }
    if (!Array.isArray(contract.allowedZones) || contract.allowedZones.length === 0) {
      errors.push('agent-contract.json must define at least one allowedZone.');
    }
    if (!contract.verificationRules || !contract.verificationRules.ciCommands) {
      errors.push('agent-contract.json must include verificationRules.ciCommands');
    }
  } catch (err) {
    errors.push(`Failed to read agent-contract.json: ${err.message}`);
  }
}

async function main() {
  await validateVerificationMap();
  await validateDocs();
  await validateAgentContract();

  if (errors.length) {
    console.error('\nGA hardening verification failed:');
    errors.forEach((err) => console.error(`- ${err}`));
    process.exitCode = 1;
  } else {
    console.log('GA hardening verification succeeded.');
  }
}

main().catch((err) => {
  console.error('GA hardening verification crashed:', err);
  process.exit(1);
});
