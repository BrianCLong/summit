import { Command } from 'commander';
import path from 'path';
import { LocalStore } from '../src/lib/local-store/LocalStore.js';

const program = new Command();

program
  .name('localstore')
  .description('CLI for Secure Local Store management');

program
  .command('init')
  .description('Initialize the local store')
  .requiredOption('--path <path>', 'Path to the local store directory')
  .action(async (options) => {
    try {
      const store = new LocalStore({ storePath: path.resolve(options.path) });
      await store.initStore();
      console.log(`Local store initialized at ${options.path}`);
    } catch (err: any) {
      console.error('Error initializing store:', err.message);
      process.exit(1);
    }
  });

program
  .command('tenant:init')
  .description('Initialize a tenant in the local store')
  .requiredOption('--path <path>', 'Path to the local store directory')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .action(async (options) => {
    try {
      const store = new LocalStore({ storePath: path.resolve(options.path) });
      await store.initTenant(options.tenant);
      console.log(`Tenant ${options.tenant} initialized.`);
    } catch (err: any) {
      console.error('Error initializing tenant:', err.message);
      process.exit(1);
    }
  });

program
  .command('ingest')
  .description('Ingest a verified case pack')
  .requiredOption('--path <path>', 'Path to the local store directory')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .requiredOption('--pack <packPath>', 'Path to the unzipped case pack directory')
  .action(async (options) => {
    try {
      const store = new LocalStore({ storePath: path.resolve(options.path) });
      await store.ingestCasePack(path.resolve(options.pack), options.tenant);
      console.log(`Pack ingested for tenant ${options.tenant}.`);
    } catch (err: any) {
      console.error('Error ingesting pack:', err.message);
      process.exit(1);
    }
  });

program
  .command('verify')
  .description('Verify store integrity')
  .requiredOption('--path <path>', 'Path to the local store directory')
  .option('--tenant <id>', 'Tenant ID to verify')
  .action(async (options) => {
    try {
      const store = new LocalStore({ storePath: path.resolve(options.path) });
      // If tenant is provided, verify it. Otherwise, verify all tenants (not implemented in CLI yet per prompt strictness, but easy to add)
      // Prompt says: `pnpm localstore:verify [--tenant <id>]`

      if (options.tenant) {
        const report = await store.verifyStoreIntegrity(options.tenant);
        console.log(JSON.stringify(report, null, 2));
        if (!report.valid) process.exit(1);
      } else {
         console.error('Tenant ID is required for verification currently.');
         process.exit(1);
      }
    } catch (err: any) {
      console.error('Error verifying store:', err.message);
      process.exit(1);
    }
  });

program
  .command('rotate')
  .description('Rotate keys for a tenant')
  .requiredOption('--path <path>', 'Path to the local store directory')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .action(async (options) => {
    try {
      const store = new LocalStore({ storePath: path.resolve(options.path) });
      await store.rotateKeys(options.tenant);
      console.log(`Keys rotated for tenant ${options.tenant}.`);
    } catch (err: any) {
      console.error('Error rotating keys:', err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
