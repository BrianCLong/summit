#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import chalk from 'chalk';
import { normalizePaths, loadSchema, loadTelemetry, loadChanges, loadFixtureDataset } from './loader.js';
import type { SimulationConfig } from './types.js';
import { runSimulation } from './simulator.js';

function printUsage(): void {
  console.log(`Schema Evolution Simulator (SES)\nUsage: ses <config.json>`);
}

function readConfig(path: string): SimulationConfig {
  try {
    const raw = loadConfigFile(path);
    return normalizePaths(raw, dirname(path));
  } catch (error) {
    throw new Error(`Failed to read configuration ${path}: ${(error as Error).message}`);
  }
}

function loadConfigFile(path: string): SimulationConfig {
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as SimulationConfig;
}

function ensureOutputPath(path: string): void {
  const folder = dirname(path);
  if (!existsSync(folder)) {
    mkdirSync(folder, { recursive: true });
  }
}

function run(): void {
  const [, , configPath] = process.argv;
  if (!configPath) {
    printUsage();
    process.exit(1);
  }

  const absoluteConfig = resolve(process.cwd(), configPath);
  const config = readConfig(absoluteConfig);

  const schema = loadSchema(config.schemaPath);
  const telemetry = loadTelemetry(config.telemetryPath);
  const changes = loadChanges(config.changesPath);
  const fixture = loadFixtureDataset(config.fixturePath);

  const result = runSimulation({ schema, telemetry, changes, fixture });

  if (config.outputPath) {
    ensureOutputPath(config.outputPath);
    writeFileSync(config.outputPath, JSON.stringify(result, null, 2));
    console.log(chalk.green(`Simulation results written to ${config.outputPath}`));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

run();
