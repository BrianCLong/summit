/**
 * Switchboard Commands
 */

import { Command } from 'commander';
import { detectRepoRoot } from '../lib/sandbox.js';
import { runCapsule } from '../lib/switchboard-runner.js';
import {
  generateEvidenceBundle,
  exportEvidenceBundle,
  verifyEvidenceBundle,
} from '../lib/switchboard-evidence.js';
import { replayCapsule } from '../lib/switchboard-replay.js';
import { secretsVault } from '../lib/switchboard-secrets.js';
import { SwitchboardRegistry } from '../lib/switchboard-registry.js';
import { runDoctor } from '../summit-doctor.js';
import { VERSION } from '../lib/constants.js';
import chalk from 'chalk';
import os from 'os';

export function registerSwitchboardCommands(program: Command): void {
  const switchboard = program
    .command('switchboard')
    .description('Switchboard capsule operations');

  switchboard
    .command('run')
    .description('Run a task capsule')
    .requiredOption('--capsule <path>', 'Path to capsule manifest')
    .option('--waiver <token>', 'Apply a waiver token if policy denies an action')
    .action(async (options: { capsule: string; waiver?: string }) => {
      try {
        const repoRoot = detectRepoRoot(process.cwd());
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

  const evidence = switchboard
    .command('evidence')
    .description('Manage evidence bundles');

  evidence
    .command('generate <session_id>')
    .description('Generate an evidence bundle for a capsule session')
    .action((sessionId: string) => {
      try {
        const repoRoot = detectRepoRoot(process.cwd());
        const result = generateEvidenceBundle(repoRoot, sessionId);
        console.log(`Evidence bundle: ${result.evidenceDir}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  evidence
    .command('export <session_id> <output_path>')
    .description('Export evidence bundle to a folder')
    .action((sessionId: string, outputPath: string) => {
      try {
        const repoRoot = detectRepoRoot(process.cwd());
        const result = exportEvidenceBundle(repoRoot, sessionId, outputPath);
        console.log(`Evidence exported to: ${result}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  evidence
    .command('verify <bundle_path>')
    .description('Verify integrity of an exported evidence bundle')
    .action((bundlePath: string) => {
      try {
        const result = verifyEvidenceBundle(bundlePath);
        if (result.valid) {
          console.log(chalk.green('Bundle integrity verified successfully.'));
        } else {
          console.error(chalk.red('Bundle verification failed:'));
          result.errors.forEach((err) => console.error(` - ${err}`));
          process.exit(1);
        }
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
        const repoRoot = detectRepoRoot(process.cwd());
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

  const secrets = switchboard
    .command('secrets')
    .description('Manage local secrets vault');

  secrets
    .command('set <key> [value]')
    .description('Set a secret value')
    .action((key: string, value?: string) => {
      if (!value) {
        console.error('Value is required for set');
        process.exit(1);
      }
      secretsVault.setSecret(key, value);
      console.log(`Secret '${key}' set.`);
    });

  secrets
    .command('list')
    .description('List secret keys')
    .action(() => {
      const keys = secretsVault.listSecrets();
      console.log('Secrets:');
      keys.forEach((k) => console.log(` - ${k}`));
    });

  secrets
    .command('delete <key>')
    .description('Delete a secret')
    .action((key: string) => {
      secretsVault.deleteSecret(key);
      console.log(`Secret '${key}' deleted.`);
    });

  const registry = switchboard
    .command('registry')
    .description('Manage tool/server registry');

  registry
    .command('validate <path>')
    .description('Validate a registry file or directory')
    .action(async (targetPath: string) => {
      const reg = new SwitchboardRegistry();
      const result = await reg.load(targetPath);
      console.log(`Loaded ${result.loaded} entries.`);
      if (result.errors.length > 0) {
        console.error(chalk.red('Validation errors:'));
        result.errors.forEach((err) => console.error(` - ${err}`));
        process.exit(1);
      }
      console.log(chalk.green('Registry validated successfully.'));
    });

  switchboard
    .command('version')
    .description('Display Switchboard version')
    .action(() => {
      console.log(`Switchboard v${VERSION}`);
    });

  switchboard
    .command('doctor')
    .description('Verify local Switchboard environment')
    .action(async () => {
      console.log(chalk.bold('\n🩺 Switchboard Doctor'));
      const report = await runDoctor();
      report.results.forEach((res) => {
        const icon = res.status === 'pass' ? '✅' : '❌';
        console.log(`${icon} ${res.name}: ${res.message}`);
      });
    });

  switchboard
    .command('completion')
    .description('Generate shell completion script')
    .option('--shell <type>', 'Shell type (bash, zsh)', 'bash')
    .action((options: { shell: string }) => {
      if (options.shell === 'bash') {
        console.log('complete -W "run evidence replay secrets registry version doctor completion" switchboard');
      } else if (options.shell === 'zsh') {
        console.log('compdef _switchboard switchboard\n_switchboard() {\n  _arguments "1: :(run evidence replay secrets registry version doctor completion)"\n}');
      } else {
        console.error(`Unsupported shell: ${options.shell}`);
        process.exit(1);
      }
    });
}
