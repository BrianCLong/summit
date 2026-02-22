/**
 * Switchboard Commands
 */

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { detectRepoRoot } from '../lib/sandbox.js';
import { runCapsule } from '../lib/switchboard-runner.js';
import { generateEvidenceBundle } from '../lib/switchboard-evidence.js';
import { replayCapsule } from '../lib/switchboard-replay.js';
import { runSwitchboardDemo } from '../lib/switchboard-demo.js';
import {
  getSwitchboardRegistryStats,
  loadSwitchboardRegistry,
} from '../lib/switchboard-registry.js';

function detectSwitchboardRepoRoot(startDir: string): string {
  let currentDir = path.resolve(startDir);
  while (currentDir !== path.dirname(currentDir)) {
    if (
      fs.existsSync(path.join(currentDir, '.git')) ||
      fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))
    ) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return detectRepoRoot(startDir);
}

export function registerSwitchboardCommands(program: Command): void {
  const switchboard = program
    .command('switchboard')
    .description('Switchboard capsule operations');

  const registry = switchboard
    .command('registry')
    .description('Registry inspection utilities');

  registry
    .command('validate')
    .description('Validate a switchboard registry file')
    .requiredOption('--registry <path>', 'Path to registry JSON')
    .action((options: { registry: string }) => {
      try {
        const repoRoot = detectSwitchboardRepoRoot(process.cwd());
        const registryPath = path.isAbsolute(options.registry)
          ? options.registry
          : path.resolve(repoRoot, options.registry);
        const registryData = loadSwitchboardRegistry(registryPath);
        const stats = getSwitchboardRegistryStats(registryData);
        console.log(
          `REGISTRY PASS (servers=${stats.servers}, tools=${stats.tools}, capabilities=${stats.capabilities})`
        );
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  switchboard
    .command('demo')
    .description('Run the local switchboard demo')
    .action(() => {
      try {
        const repoRoot = detectSwitchboardRepoRoot(process.cwd());
        runSwitchboardDemo(repoRoot);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  switchboard
    .command('run')
    .description('Run a task capsule')
    .requiredOption('--capsule <path>', 'Path to capsule manifest')
    .option('--waiver <token>', 'Apply a waiver token if policy denies an action')
    .action(async (options: { capsule: string; waiver?: string }) => {
      try {
        const repoRoot = detectSwitchboardRepoRoot(process.cwd());
        const result = await runCapsule({
          manifestPath: options.capsule,
          repoRoot,
          waiverToken: options.waiver,
        });
        console.log(`Capsule session: ${result.sessionId}`);
        console.log(`Ledger: ${result.ledgerPath}`);
        console.log(`Diff: ${result.diffPath}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  switchboard
    .command('evidence <session_id>')
    .description('Generate an evidence bundle for a capsule session')
    .action((sessionId: string) => {
      try {
        const repoRoot = detectSwitchboardRepoRoot(process.cwd());
        const result = generateEvidenceBundle(repoRoot, sessionId);
        console.log(`Evidence bundle: ${result.evidenceDir}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  switchboard
    .command('replay <session_id>')
    .description('Replay a capsule session and compare outputs')
    .action(async (sessionId: string) => {
      try {
        const repoRoot = detectSwitchboardRepoRoot(process.cwd());
        const report = await replayCapsule(repoRoot, sessionId);
        console.log(`Replay session: ${report.replay_session}`);
        console.log(`Replay match: ${report.match ? 'yes' : 'no'}`);
        if (!report.match) {
          console.log(`Differences: ${report.differences.join('; ')}`);
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
