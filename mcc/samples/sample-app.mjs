import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createEnforcementHooks, verifySignature } from '../dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compiledPath = resolve(__dirname, 'sample-card.compiled.json');
const compiledCard = JSON.parse(readFileSync(compiledPath, 'utf8'));

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => [key, canonicalize(val)])
    );
  }
  return value;
}

const canonicalPayload = JSON.stringify(
  canonicalize({
    metadata: compiledCard.metadata,
    description: compiledCard.description,
    metrics: compiledCard.metrics,
    intendedUse: compiledCard.intendedUse,
    dataLineage: compiledCard.dataLineage,
    risk: compiledCard.risk,
    enforcement: compiledCard.enforcement,
  })
);

const hooks = createEnforcementHooks(compiledCard);

const scenarios = [
  { purpose: 'support_triage', description: 'Allowed routing request' },
  { purpose: 'harassment_detection', description: 'Explicitly out-of-scope moderation use' },
  { purpose: 'fraud_detection', description: 'Undeclared purpose' },
];

for (const scenario of scenarios) {
  try {
    hooks.denyIfOutOfScope({ purpose: scenario.purpose });
    console.log(`✅ ${scenario.description}`);
  } catch (error) {
    console.error(`❌ ${scenario.description}: ${(error).message}`);
  }
}

const verified = verifySignature(canonicalPayload, compiledCard.signature);
console.log(verified ? '✅ Signature verified offline.' : '❌ Signature verification failed.');
