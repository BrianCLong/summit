import { Command } from 'commander';
import { Executor } from '../lib/executor.js';

/**
 * Register 'summit db' commands
 */
export function registerDbCommands(program, config, output) {
  const db = new Command('db')
    .description('Database operations')
    .summary('Manage database migrations, seeding, and backups');

  // summit db migrate
  db
    .command('migrate')
    .description('Run database migrations')
    .option('--target <target>', 'Migration target (all, postgres, neo4j)', 'all')
    .option('--dry-run', 'Show migrations without applying')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('db migrate', options);
        out.info(`Running ${options.target} database migrations...`);

        if (options.dryRun) {
          out.warning('Dry run mode - no changes will be applied');
        }

        const migrations = [];

        // Postgres migrations (Prisma + Knex)
        if (options.target === 'all' || options.target === 'postgres') {
          migrations.push({
            name: 'Postgres (Prisma)',
            script: 'db:pg:migrate',
          });
        }

        // Neo4j migrations
        if (options.target === 'all' || options.target === 'neo4j') {
          migrations.push({
            name: 'Neo4j',
            script: 'db:neo4j:migrate',
          });
        }

        // API migrations
        if (options.target === 'all') {
          migrations.push({
            name: 'API migrations',
            script: 'db:api:migrate',
          });
        }

        for (const migration of migrations) {
          out.spin(`Running ${migration.name}...`);
          try {
            const args = options.dryRun ? ['--dry-run'] : [];
            await exec.execNpm(migration.script, args);
            out.spinSucceed(`${migration.name} completed`);
          } catch (error) {
            out.spinFail(`${migration.name} failed`);
            throw error;
          }
        }

        out.success('All migrations completed successfully');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Migration failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit db rollback
  db
    .command('rollback')
    .description('Rollback database migrations')
    .option('--steps <n>', 'Number of migrations to rollback', '1')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('db rollback', options);
        out.warning(`Rolling back ${options.steps} migration(s)...`);

        out.spin('Rolling back migrations...');
        await exec.execNpm('db:knex:rollback', ['--', `--step=${options.steps}`]);
        out.spinSucceed('Rollback completed');

        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Rollback failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit db seed
  db
    .command('seed')
    .description('Seed database with data')
    .option('--demo', 'Seed with demo data')
    .option('--cet', 'Seed with CET demo data')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('db seed', options);
        out.spin('Seeding database...');

        let script = 'db:seed';
        if (options.demo) {
          script = 'seed:demo';
        } else if (options.cet) {
          script = 'seed:demo:cet';
        }

        await exec.execNpm(script);

        out.spinSucceed('Database seeded successfully');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Seeding failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit db reset
  db
    .command('reset')
    .description('Reset database (drop, create, migrate, seed)')
    .option('--no-seed', 'Skip seeding after reset')
    .option('--force', 'Skip confirmation prompt')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('db reset', options);

        if (!options.force) {
          out.warning('This will DELETE ALL DATA in the database!');
          // In non-interactive mode, fail without --force
          if (out.format !== 'human') {
            throw new Error('Database reset requires --force flag in non-interactive mode');
          }
          out.info('Use --force to skip this warning');
          return;
        }

        out.spin('Resetting database...');
        await exec.execNpm('db:reset', [options.seed === false ? '--no-seed' : '']);
        out.spinSucceed('Database reset completed');

        out.success('Database has been reset');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Database reset failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit db status
  db
    .command('status')
    .description('Show database migration status')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('db status');
        out.info('Checking migration status...');

        // Check Prisma migrations
        out.spin('Checking Postgres migrations...');
        const pgResult = await exec.execNpm('db:pg:status', [], {
          stdio: 'pipe',
          ignoreExitCode: true,
        });
        out.spinSucceed('Postgres migration status retrieved');

        if (out.format === 'human' && pgResult.stdout) {
          console.log(pgResult.stdout);
        }

        out.endCommand(true, {
          postgres: { stdout: pgResult.stdout, applied: true },
        });
      } catch (error) {
        out.spinStop();
        out.error('Failed to get migration status', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit db backup
  db
    .command('backup')
    .description('Create database backup')
    .option('--s3', 'Upload backup to S3')
    .option('--encrypt', 'Encrypt backup')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('db backup', options);
        out.spin('Creating database backup...');

        const args = [];
        if (options.s3) {
          args.push('--s3');
        }
        if (options.encrypt) {
          args.push('--encrypt');
        }

        await exec.execScript('scripts/backup.sh', args);

        out.spinSucceed('Backup created successfully');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Backup failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit db restore
  db
    .command('restore')
    .description('Restore database from backup')
    .argument('<backup-file>', 'Backup file to restore from')
    .option('--force', 'Skip confirmation prompt')
    .action(async (backupFile, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('db restore', { backupFile, ...options });

        if (!options.force) {
          out.warning('This will REPLACE ALL DATA in the database!');
          if (out.format !== 'human') {
            throw new Error('Database restore requires --force flag in non-interactive mode');
          }
          return;
        }

        out.spin('Restoring database...');
        await exec.execScript('scripts/restore.sh', [backupFile]);
        out.spinSucceed('Database restored');

        out.success('Database has been restored from backup');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Restore failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  program.addCommand(db);
}
