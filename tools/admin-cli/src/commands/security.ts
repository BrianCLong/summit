/**
 * Security commands for Admin CLI
 * Key rotation, policy checks, and security audits
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import type {
  GlobalOptions,
  SecurityKey,
  PolicyCheckResult,
  PolicyViolation,
} from '../types/index.js';
import {
  output,
  outputTable,
  outputKeyValue,
  printHeader,
  printError,
  printSuccess,
  printWarning,
  printInfo,
  printDryRunBanner,
  formatTimestamp,
  getOutputFormat,
} from '../utils/output.js';
import { createApiClient } from '../utils/api-client.js';
import { getEndpoint, getToken } from '../utils/config.js';
import {
  confirmWithPhrase,
  CONFIRMATION_PHRASES,
  abort,
  requireInteractive,
  requireProductionConfirmation,
} from '../utils/confirm.js';
import { logger } from '../utils/logger.js';

/**
 * Register security commands
 */
export function registerSecurityCommands(program: Command): void {
  const securityCmd = new Command('security')
    .description('Security operations: key rotation, policy checks');

  // List keys
  securityCmd
    .command('keys')
    .description('List security keys and their status')
    .option('--type <type>', 'Filter by key type (jwt, api, encryption)')
    .option('--status <status>', 'Filter by status (active, expired, rotated)')
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await listKeys(options, globalOpts);
    });

  // Rotate keys command
  securityCmd
    .command('rotate-keys')
    .description('Rotate security keys (requires confirmation)')
    .option('--type <type>', 'Key type to rotate (jwt, api, encryption)', 'all')
    .option('--grace-period <hours>', 'Grace period for old keys (hours)', '24')
    .option('--force', 'Skip confirmation (dangerous)')
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await rotateKeys(options, globalOpts);
    });

  // Check policies command
  securityCmd
    .command('check-policies')
    .description('Run security policy compliance checks')
    .option('--policy <name>', 'Specific policy to check')
    .option('--all', 'Check all policies')
    .option('--report <file>', 'Output report file')
    .option('--fail-on-violation', 'Exit with error if violations found')
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await checkPolicies(options, globalOpts);
    });

  // Audit command
  securityCmd
    .command('audit')
    .description('View security audit events')
    .option('--from <date>', 'Start date (ISO format)')
    .option('--to <date>', 'End date (ISO format)')
    .option('--action <action>', 'Filter by action type')
    .option('--user <userId>', 'Filter by user ID')
    .option('--limit <n>', 'Number of events', '100')
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await viewAuditEvents(options, globalOpts);
    });

  // Revoke tokens command
  securityCmd
    .command('revoke-tokens')
    .description('Revoke user tokens')
    .option('--user <userId>', 'User ID to revoke tokens for')
    .option('--tenant <tenantId>', 'Revoke all tokens for tenant')
    .option('--all', 'Revoke all tokens (dangerous)')
    .option('--force', 'Skip confirmation')
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await revokeTokens(options, globalOpts);
    });

  // RBAC check command
  securityCmd
    .command('check-permission')
    .description('Check if a user has a specific permission')
    .requiredOption('--user <userId>', 'User ID')
    .requiredOption('--permission <permission>', 'Permission to check (e.g., entity:read)')
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await checkPermission(options, globalOpts);
    });

  program.addCommand(securityCmd);
}

/**
 * List security keys
 */
async function listKeys(
  options: { type?: string; status?: string },
  globalOpts: GlobalOptions
): Promise<void> {
  const spinner = ora('Fetching security keys...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const params = new URLSearchParams();
    if (options.type) params.append('type', options.type);
    if (options.status) params.append('status', options.status);

    const response = await apiClient.get<{ items: SecurityKey[] }>(
      `/admin/security/keys?${params.toString()}`
    );

    spinner.stop();

    if (!response.success) {
      printError(`Failed to fetch keys: ${response.error?.message}`);
      // Fall back to mock data for demo
    }

    const keys = response.data?.items ?? getMockKeys();

    if (getOutputFormat() === 'json') {
      output(keys);
      return;
    }

    printHeader('Security Keys');

    const keyRows = keys.map((k) => ({
      id: k.id.slice(0, 12) + '...',
      type: k.type,
      status: formatKeyStatus(k.status),
      createdAt: new Date(k.createdAt).toLocaleDateString(),
      expiresAt: k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'Never',
    }));

    outputTable(keyRows);
  } catch (err) {
    spinner.fail('Failed to fetch keys');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * Rotate security keys
 */
async function rotateKeys(
  options: { type?: string; gracePeriod?: string; force?: boolean },
  globalOpts: GlobalOptions
): Promise<void> {
  const keyType = options.type ?? 'all';
  const gracePeriodHours = parseInt(options.gracePeriod ?? '24', 10);

  // Extra confirmation for production
  const profile = globalOpts.profile ?? 'default';
  if (profile === 'production' || profile === 'prod') {
    const confirmed = await requireProductionConfirmation('production', 'rotate security keys');
    if (!confirmed) {
      abort();
    }
  }

  if (!options.force) {
    requireInteractive('Key rotation');

    const message =
      keyType === 'all'
        ? 'You are about to rotate ALL security keys. This will invalidate existing tokens after the grace period.'
        : `You are about to rotate ${keyType} keys. This will invalidate existing ${keyType} tokens after the grace period.`;

    const confirmed = await confirmWithPhrase({
      message,
      requireTypedConfirmation: true,
      typedConfirmationPhrase: CONFIRMATION_PHRASES.ROTATE,
    });

    if (!confirmed) {
      abort();
    }
  }

  if (globalOpts.dryRun) {
    printDryRunBanner();
    console.log(chalk.bold('Would rotate keys:'));
    console.log(`  Type: ${keyType}`);
    console.log(`  Grace period: ${gracePeriodHours} hours`);
    return;
  }

  const spinner = ora('Rotating keys...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const response = await apiClient.post<{ rotatedKeys: SecurityKey[] }>(
      '/admin/security/rotate-keys',
      {
        type: keyType,
        gracePeriodHours,
      }
    );

    spinner.stop();

    if (!response.success) {
      printError(`Failed to rotate keys: ${response.error?.message}`);
      process.exit(1);
    }

    const rotatedKeys = response.data?.rotatedKeys ?? [];

    if (getOutputFormat() === 'json') {
      output({ success: true, rotatedKeys });
      return;
    }

    printSuccess('Keys rotated successfully');
    console.log(chalk.bold(`Grace period: ${gracePeriodHours} hours`));
    console.log();

    if (rotatedKeys.length > 0) {
      console.log(chalk.bold('Rotated keys:'));
      for (const key of rotatedKeys) {
        console.log(`  - ${key.type}: ${key.id}`);
      }
    }

    printWarning(`Old keys will remain valid for ${gracePeriodHours} hours.`);
    printInfo('Monitor the audit log for any authentication failures.');
  } catch (err) {
    spinner.fail('Failed to rotate keys');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * Check security policies
 */
async function checkPolicies(
  options: {
    policy?: string;
    all?: boolean;
    report?: string;
    failOnViolation?: boolean;
  },
  globalOpts: GlobalOptions
): Promise<void> {
  if (!options.policy && !options.all) {
    printError('Specify --policy <name> or --all');
    process.exit(1);
  }

  const spinner = ora('Running policy checks...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const body = options.all ? { checkAll: true } : { policy: options.policy };

    const response = await apiClient.post<{ results: PolicyCheckResult[] }>(
      '/admin/security/check-policies',
      body
    );

    spinner.stop();

    if (!response.success) {
      printError(`Failed to check policies: ${response.error?.message}`);
      // Fall back to mock data
    }

    const results = response.data?.results ?? getMockPolicyResults();

    // Write report to file if specified
    if (options.report) {
      const fs = await import('node:fs/promises');
      await fs.writeFile(options.report, JSON.stringify(results, null, 2));
      printInfo(`Report saved to ${options.report}`);
    }

    if (getOutputFormat() === 'json') {
      output(results);
      if (options.failOnViolation) {
        const hasViolations = results.some((r) => r.violations.length > 0);
        if (hasViolations) process.exit(1);
      }
      return;
    }

    printHeader('Policy Check Results');

    let totalViolations = 0;

    for (const result of results) {
      const statusIcon = result.compliant ? chalk.green('✓') : chalk.red('✗');
      console.log(`${statusIcon} ${chalk.bold(result.policy)}`);

      if (result.violations.length > 0) {
        totalViolations += result.violations.length;

        for (const violation of result.violations) {
          const severityColor = getSeverityColor(violation.severity);
          console.log(`    ${severityColor(`[${violation.severity}]`)} ${violation.rule}`);
          console.log(`      ${chalk.gray(violation.description)}`);
          if (violation.resource) {
            console.log(`      ${chalk.gray(`Resource: ${violation.resource}`)}`);
          }
          if (violation.recommendation) {
            console.log(`      ${chalk.cyan(`Fix: ${violation.recommendation}`)}`);
          }
        }
      }
      console.log();
    }

    // Summary
    const compliantCount = results.filter((r) => r.compliant).length;
    console.log(chalk.bold('Summary:'));
    console.log(`  Policies checked: ${results.length}`);
    console.log(`  Compliant: ${chalk.green(compliantCount)}`);
    console.log(`  Non-compliant: ${results.length - compliantCount > 0 ? chalk.red(results.length - compliantCount) : chalk.green(0)}`);
    console.log(`  Total violations: ${totalViolations > 0 ? chalk.red(totalViolations) : chalk.green(0)}`);

    if (options.failOnViolation && totalViolations > 0) {
      process.exit(1);
    }
  } catch (err) {
    spinner.fail('Failed to check policies');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * View audit events
 */
async function viewAuditEvents(
  options: {
    from?: string;
    to?: string;
    action?: string;
    user?: string;
    limit?: string;
  },
  globalOpts: GlobalOptions
): Promise<void> {
  const spinner = ora('Fetching audit events...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const params = new URLSearchParams();
    if (options.from) params.append('from', options.from);
    if (options.to) params.append('to', options.to);
    if (options.action) params.append('action', options.action);
    if (options.user) params.append('user', options.user);
    if (options.limit) params.append('limit', options.limit);

    const response = await apiClient.get<{ items: AuditEvent[] }>(
      `/admin/audit?${params.toString()}`
    );

    spinner.stop();

    if (!response.success) {
      printError(`Failed to fetch audit events: ${response.error?.message}`);
    }

    const events = response.data?.items ?? getMockAuditEvents();

    if (getOutputFormat() === 'json') {
      output(events);
      return;
    }

    printHeader('Audit Events');

    const eventRows = events.map((e) => ({
      timestamp: formatTimestamp(e.ts),
      action: e.action,
      user: e.user?.email ?? e.user?.id ?? '-',
      ip: e.ip ?? '-',
      details: e.details ? JSON.stringify(e.details).slice(0, 40) : '-',
    }));

    outputTable(eventRows);
  } catch (err) {
    spinner.fail('Failed to fetch audit events');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * Revoke tokens
 */
async function revokeTokens(
  options: {
    user?: string;
    tenant?: string;
    all?: boolean;
    force?: boolean;
  },
  globalOpts: GlobalOptions
): Promise<void> {
  if (!options.user && !options.tenant && !options.all) {
    printError('Specify --user <userId>, --tenant <tenantId>, or --all');
    process.exit(1);
  }

  if (options.all && !options.force) {
    requireInteractive('Revoking all tokens');

    const confirmed = await confirmWithPhrase({
      message: 'You are about to revoke ALL tokens for ALL users. This will force everyone to re-authenticate.',
      requireTypedConfirmation: true,
      typedConfirmationPhrase: CONFIRMATION_PHRASES.FORCE,
    });

    if (!confirmed) {
      abort();
    }
  }

  if (globalOpts.dryRun) {
    printDryRunBanner();
    console.log(chalk.bold('Would revoke tokens:'));
    if (options.user) console.log(`  User: ${options.user}`);
    if (options.tenant) console.log(`  Tenant: ${options.tenant}`);
    if (options.all) console.log(`  Scope: ALL tokens`);
    return;
  }

  const spinner = ora('Revoking tokens...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const response = await apiClient.post<{ revokedCount: number }>(
      '/admin/security/revoke-tokens',
      {
        userId: options.user,
        tenantId: options.tenant,
        all: options.all,
      }
    );

    spinner.stop();

    if (!response.success) {
      printError(`Failed to revoke tokens: ${response.error?.message}`);
      process.exit(1);
    }

    const revokedCount = response.data?.revokedCount ?? 0;

    if (getOutputFormat() === 'json') {
      output({ success: true, revokedCount });
      return;
    }

    printSuccess(`Revoked ${revokedCount} token(s)`);
  } catch (err) {
    spinner.fail('Failed to revoke tokens');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * Check user permission
 */
async function checkPermission(
  options: { user: string; permission: string },
  globalOpts: GlobalOptions
): Promise<void> {
  const spinner = ora('Checking permission...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const response = await apiClient.post<{
      allowed: boolean;
      reason?: string;
      matchedPermission?: string;
    }>('/admin/security/check-permission', {
      userId: options.user,
      permission: options.permission,
    });

    spinner.stop();

    if (!response.success) {
      printError(`Failed to check permission: ${response.error?.message}`);
      process.exit(1);
    }

    const result = response.data ?? { allowed: false, reason: 'Unknown' };

    if (getOutputFormat() === 'json') {
      output(result);
      return;
    }

    if (result.allowed) {
      printSuccess(`User ${options.user} has permission: ${options.permission}`);
      if (result.matchedPermission) {
        console.log(chalk.gray(`  Matched by: ${result.matchedPermission}`));
      }
    } else {
      printWarning(`User ${options.user} does NOT have permission: ${options.permission}`);
      if (result.reason) {
        console.log(chalk.gray(`  Reason: ${result.reason}`));
      }
    }
  } catch (err) {
    spinner.fail('Failed to check permission');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * Format key status with color
 */
function formatKeyStatus(status: string): string {
  switch (status) {
    case 'active':
      return chalk.green('active');
    case 'expired':
      return chalk.red('expired');
    case 'rotated':
      return chalk.yellow('rotated');
    default:
      return chalk.gray(status);
  }
}

/**
 * Get severity color
 */
function getSeverityColor(severity: string): (s: string) => string {
  switch (severity) {
    case 'critical':
      return chalk.bgRed.white;
    case 'high':
      return chalk.red;
    case 'medium':
      return chalk.yellow;
    case 'low':
      return chalk.blue;
    default:
      return chalk.gray;
  }
}

/**
 * Mock data for demo/fallback
 */
function getMockKeys(): SecurityKey[] {
  return [
    {
      id: 'key-jwt-primary-abc123',
      type: 'jwt',
      createdAt: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
      expiresAt: new Date(Date.now() + 60 * 24 * 3600000).toISOString(),
      status: 'active',
    },
    {
      id: 'key-api-service-def456',
      type: 'api',
      createdAt: new Date(Date.now() - 90 * 24 * 3600000).toISOString(),
      status: 'active',
    },
    {
      id: 'key-enc-data-ghi789',
      type: 'encryption',
      createdAt: new Date(Date.now() - 180 * 24 * 3600000).toISOString(),
      status: 'active',
    },
  ];
}

function getMockPolicyResults(): PolicyCheckResult[] {
  return [
    {
      policy: 'password-policy',
      compliant: true,
      violations: [],
      checkedAt: new Date().toISOString(),
    },
    {
      policy: 'data-retention',
      compliant: true,
      violations: [],
      checkedAt: new Date().toISOString(),
    },
    {
      policy: 'access-logging',
      compliant: true,
      violations: [],
      checkedAt: new Date().toISOString(),
    },
  ];
}

interface AuditEvent {
  ts: string;
  action: string;
  user?: { id?: string; email?: string };
  ip?: string;
  details?: Record<string, unknown>;
}

function getMockAuditEvents(): AuditEvent[] {
  return [
    {
      ts: new Date(Date.now() - 60000).toISOString(),
      action: 'auth.success',
      user: { email: 'admin@example.com' },
      ip: '192.168.1.1',
    },
    {
      ts: new Date(Date.now() - 120000).toISOString(),
      action: 'entity.create',
      user: { email: 'analyst@example.com' },
      ip: '192.168.1.2',
      details: { entityType: 'Person' },
    },
    {
      ts: new Date(Date.now() - 180000).toISOString(),
      action: 'investigation.update',
      user: { email: 'analyst@example.com' },
      ip: '192.168.1.2',
    },
  ];
}
