/**
 * Switchboard Commands
 */

import { Command } from 'commander';
import { detectRepoRoot } from '../lib/sandbox.js';
import { runCapsule } from '../lib/switchboard-runner.js';
import { generateEvidenceBundle } from '../lib/switchboard-evidence.js';
import { replayCapsule } from '../lib/switchboard-replay.js';
import type { CLIConfig } from '../lib/config.js';
import { saveConfig } from '../lib/config.js';
import { success, error, info } from '../utils/output.js';
import { ValidationError } from '../utils/errors.js';

export function registerSwitchboardCommands(program: Command, config: CLIConfig): void {
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

  switchboard
    .command('evidence <session_id>')
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

  const profile = switchboard
    .command('profile')
    .description('Manage switchboard profiles');

  profile
    .command('list')
    .description('List available profiles')
    .action(() => {
      const profiles = Object.keys(config.profiles);
      console.log('\nAvailable Profiles:');
      for (const name of profiles) {
        const isDefault = name === config.defaultProfile;
        console.log(`  ${isDefault ? '* ' : '  '}${name}`);
      }
    });

  profile
    .command('create <name>')
    .description('Create a new switchboard profile')
    .option('--tenant-id <id>', 'Tenant ID')
    .option('--registry <path>', 'Registry path')
    .option('--policy <path>', 'Policy path')
    .option('--secrets-ns <ns>', 'Secrets namespace')
    .action((name: string, options) => {
      if (config.profiles[name]) {
        error(`Profile ${name} already exists`);
        return;
      }
      config.profiles[name] = {
        switchboard: {
          tenantId: options.tenantId || 'default',
          registryPath: options.registry || '.switchboard/registry',
          policyPath: options.policy || 'policies',
          secretsNamespace: options.secretsNs || 'default',
        }
      };
      saveConfig(config);
      success(`Profile ${name} created`);
    });

  profile
    .command('use <name>')
    .description('Set the active switchboard profile')
    .action((name: string) => {
      if (!config.profiles[name]) {
        error(`Profile ${name} not found`);
        info('Use "switchboard profile list" to see available profiles');
        return;
      }
      config.defaultProfile = name;
      saveConfig(config);
      success(`Active profile set to ${name}`);
    });

  profile
    .command('delete <name>')
    .description('Delete a switchboard profile')
    .action((name: string) => {
      if (!config.profiles[name]) {
        error(`Profile ${name} not found`);
        return;
      }
      if (name === config.defaultProfile) {
        error('Cannot delete the active profile');
        return;
      }
      delete config.profiles[name];
      saveConfig(config);
      success(`Profile ${name} deleted`);
    });
}
