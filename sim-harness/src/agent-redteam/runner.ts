#!/usr/bin/env node
import { RedteamHarness } from './RedteamHarness.js';
import { ConfigLoader } from '../utils/ConfigLoader.js';
import { Logger } from '../utils/Logger.js';

interface RunnerOptions {
  scenario: string;
  output?: string;
  list?: boolean;
}

function parseArgs(): RunnerOptions {
  const args = process.argv.slice(2);
  const options: Partial<RunnerOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--scenario' || arg === '-s') {
      options.scenario = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--list') {
      options.list = true;
    }
  }

  return {
    scenario: options.scenario || 'exfiltration',
    output: options.output,
    list: options.list,
  };
}

function showAvailableScenarios(harness: RedteamHarness): void {
  const registry = harness.listRegisteredScenarios();
  console.log('Available redteam scenarios:');
  registry.forEach((scenario) => {
    console.log(
      `- ${scenario.id} (task: ${scenario.task_id}, prompt: ${scenario.prompt_ref.sha256.slice(0, 8)}…)`
    );
  });
}

async function main(): Promise<void> {
  const options = parseArgs();
  const logger = new Logger('redteam-runner');
  const harness = new RedteamHarness({
    artifactRoot: options.output,
    config: ConfigLoader.getDefaults(),
  });

  if (options.list) {
    showAvailableScenarios(harness);
    return;
  }

  const record = harness.runScenario(options.scenario, { emitArtifact: true });

  logger.info(`Scenario: ${record.scenario.name}`);
  logger.info(`Task ID: ${record.registry.task_id}`);
  logger.info(`Prompt hash: ${record.registry.prompt_ref.sha256}`);
  logger.info(`Artifact: ${record.artifact_path}`);
  logger.info(`Transcript entries: ${record.transcript.length}`);
  logger.info(`Decisions: ${record.decisions.length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
