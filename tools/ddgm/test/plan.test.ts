import fs from 'fs';
import os from 'os';
import path from 'path';
import assert from 'assert/strict';
import { test } from 'node:test';
import { readDatasetDiff, readPlanYaml, writePlanYaml, writeSimulationSnapshot } from '../src/io.js';
import { generateGovernancePlan } from '../src/plan.js';
import { verifyPlanSignature } from '../src/signature.js';

const FIXTURE_DIR = path.resolve('test/fixtures');
const GOLDEN_DIR = path.join(FIXTURE_DIR, 'golden');
const KEY_DIR = path.join(FIXTURE_DIR, 'keys');

test('seeded diff produces deterministic signed governance action plan', () => {
  const diff = readDatasetDiff(path.join(FIXTURE_DIR, 'diff.customer_events.json'));
  const signingKeyPem = fs.readFileSync(path.join(KEY_DIR, 'ddgm_private.pem'), 'utf8');
  const publicKeyPem = fs.readFileSync(path.join(KEY_DIR, 'ddgm_public.pem'), 'utf8');

  const plan = generateGovernancePlan(diff, {
    signingKeyPem,
    publicKeyPem,
    signingKeyId: 'ddgm-fixture-key'
  });

  const planYaml = writePlanYaml(plan);
  const goldenYaml = fs.readFileSync(path.join(GOLDEN_DIR, 'action-plan.yaml'), 'utf8');
  assert.equal(planYaml, goldenYaml);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ddgm-test-'));
  const planPath = path.join(tmpDir, 'plan.yaml');
  fs.writeFileSync(planPath, planYaml, 'utf8');
  const parsedPlan = readPlanYaml(planPath);
  assert.equal(parsedPlan.signature?.keyId, 'ddgm-fixture-key');
  assert.ok(verifyPlanSignature(parsedPlan, publicKeyPem));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('simulator projection matches golden snapshot', () => {
  const diff = readDatasetDiff(path.join(FIXTURE_DIR, 'diff.customer_events.json'));
  const signingKeyPem = fs.readFileSync(path.join(KEY_DIR, 'ddgm_private.pem'), 'utf8');
  const plan = generateGovernancePlan(diff, {
    signingKeyPem,
    signingKeyId: 'ddgm-fixture-key'
  });

  const simulationJson = `${writeSimulationSnapshot(plan.impactForecast)}\n`;
  const goldenSimulation = fs.readFileSync(path.join(GOLDEN_DIR, 'simulation.json'), 'utf8');
  assert.equal(simulationJson, goldenSimulation);
});
