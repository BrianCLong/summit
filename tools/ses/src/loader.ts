import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  SchemaDefinition,
  Telemetry,
  SchemaChange,
  SimulationConfig,
  FixtureDataset,
} from './types.js';

function loadJson<T>(path: string): T {
  const contents = readFileSync(path, 'utf-8');
  return JSON.parse(contents) as T;
}

export function loadSchema(schemaPath: string): SchemaDefinition {
  return loadJson<SchemaDefinition>(schemaPath);
}

export function loadTelemetry(telemetryPath: string): Telemetry {
  return loadJson<Telemetry>(telemetryPath);
}

export function loadChanges(changesPath: string): SchemaChange[] {
  return loadJson<SchemaChange[]>(changesPath);
}

export function loadFixtureDataset(fixturePath: string | undefined): FixtureDataset | undefined {
  if (!fixturePath) return undefined;
  return loadJson<FixtureDataset>(fixturePath);
}

export function normalizePaths(config: SimulationConfig, baseDir: string): SimulationConfig {
  return {
    ...config,
    schemaPath: resolve(baseDir, config.schemaPath),
    telemetryPath: resolve(baseDir, config.telemetryPath),
    changesPath: resolve(baseDir, config.changesPath),
    fixturePath: config.fixturePath ? resolve(baseDir, config.fixturePath) : undefined,
    outputPath: config.outputPath ? resolve(baseDir, config.outputPath) : undefined,
  };
}
