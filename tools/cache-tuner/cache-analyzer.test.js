import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { applyPlan, buildOptimizationPlan, collectFacts, detectPnpmCache, detectTypeScriptCache } from './cache-analyzer.js';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-tuner-'));

describe('cache analyzer', () => {
  let workspaceRoot;

  beforeEach(() => {
    workspaceRoot = fs.mkdtempSync(path.join(tmpRoot, 'workspace-'));
  });

  afterEach(() => {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('flags stale pnpm stores and emits prune commands', () => {
    const pnpmStore = path.join(workspaceRoot, '.pnpm-store');
    fs.mkdirSync(pnpmStore, { recursive: true });
    const staleFile = path.join(pnpmStore, 'stale.json');
    fs.writeFileSync(staleFile, '{}');
    const weekAndDayAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    fs.utimesSync(staleFile, weekAndDayAgo / 1000, weekAndDayAgo / 1000);

    const pnpmFacts = detectPnpmCache({ workspaceRoot, storeOverride: pnpmStore });
    const plan = buildOptimizationPlan([pnpmFacts]);

    assert.ok(plan.optimizations.some((opt) => opt.id === 'pnpm-store-prune'));
    assert.ok(plan.findings.some((finding) => finding.includes('pruning')));
  });

  it('recommends a workspace-local pnpm store and bootstraps it when missing', () => {
    const pnpmFacts = detectPnpmCache({ workspaceRoot });
    const plan = buildOptimizationPlan([pnpmFacts]);

    assert.ok(plan.optimizations.some((opt) => opt.id === 'pnpm-store-relocation'));
    assert.ok(plan.optimizations.some((opt) => opt.id === 'pnpm-store-bootstrap'));

    const result = applyPlan(plan, { workspaceRoot, executeCommands: false });
    const recommended = path.join(workspaceRoot, '.cache');

    assert.ok(result.ensuredDirectories.some((dir) => dir.startsWith(recommended)));
  });

  it('creates env export file when optimizations require env changes', () => {
    const pnpmFacts = detectPnpmCache({ workspaceRoot, storeOverride: '/tmp/pnpm-volatile-store' });
    const plan = buildOptimizationPlan([pnpmFacts]);
    const result = applyPlan(plan, { workspaceRoot, executeCommands: false });

    assert.ok(result.envFilePath.endsWith('cache-tuner.env'));
    const envContent = fs.readFileSync(result.envFilePath, 'utf8');
    assert.ok(envContent.includes('PNPM_STORE_DIR'));
  });

  it('collects TypeScript caches and schedules cleanup for stale files', () => {
    const tsCacheDir = path.join(workspaceRoot, '.cache', 'tsbuildinfo');
    fs.mkdirSync(tsCacheDir, { recursive: true });
    const staleInfo = path.join(tsCacheDir, 'tsconfig.tsbuildinfo');
    fs.writeFileSync(staleInfo, 'state');
    const old = Date.now() - 9 * 24 * 60 * 60 * 1000;
    fs.utimesSync(staleInfo, old / 1000, old / 1000);

    const tsFacts = detectTypeScriptCache({ workspaceRoot });
    const plan = buildOptimizationPlan([tsFacts]);

    assert.ok(plan.optimizations.some((opt) => opt.id === 'tscache-clean'));
  });

  it('collects facts without throwing in empty workspace', () => {
    const facts = collectFacts(workspaceRoot);
    assert.ok(facts.length > 0);
  });
});
