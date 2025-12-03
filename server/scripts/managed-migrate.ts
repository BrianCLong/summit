#!/usr/bin/env node --loader ts-node/esm
import { MigrationManager } from '../src/db/migrations/versioning.js';

interface CliOptions {
  to?: string;
  steps?: number;
  dryRun?: boolean;
  seed?: boolean;
  forceSeed?: boolean;
  backup?: boolean;
  backupPath?: string;
  restorePath?: string;
}

function parseArgs(argv: string[]): { command: string; options: CliOptions } {
  const [command = 'up', ...rest] = argv;
  const options: CliOptions = { backup: true };

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    switch (arg) {
      case '--to':
        options.to = rest[i + 1];
        i += 1;
        break;
      case '--steps':
        options.steps = Number(rest[i + 1]);
        i += 1;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--seed':
        options.seed = true;
        break;
      case '--force-seed':
        options.seed = true;
        options.forceSeed = true;
        break;
      case '--no-backup':
        options.backup = false;
        break;
      case '--backup-path':
        options.backupPath = rest[i + 1];
        i += 1;
        break;
      case '--restore':
        options.restorePath = rest[i + 1];
        i += 1;
        break;
      default:
        break;
    }
  }

  return { command, options };
}

function printUsage() {
  console.log(`Usage: managed-migrate <command> [options]\n
Commands:
  up [--to <name>] [--dry-run] [--seed] [--no-backup] [--backup-path <file>]
  down|rollback [--steps <n>]
  seed [--force-seed]
  status
  test
  backup [--backup-path <file>]
  restore --restore <file>
`);
}

async function run() {
  const { command, options } = parseArgs(process.argv.slice(2));
  const manager = new MigrationManager();

  try {
    switch (command) {
      case 'up': {
        if (options.backup !== false) {
          await manager.backup(options.backupPath);
        }
        await manager.migrate({ dryRun: options.dryRun, to: options.to });
        if (options.seed) {
          await manager.seed({ force: options.forceSeed });
        }
        break;
      }
      case 'down':
      case 'rollback': {
        await manager.rollback({ steps: options.steps });
        break;
      }
      case 'seed': {
        await manager.seed({ force: options.forceSeed });
        break;
      }
      case 'status': {
        const status = await manager.status();
        console.log(JSON.stringify(status, null, 2));
        break;
      }
      case 'test': {
        const result = await manager.testMigrations();
        console.log(`Validated ${result.migrationsTested} migrations in dry run`);
        break;
      }
      case 'backup': {
        const destination = await manager.backup(options.backupPath);
        console.log(`Backup written to ${destination}`);
        break;
      }
      case 'restore': {
        if (!options.restorePath) {
          throw new Error('Provide --restore <path> to restore from a backup');
        }
        await manager.restore(options.restorePath);
        break;
      }
      default:
        printUsage();
        break;
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

run();
