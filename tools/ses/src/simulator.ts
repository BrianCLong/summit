import { buildCompatibilityMatrix, assessRisk } from './analyzer.js';
import { generateMigrationScripts, applyMigrationsToFixture } from './migrator.js';
import { buildRolloutPlan } from './rollout.js';
import type {
  SchemaDefinition,
  Telemetry,
  SchemaChange,
  SimulationOutput,
  FixtureDataset,
} from './types.js';

export interface SimulationContext {
  schema: SchemaDefinition;
  telemetry: Telemetry;
  changes: SchemaChange[];
  fixture?: FixtureDataset;
}

export function runSimulation(context: SimulationContext): SimulationOutput {
  const compatibility = buildCompatibilityMatrix(context.schema, context.telemetry, context.changes);
  const migrationBundle = generateMigrationScripts(context.schema, context.changes);
  const fixturePreview = context.fixture
    ? applyMigrationsToFixture(context.fixture, migrationBundle)
    : undefined;
  const risk = assessRisk(compatibility, context.telemetry, context.changes);
  const rollout = buildRolloutPlan(compatibility, risk);

  return {
    compatibility,
    migrationBundle,
    risk,
    rollout,
    fixturePreview,
  };
}
