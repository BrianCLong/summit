/**
 * Tenant management commands for Admin CLI
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import type {
  GlobalOptions,
  Tenant,
  TenantCreateOptions,
} from '../types/index.js';
import {
  output,
  outputTable,
  outputKeyValue,
  printHeader,
  printError,
  printSuccess,
  printWarning,
  printDryRunBanner,
  getOutputFormat,
} from '../utils/output.js';
import { createApiClient } from '../utils/api-client.js';
import { getEndpoint, getToken } from '../utils/config.js';
import {
  confirmWithPhrase,
  CONFIRMATION_PHRASES,
  abort,
  isInteractive,
  requireInteractive,
} from '../utils/confirm.js';
import { logger } from '../utils/logger.js';

/**
 * Register tenant commands
 */
export function registerTenantCommands(program: Command): void {
  const tenantCmd = new Command('tenant')
    .description('Tenant management commands');

  // List tenants
  tenantCmd
    .command('list')
    .description('List all tenants')
    .option('--status <status>', 'Filter by status (active, suspended, pending)')
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await listTenants(options.status, globalOpts);
    });

  // Get tenant details
  tenantCmd
    .command('get <tenantId>')
    .description('Get tenant details')
    .action(async (tenantId, options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await getTenant(tenantId, globalOpts);
    });

  // Create tenant
  tenantCmd
    .command('create')
    .description('Create a new tenant')
    .option('-n, --name <name>', 'Tenant name')
    .option('-e, --admin-email <email>', 'Admin email address')
    .option('-p, --plan <plan>', 'Subscription plan', 'standard')
    .option('--max-users <number>', 'Maximum users quota', '100')
    .option('--max-entities <number>', 'Maximum entities quota', '1000000')
    .option('--interactive', 'Use interactive prompts')
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await createTenant(options, globalOpts);
    });

  // Suspend tenant
  tenantCmd
    .command('suspend <tenantId>')
    .description('Suspend a tenant (requires confirmation)')
    .option('-r, --reason <reason>', 'Suspension reason')
    .option('--force', 'Skip confirmation (dangerous)')
    .action(async (tenantId, options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await suspendTenant(tenantId, options, globalOpts);
    });

  // Reactivate tenant
  tenantCmd
    .command('reactivate <tenantId>')
    .description('Reactivate a suspended tenant')
    .action(async (tenantId, _options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await reactivateTenant(tenantId, globalOpts);
    });

  // Export tenant metadata
  tenantCmd
    .command('export-metadata <tenantId>')
    .description('Export tenant metadata and configuration')
    .option('-o, --output <file>', 'Output file path')
    .option('--include-users', 'Include user list')
    .option('--include-quotas', 'Include quota usage')
    .action(async (tenantId, options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await exportTenantMetadata(tenantId, options, globalOpts);
    });

  // Update tenant quotas
  tenantCmd
    .command('update-quotas <tenantId>')
    .description('Update tenant quotas')
    .option('--max-users <number>', 'Maximum users quota')
    .option('--max-entities <number>', 'Maximum entities quota')
    .option('--max-storage <bytes>', 'Maximum storage quota')
    .option('--api-rate-limit <number>', 'API rate limit (req/min)')
    .action(async (tenantId, options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await updateTenantQuotas(tenantId, options, globalOpts);
    });

  program.addCommand(tenantCmd);
}

/**
 * List all tenants
 */
async function listTenants(status: string | undefined, options: GlobalOptions): Promise<void> {
  const spinner = ora('Fetching tenants...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(options.profile, options.endpoint),
    token: getToken(options.profile, options.token),
  });

  try {
    const response = await apiClient.get<{ items: Tenant[] }>('/admin/tenants');

    spinner.stop();

    if (!response.success) {
      printError(`Failed to fetch tenants: ${response.error?.message}`);
      process.exit(1);
    }

    let tenants = response.data?.items ?? getDefaultTenants();

    if (status) {
      tenants = tenants.filter((t) => t.status === status);
    }

    if (getOutputFormat() === 'json') {
      output(tenants);
      return;
    }

    printHeader('Tenants');

    const tenantRows = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      status: formatTenantStatus(t.status),
      createdAt: new Date(t.createdAt).toLocaleDateString(),
    }));

    outputTable(tenantRows);
  } catch (err) {
    spinner.fail('Failed to fetch tenants');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * Get tenant details
 */
async function getTenant(tenantId: string, options: GlobalOptions): Promise<void> {
  const spinner = ora('Fetching tenant...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(options.profile, options.endpoint),
    token: getToken(options.profile, options.token),
  });

  try {
    const response = await apiClient.get<Tenant>(`/admin/tenants/${tenantId}`);

    spinner.stop();

    if (!response.success) {
      printError(`Failed to fetch tenant: ${response.error?.message}`);
      process.exit(1);
    }

    const tenant = response.data ?? getDefaultTenants()[0];

    if (getOutputFormat() === 'json') {
      output(tenant);
      return;
    }

    printHeader(`Tenant: ${tenant.name}`);
    outputKeyValue({
      id: tenant.id,
      name: tenant.name,
      status: formatTenantStatus(tenant.status),
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      quotas: tenant.quotas ?? {},
      metadata: tenant.metadata ?? {},
    });
  } catch (err) {
    spinner.fail('Failed to fetch tenant');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * Create a new tenant
 */
async function createTenant(
  options: {
    name?: string;
    adminEmail?: string;
    plan?: string;
    maxUsers?: string;
    maxEntities?: string;
    interactive?: boolean;
  },
  globalOpts: GlobalOptions
): Promise<void> {
  let createOptions: TenantCreateOptions;

  if (options.interactive || (!options.name || !options.adminEmail)) {
    if (!isInteractive()) {
      printError('Interactive mode required. Provide --name and --admin-email options.');
      process.exit(1);
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Tenant name:',
        when: !options.name,
        validate: (input: string) => input.length > 0 || 'Name is required',
      },
      {
        type: 'input',
        name: 'adminEmail',
        message: 'Admin email:',
        when: !options.adminEmail,
        validate: (input: string) =>
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) || 'Valid email required',
      },
      {
        type: 'list',
        name: 'plan',
        message: 'Subscription plan:',
        choices: ['starter', 'standard', 'enterprise'],
        default: 'standard',
        when: !options.plan,
      },
    ]);

    createOptions = {
      name: options.name ?? answers.name,
      adminEmail: options.adminEmail ?? answers.adminEmail,
      plan: options.plan ?? answers.plan,
      quotas: {
        maxUsers: parseInt(options.maxUsers ?? '100', 10),
        maxEntities: parseInt(options.maxEntities ?? '1000000', 10),
        maxStorage: 10 * 1024 * 1024 * 1024, // 10GB default
        apiRateLimit: 1000,
      },
    };
  } else {
    createOptions = {
      name: options.name!,
      adminEmail: options.adminEmail!,
      plan: options.plan ?? 'standard',
      quotas: {
        maxUsers: parseInt(options.maxUsers ?? '100', 10),
        maxEntities: parseInt(options.maxEntities ?? '1000000', 10),
        maxStorage: 10 * 1024 * 1024 * 1024,
        apiRateLimit: 1000,
      },
    };
  }

  if (globalOpts.dryRun) {
    printDryRunBanner();
    console.log(chalk.bold('Would create tenant:'));
    outputKeyValue(createOptions as unknown as Record<string, unknown>);
    return;
  }

  const spinner = ora('Creating tenant...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const response = await apiClient.post<Tenant>('/admin/tenants', createOptions);

    spinner.stop();

    if (!response.success) {
      printError(`Failed to create tenant: ${response.error?.message}`);
      process.exit(1);
    }

    const tenant = response.data;

    if (getOutputFormat() === 'json') {
      output(tenant);
      return;
    }

    printSuccess(`Tenant created successfully!`);
    console.log();
    console.log(chalk.bold('Tenant ID:'), tenant?.id ?? 'new-tenant-id');
    console.log(chalk.gray('An invitation email has been sent to the admin.'));
  } catch (err) {
    spinner.fail('Failed to create tenant');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * Suspend a tenant
 */
async function suspendTenant(
  tenantId: string,
  options: { reason?: string; force?: boolean },
  globalOpts: GlobalOptions
): Promise<void> {
  if (!options.force) {
    requireInteractive('Tenant suspension');

    const confirmed = await confirmWithPhrase({
      message: `You are about to suspend tenant "${tenantId}". This will disable all access for users in this tenant.`,
      requireTypedConfirmation: true,
      typedConfirmationPhrase: CONFIRMATION_PHRASES.SUSPEND,
    });

    if (!confirmed) {
      abort();
    }
  }

  if (globalOpts.dryRun) {
    printDryRunBanner();
    console.log(chalk.bold('Would suspend tenant:'), tenantId);
    if (options.reason) {
      console.log(chalk.bold('Reason:'), options.reason);
    }
    return;
  }

  const spinner = ora('Suspending tenant...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const response = await apiClient.post<Tenant>(`/admin/tenants/${tenantId}/suspend`, {
      reason: options.reason ?? 'Administrative action',
    });

    spinner.stop();

    if (!response.success) {
      printError(`Failed to suspend tenant: ${response.error?.message}`);
      process.exit(1);
    }

    if (getOutputFormat() === 'json') {
      output({ success: true, tenantId, action: 'suspended' });
      return;
    }

    printSuccess(`Tenant "${tenantId}" has been suspended.`);
    printWarning('All users in this tenant will no longer be able to access the platform.');
  } catch (err) {
    spinner.fail('Failed to suspend tenant');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * Reactivate a suspended tenant
 */
async function reactivateTenant(tenantId: string, globalOpts: GlobalOptions): Promise<void> {
  if (globalOpts.dryRun) {
    printDryRunBanner();
    console.log(chalk.bold('Would reactivate tenant:'), tenantId);
    return;
  }

  const spinner = ora('Reactivating tenant...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const response = await apiClient.post<Tenant>(`/admin/tenants/${tenantId}/reactivate`, {});

    spinner.stop();

    if (!response.success) {
      printError(`Failed to reactivate tenant: ${response.error?.message}`);
      process.exit(1);
    }

    if (getOutputFormat() === 'json') {
      output({ success: true, tenantId, action: 'reactivated' });
      return;
    }

    printSuccess(`Tenant "${tenantId}" has been reactivated.`);
  } catch (err) {
    spinner.fail('Failed to reactivate tenant');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * Export tenant metadata
 */
async function exportTenantMetadata(
  tenantId: string,
  options: { output?: string; includeUsers?: boolean; includeQuotas?: boolean },
  globalOpts: GlobalOptions
): Promise<void> {
  const spinner = ora('Exporting tenant metadata...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const params = new URLSearchParams();
    if (options.includeUsers) params.append('includeUsers', 'true');
    if (options.includeQuotas) params.append('includeQuotas', 'true');

    const response = await apiClient.get<Record<string, unknown>>(
      `/admin/tenants/${tenantId}/export?${params.toString()}`
    );

    spinner.stop();

    if (!response.success) {
      printError(`Failed to export tenant metadata: ${response.error?.message}`);
      process.exit(1);
    }

    const metadata = response.data ?? {
      tenant: getDefaultTenants()[0],
      exportedAt: new Date().toISOString(),
    };

    if (options.output) {
      const fs = await import('node:fs/promises');
      await fs.writeFile(options.output, JSON.stringify(metadata, null, 2));
      printSuccess(`Metadata exported to ${options.output}`);
    } else {
      output(metadata);
    }
  } catch (err) {
    spinner.fail('Failed to export tenant metadata');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * Update tenant quotas
 */
async function updateTenantQuotas(
  tenantId: string,
  options: {
    maxUsers?: string;
    maxEntities?: string;
    maxStorage?: string;
    apiRateLimit?: string;
  },
  globalOpts: GlobalOptions
): Promise<void> {
  const quotas: Record<string, number> = {};

  if (options.maxUsers) quotas.maxUsers = parseInt(options.maxUsers, 10);
  if (options.maxEntities) quotas.maxEntities = parseInt(options.maxEntities, 10);
  if (options.maxStorage) quotas.maxStorage = parseInt(options.maxStorage, 10);
  if (options.apiRateLimit) quotas.apiRateLimit = parseInt(options.apiRateLimit, 10);

  if (Object.keys(quotas).length === 0) {
    printError('No quota updates specified. Use --max-users, --max-entities, etc.');
    process.exit(1);
  }

  if (globalOpts.dryRun) {
    printDryRunBanner();
    console.log(chalk.bold('Would update quotas for tenant:'), tenantId);
    outputKeyValue(quotas);
    return;
  }

  const spinner = ora('Updating tenant quotas...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const response = await apiClient.put<Tenant>(`/admin/tenants/${tenantId}/quotas`, quotas);

    spinner.stop();

    if (!response.success) {
      printError(`Failed to update quotas: ${response.error?.message}`);
      process.exit(1);
    }

    if (getOutputFormat() === 'json') {
      output({ success: true, tenantId, quotas });
      return;
    }

    printSuccess(`Quotas updated for tenant "${tenantId}"`);
    outputKeyValue(quotas);
  } catch (err) {
    spinner.fail('Failed to update quotas');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * Format tenant status with color
 */
function formatTenantStatus(status: string): string {
  switch (status) {
    case 'active':
      return chalk.green('active');
    case 'suspended':
      return chalk.red('suspended');
    case 'pending':
      return chalk.yellow('pending');
    default:
      return chalk.gray(status);
  }
}

/**
 * Get default tenants for demo/fallback
 */
function getDefaultTenants(): Tenant[] {
  return [
    {
      id: 'default',
      name: 'Default',
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      quotas: {
        maxUsers: 100,
        maxEntities: 1000000,
        maxStorage: 10737418240,
        apiRateLimit: 1000,
      },
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      status: 'active',
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
      quotas: {
        maxUsers: 1000,
        maxEntities: 10000000,
        maxStorage: 107374182400,
        apiRateLimit: 10000,
      },
    },
  ];
}
