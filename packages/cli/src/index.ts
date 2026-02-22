#!/usr/bin/env node
/**
 * Summit CLI
 *
 * Command-line interface for the Summit platform.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.1 (System Operations)
 *
 * @module @summit/cli
 */

/* eslint-disable no-console */
import { Command } from 'commander';
import chalk from 'chalk';
import { policyCommands } from './commands/policy.js';
import { tenantCommands } from './commands/tenant.js';
import { auditCommands } from './commands/audit.js';
import { complianceCommands } from './commands/compliance.js';
import { configCommands } from './commands/config.js';
import { pluginCommands } from './commands/plugin.js';
import { agentsCommands } from './commands/agents.js';
import { doctor } from './commands/doctor.js';
import { mediaCommands } from './commands/media.js';
import { orchCommands } from './commands/orch.js';
import { serviceCommands } from './commands/service.js';
import { loadConfig, getConfig } from './config.js';

const program = new Command();

program
  .name('summit')
  .description('Summit Platform CLI - Governance, compliance, and policy management')
  .version('1.0.0')
  .hook('preAction', async () => {
    try {
      await loadConfig();
    } catch (_error) {
      // Config loading is optional for some commands
    }
  });

// Configuration commands
program
  .command('config')
  .description('Manage CLI configuration')
  .addCommand(configCommands.set)
  .addCommand(configCommands.get)
  .addCommand(configCommands.list)
  .addCommand(configCommands.init);

program.addCommand(doctor);

// Policy commands
program
  .command('policy')
  .description('Policy management commands')
  .addCommand(policyCommands.list)
  .addCommand(policyCommands.get)
  .addCommand(policyCommands.create)
  .addCommand(policyCommands.update)
  .addCommand(policyCommands.delete)
  .addCommand(policyCommands.simulate)
  .addCommand(policyCommands.activate)
  .addCommand(policyCommands.archive);

// Tenant commands
program
  .command('tenant')
  .description('Tenant management commands')
  .addCommand(tenantCommands.info)
  .addCommand(tenantCommands.users)
  .addCommand(tenantCommands.settings);

// Audit commands
program
  .command('audit')
  .description('Audit log commands')
  .addCommand(auditCommands.logs)
  .addCommand(auditCommands.export);

// Compliance commands
program
  .command('compliance')
  .description('Compliance management commands')
  .addCommand(complianceCommands.summary)
  .addCommand(complianceCommands.controls)
  .addCommand(complianceCommands.assess)
  .addCommand(complianceCommands.evidence)
  .addCommand(complianceCommands.report);

// Plugin commands
program
  .command('plugin')
  .description('Plugin development commands')
  .addCommand(pluginCommands.create)
  .addCommand(pluginCommands.validate)
  .addCommand(pluginCommands.test)
  .addCommand(pluginCommands.build)
  .addCommand(pluginCommands.publish)
  .addCommand(pluginCommands.list);

// Service commands
program.addCommand(serviceCommands);

// Agent registry commands
program.addCommand(agentsCommands);

// Login command
program
  .command('login')
  .description('Authenticate with Summit platform')
  .option('-e, --email <email>', 'User email')
  .option('-k, --api-key <key>', 'API key for authentication')
  .option('--url <url>', 'Summit API URL')
  .action(async (options) => {
    const { login } = await import('./commands/auth.js');
    await login(options);
  });

// Logout command
program
  .command('logout')
  .description('Log out from Summit platform')
  .action(async () => {
    const { logout } = await import('./commands/auth.js');
    await logout();
  });

// Status command
program
  .command('status')
  .description('Show current connection status')
  .action(() => {
    const config = getConfig();
    if (!config.baseUrl) {
      console.log(chalk.yellow('Not configured. Run `summit config init` to set up.'));
      return;
    }

    console.log(chalk.bold('\nSummit CLI Status\n'));
    console.log(`API URL:    ${config.baseUrl}`);
    console.log(`Tenant ID:  ${config.tenantId || 'Not set'}`);
    console.log(`Auth:       ${config.token ? chalk.green('Authenticated') : chalk.yellow('Not authenticated')}`);
  });

// Parse and execute
program.parse();
