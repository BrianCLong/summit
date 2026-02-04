import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

const requiredFeatures = {
  'Demo Mode Hard Gate': {
    keyword: 'DEMO_MODE'
  },
  'Rate Limiting': {
    keyword: 'rate limiting'
  },
  'AuthN/AuthZ Helpers': {
    keyword: 'Authorization'
  },
  'Observability Taxonomy': {},
  'Data Classification & Governance': {
    keyword: 'Governance'
  },
  'Policy Preflight & Receipts': {
    keyword: 'provenance'
  },
  'Ingestion Security Hardening': {
    keyword: 'ingestion'
  },
  'Media Authenticity & Provenance': {
    keyword: 'Media Authenticity'
  }
};

const verificationMapPath = path.join(repoRoot, 'docs/ga/verification-map.json');
const contractPath = path.join(repoRoot, 'agent-contract.json');

const verificationMap = JSON.parse(await fs.readFile(verificationMapPath, 'utf8'));

function toLower(str) {
  return String(str).toLowerCase();
}

test('@ga-critical Tier B map covers required features', () => {
  const names = verificationMap.map((entry) => entry.feature);
  Object.keys(requiredFeatures).forEach((feature) => {
    assert.ok(names.includes(feature), `${feature} should be in verification map`);
  });
});

test('@ga-critical evidence files exist and are keyword-scoped', async () => {
  for (const entry of verificationMap) {
    assert.ok(entry.evidence?.length, `${entry.feature} must declare evidence paths`);

    for (const [index, evidencePath] of entry.evidence.entries()) {
      const absolute = path.join(repoRoot, evidencePath);
      const content = await fs.readFile(absolute, 'utf8');
      const keywordFromMap = Array.isArray(entry.keywords)
        ? entry.keywords[index] ?? entry.keywords.at(-1)
        : entry.keyword;
      const keyword = keywordFromMap ?? requiredFeatures[entry.feature]?.keyword ?? path.basename(evidencePath, path.extname(evidencePath));

      assert.ok(
        toLower(content).includes(toLower(keyword)),
        `${entry.feature} evidence ${evidencePath} should mention ${keyword}`
      );
    }
  }
});

test('Agent contract lists ga verification command', async () => {
  const contract = JSON.parse(await fs.readFile(contractPath, 'utf8'));
  assert.ok(contract.verificationRules?.ciCommands?.includes('make ga-verify'));
});
