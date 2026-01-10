#!/usr/bin/env ts-node --esm
import path from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { canonicalizeReceiptPayload } from '../packages/provenance/src/index.js';
import { serializePolicyDecision } from '../services/policy-engine/src/index.js';
import {
  buildSamplePolicyDecision,
  buildSampleReceipt,
} from '../test/fixtures/golden/samples.js';

const fixtureDir = path.resolve(new URL('.', import.meta.url).pathname, '../test/fixtures/golden');

mkdirSync(fixtureDir, { recursive: true });

const receipt = buildSampleReceipt();
const canonicalReceipt = canonicalizeReceiptPayload(receipt);
writeFileSync(path.join(fixtureDir, 'receipt_v0_1.json'), `${canonicalReceipt}\n`);

const policyDecision = buildSamplePolicyDecision();
const serializedDecision = serializePolicyDecision(policyDecision);
writeFileSync(
  path.join(fixtureDir, 'policy_decision_v0_1.json'),
  `${serializedDecision}\n`,
);

console.log(`Updated golden fixtures in ${fixtureDir}`);
