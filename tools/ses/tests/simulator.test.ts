import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadSchema, loadTelemetry, loadChanges, loadFixtureDataset, normalizePaths } from '../src/loader.js';
import { runSimulation } from '../src/simulator.js';
import type { SimulationConfig } from '../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadConfig(): SimulationConfig {
  const baseDir = resolve(__dirname, '../fixtures');
  const raw = JSON.parse(readFileSync(resolve(baseDir, 'config.json'), 'utf-8')) as SimulationConfig;
  return normalizePaths(raw, baseDir);
}

describe('Schema Evolution Simulator', () => {
  const config = loadConfig();
  const schema = loadSchema(config.schemaPath);
  const telemetry = loadTelemetry(config.telemetryPath);
  const changes = loadChanges(config.changesPath);
  const fixture = loadFixtureDataset(config.fixturePath);

  const output = runSimulation({ schema, telemetry, changes, fixture });

  it('flags seeded breaking changes in compatibility matrix', () => {
    const billingImpact = output.compatibility.impacts.find(
      (impact) => impact.consumer === 'billing-service' && impact.table === 'customers',
    );
    expect(billingImpact).toBeDefined();
    expect(billingImpact?.status).toBe('breaking');
    expect(billingImpact?.reasons.some((reason) => reason.includes('split'))).toBe(true);
  });

  it('generates migrations with SQL and code stubs for each change', () => {
    expect(output.migrationBundle.migrations).toHaveLength(3);
    const rename = output.migrationBundle.migrations.find((migration) => migration.changeType === 'rename');
    expect(rename?.sql).toContain('RENAME COLUMN email TO primary_email');
    const split = output.migrationBundle.migrations.find((migration) => migration.changeType === 'split');
    expect(split?.sql).toContain('ADD COLUMN first_name');
    const widen = output.migrationBundle.migrations.find((migration) => migration.changeType === 'widen');
    expect(widen?.sql).toContain('ALTER COLUMN total_amount TYPE FLOAT');
  });

  it('applies generated migrations to fixture data without throwing and returns preview', () => {
    expect(output.fixturePreview).toBeDefined();
    const customers = output.fixturePreview?.tables.customers ?? [];
    expect(customers[0]).toHaveProperty('primary_email', 'ada@example.com');
    expect(customers[0]).not.toHaveProperty('email');
    expect(customers[0]).toHaveProperty('first_name', 'Ada');
    expect(customers[0]).toHaveProperty('last_name', 'Lovelace');
  });

  it('produces deterministic risk assessment and rollout gating', () => {
    expect(output.risk.score).toBeCloseTo(13.14, 2);
    expect(output.risk.severity).toBe('medium');
    const cutoverPhase = output.rollout.phases.find((phase) => phase.name === 'Cutover');
    expect(cutoverPhase?.gate).toBe('pass');
    expect(cutoverPhase?.riskScore).toBeCloseTo(13.14, 2);
  });
});
