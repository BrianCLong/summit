#!/usr/bin/env node
/**
 * Summit Agent CLI
 * Command-line tool for managing agents
 */

import { Command } from 'commander';
import fetch from 'node-fetch';
import chalk from 'chalk';
import Table from 'cli-table3';
import inquirer from 'inquirer';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

// Configuration
const config = {
  gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:3001',
  adminToken: process.env.ADMIN_TOKEN || '',
};

// ============================================================================
// Utilities
// ============================================================================

function requireAuth() {
  if (!config.adminToken) {
    console.error(chalk.red('Error: ADMIN_TOKEN environment variable is required'));
    console.log(chalk.yellow('Set it with: export ADMIN_TOKEN=your-token'));
    process.exit(1);
  }
}

async function apiRequest(endpoint: string, options: any = {}) {
  const url = `${config.gatewayUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.adminToken}`,
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || error.error || 'Request failed');
  }

  return response.json();
}

// ============================================================================
// Commands
// ============================================================================

program
  .name('summit-agent')
  .description('CLI tool for managing Summit agents')
  .version('1.0.0');

// ----------------------------------------------------------------------------
// agent create
// ----------------------------------------------------------------------------

program
  .command('create')
  .description('Create a new agent')
  .option('-n, --name <name>', 'Agent name')
  .option('-d, --description <description>', 'Agent description')
  .option('-t, --type <type>', 'Agent type (internal, external, partner)', 'internal')
  .option('--tenant <tenantId>', 'Tenant scope (can specify multiple)', collect, [])
  .option('--project <projectId>', 'Project scope (can specify multiple)', collect, [])
  .option('--capability <capability>', 'Capability (can specify multiple)', collect, [])
  .option('--max-risk <level>', 'Maximum risk level', 'medium')
  .option('--daily-runs <limit>', 'Daily run limit', '1000')
  .option('-i, --interactive', 'Interactive mode')
  .action(async (options) => {
    requireAuth();

    let data: any = {};

    if (options.interactive) {
      // Interactive mode
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Agent name:',
          validate: (input) => input.length > 0 || 'Name is required',
        },
        {
          type: 'input',
          name: 'description',
          message: 'Description:',
        },
        {
          type: 'list',
          name: 'agentType',
          message: 'Agent type:',
          choices: ['internal', 'external', 'partner'],
        },
        {
          type: 'input',
          name: 'tenantScopes',
          message: 'Tenant IDs (comma-separated):',
          filter: (input) => input.split(',').map((s: string) => s.trim()).filter(Boolean),
        },
        {
          type: 'checkbox',
          name: 'capabilities',
          message: 'Select capabilities:',
          choices: [
            { name: 'read:data - Read entities/relationships', value: 'read:data' },
            { name: 'write:data - Create/update entities', value: 'write:data' },
            { name: 'delete:data - Delete entities', value: 'delete:data' },
            { name: 'execute:pipelines - Trigger pipelines', value: 'execute:pipelines' },
            { name: 'execute:commands - Run CLI commands', value: 'execute:commands' },
            { name: 'query:database - Direct database queries', value: 'query:database' },
            { name: 'manage:config - Modify configuration', value: 'manage:config' },
            { name: 'export:data - Export data', value: 'export:data' },
            { name: 'import:data - Import data', value: 'import:data' },
          ],
        },
        {
          type: 'list',
          name: 'maxRiskLevel',
          message: 'Maximum risk level:',
          choices: ['low', 'medium', 'high', 'critical'],
        },
        {
          type: 'number',
          name: 'maxDailyRuns',
          message: 'Maximum daily runs:',
          default: 1000,
        },
      ]);

      data = {
        name: answers.name,
        description: answers.description,
        agentType: answers.agentType,
        tenantScopes: answers.tenantScopes,
        projectScopes: [],
        capabilities: answers.capabilities,
        restrictions: {
          maxRiskLevel: answers.maxRiskLevel,
          requireApproval: ['high', 'critical'],
          maxDailyRuns: answers.maxDailyRuns,
        },
      };
    } else {
      // Command-line mode
      if (!options.name) {
        console.error(chalk.red('Error: --name is required'));
        process.exit(1);
      }

      data = {
        name: options.name,
        description: options.description,
        agentType: options.type,
        tenantScopes: options.tenant,
        projectScopes: options.project,
        capabilities: options.capability,
        restrictions: {
          maxRiskLevel: options.maxRisk,
          requireApproval: ['high', 'critical'],
          maxDailyRuns: parseInt(options.dailyRuns),
        },
      };
    }

    const spinner = ora('Creating agent...').start();

    try {
      const agent = await apiRequest('/api/admin/agents', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      spinner.succeed(chalk.green('Agent created successfully!'));

      console.log(chalk.bold('\nAgent Details:'));
      console.log(`ID: ${chalk.cyan(agent.id)}`);
      console.log(`Name: ${agent.name}`);
      console.log(`Type: ${agent.agentType}`);
      console.log(`Status: ${agent.status}`);
      console.log(`Capabilities: ${agent.capabilities.join(', ')}`);

      // Offer to create credential
      if (options.interactive) {
        const { createCred } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'createCred',
            message: 'Create API credential now?',
            default: true,
          },
        ]);

        if (createCred) {
          const credSpinner = ora('Generating API key...').start();
          const cred = await apiRequest(`/api/admin/agents/${agent.id}/credentials`, {
            method: 'POST',
            body: JSON.stringify({ credentialType: 'api_key' }),
          });

          credSpinner.succeed('API key generated!');

          console.log(chalk.bold('\n⚠️  Save this API key - it will not be shown again:'));
          console.log(chalk.green(cred.apiKey));
          console.log(chalk.dim(`Prefix: ${cred.credential.keyPrefix}`));
        }
      }
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to create agent'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ----------------------------------------------------------------------------
// agent list
// ----------------------------------------------------------------------------

program
  .command('list')
  .description('List all agents')
  .option('-t, --type <type>', 'Filter by agent type')
  .option('-s, --status <status>', 'Filter by status')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();

    const spinner = ora('Fetching agents...').start();

    try {
      const query = new URLSearchParams();
      if (options.type) query.append('agentType', options.type);
      if (options.status) query.append('status', options.status);

      const agents = await apiRequest(`/api/admin/agents?${query}`);

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(agents, null, 2));
        return;
      }

      if (agents.length === 0) {
        console.log(chalk.yellow('No agents found'));
        return;
      }

      const table = new Table({
        head: ['ID', 'Name', 'Type', 'Status', 'Certified', 'Tenants', 'Capabilities'].map(h => chalk.cyan(h)),
        colWidths: [38, 25, 10, 10, 10, 15, 30],
      });

      agents.forEach((agent: any) => {
        table.push([
          agent.id.substring(0, 8) + '...',
          agent.name,
          agent.agentType,
          agent.status === 'active' ? chalk.green('active') : chalk.red(agent.status),
          agent.isCertified ? chalk.green('✓') : chalk.red('✗'),
          agent.tenantScopes.length,
          agent.capabilities.slice(0, 2).join(', ') + (agent.capabilities.length > 2 ? '...' : ''),
        ]);
      });

      console.log(table.toString());
      console.log(chalk.dim(`\nTotal: ${agents.length} agent(s)`));
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch agents'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ----------------------------------------------------------------------------
// agent get
// ----------------------------------------------------------------------------

program
  .command('get <agentId>')
  .description('Get agent details')
  .option('--json', 'Output as JSON')
  .action(async (agentId, options) => {
    requireAuth();

    const spinner = ora('Fetching agent...').start();

    try {
      const agent = await apiRequest(`/api/admin/agents/${agentId}`);

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(agent, null, 2));
        return;
      }

      console.log(chalk.bold('\n📋 Agent Details\n'));
      console.log(`${chalk.bold('ID:')} ${agent.id}`);
      console.log(`${chalk.bold('Name:')} ${agent.name}`);
      console.log(`${chalk.bold('Type:')} ${agent.agentType}`);
      console.log(`${chalk.bold('Status:')} ${agent.status === 'active' ? chalk.green(agent.status) : chalk.red(agent.status)}`);
      console.log(`${chalk.bold('Certified:')} ${agent.isCertified ? chalk.green('Yes') : chalk.red('No')}`);

      if (agent.certificationExpiresAt) {
        const expires = new Date(agent.certificationExpiresAt);
        const daysLeft = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        console.log(`${chalk.bold('Certification Expires:')} ${expires.toLocaleDateString()} (${daysLeft} days)`);
      }

      console.log(`\n${chalk.bold('Scopes:')}`);
      console.log(`  Tenants: ${agent.tenantScopes.join(', ') || 'none'}`);
      console.log(`  Projects: ${agent.projectScopes.join(', ') || 'none'}`);

      console.log(`\n${chalk.bold('Capabilities:')}`);
      agent.capabilities.forEach((cap: string) => console.log(`  • ${cap}`));

      console.log(`\n${chalk.bold('Restrictions:')}`);
      console.log(`  Max Risk Level: ${agent.restrictions.maxRiskLevel}`);
      console.log(`  Require Approval: ${agent.restrictions.requireApproval.join(', ')}`);
      if (agent.restrictions.maxDailyRuns) {
        console.log(`  Max Daily Runs: ${agent.restrictions.maxDailyRuns}`);
      }

      console.log(`\n${chalk.bold('Metadata:')}`);
      console.log(`  Created: ${new Date(agent.createdAt).toLocaleString()}`);
      console.log(`  Updated: ${new Date(agent.updatedAt).toLocaleString()}`);
      console.log(`  Tags: ${agent.tags.join(', ') || 'none'}`);
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch agent'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ----------------------------------------------------------------------------
// agent update
// ----------------------------------------------------------------------------

program
  .command('update <agentId>')
  .description('Update agent')
  .option('--name <name>', 'New name')
  .option('--status <status>', 'New status (active, suspended, retired)')
  .option('--add-capability <capability>', 'Add capability', collect, [])
  .option('--remove-capability <capability>', 'Remove capability', collect, [])
  .action(async (agentId, options) => {
    requireAuth();

    const updates: any = {};
    if (options.name) updates.name = options.name;
    if (options.status) updates.status = options.status;

    const spinner = ora('Updating agent...').start();

    try {
      // Get current agent to modify capabilities
      const agent = await apiRequest(`/api/admin/agents/${agentId}`);

      if (options.addCapability.length > 0 || options.removeCapability.length > 0) {
        let capabilities = [...agent.capabilities];
        capabilities = capabilities.filter((c: string) => !options.removeCapability.includes(c));
        capabilities = [...new Set([...capabilities, ...options.addCapability])];
        updates.capabilities = capabilities;
      }

      await apiRequest(`/api/admin/agents/${agentId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      spinner.succeed(chalk.green('Agent updated successfully!'));
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to update agent'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ----------------------------------------------------------------------------
// agent certify
// ----------------------------------------------------------------------------

program
  .command('certify <agentId>')
  .description('Certify agent for production use')
  .option('-d, --days <days>', 'Certification validity in days', '365')
  .action(async (agentId, options) => {
    requireAuth();

    const spinner = ora('Certifying agent...').start();

    try {
      await apiRequest(`/api/admin/agents/${agentId}/certify`, {
        method: 'POST',
        body: JSON.stringify({ expiresInDays: parseInt(options.days) }),
      });

      spinner.succeed(chalk.green('Agent certified successfully!'));
      console.log(chalk.dim(`Valid for ${options.days} days`));
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to certify agent'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ----------------------------------------------------------------------------
// credential create
// ----------------------------------------------------------------------------

program
  .command('credential:create <agentId>')
  .description('Create new API credential')
  .option('-d, --days <days>', 'Expiration in days', '365')
  .option('--save <file>', 'Save API key to file')
  .action(async (agentId, options) => {
    requireAuth();

    const spinner = ora('Creating credential...').start();

    try {
      const result = await apiRequest(`/api/admin/agents/${agentId}/credentials`, {
        method: 'POST',
        body: JSON.stringify({
          credentialType: 'api_key',
          options: { expiresInDays: parseInt(options.days) },
        }),
      });

      spinner.succeed(chalk.green('Credential created!'));

      console.log(chalk.bold('\n⚠️  Save this API key - it will not be shown again:\n'));
      console.log(chalk.green.bold(result.apiKey));
      console.log(chalk.dim(`\nPrefix: ${result.credential.keyPrefix}`));
      console.log(chalk.dim(`Expires: ${new Date(result.credential.expiresAt).toLocaleDateString()}`));

      if (options.save) {
        fs.writeFileSync(options.save, result.apiKey, { mode: 0o600 });
        console.log(chalk.green(`\n✓ API key saved to ${options.save}`));
      }
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to create credential'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ----------------------------------------------------------------------------
// credential rotate
// ----------------------------------------------------------------------------

program
  .command('credential:rotate <credentialId>')
  .description('Rotate API credential')
  .option('--save <file>', 'Save new API key to file')
  .action(async (credentialId, options) => {
    requireAuth();

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'This will revoke the old credential. Continue?',
        default: false,
      },
    ]);

    if (!confirm) {
      console.log('Cancelled');
      return;
    }

    const spinner = ora('Rotating credential...').start();

    try {
      const result = await apiRequest(`/api/admin/credentials/${credentialId}/rotate`, {
        method: 'POST',
      });

      spinner.succeed(chalk.green('Credential rotated!'));

      console.log(chalk.bold('\n⚠️  Save this new API key:\n'));
      console.log(chalk.green.bold(result.apiKey));
      console.log(chalk.dim(`\nPrefix: ${result.credential.keyPrefix}`));

      if (options.save) {
        fs.writeFileSync(options.save, result.apiKey, { mode: 0o600 });
        console.log(chalk.green(`\n✓ API key saved to ${options.save}`));
      }
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to rotate credential'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ----------------------------------------------------------------------------
// approval list
// ----------------------------------------------------------------------------

program
  .command('approval:list')
  .description('List pending approvals')
  .option('-u, --user <userId>', 'Filter by assigned user')
  .action(async (options) => {
    requireAuth();

    const spinner = ora('Fetching approvals...').start();

    try {
      const query = options.user ? `?userId=${options.user}` : '';
      const approvals = await apiRequest(`/api/approvals/pending${query}`);

      spinner.stop();

      if (approvals.length === 0) {
        console.log(chalk.yellow('No pending approvals'));
        return;
      }

      const table = new Table({
        head: ['ID', 'Agent', 'Summary', 'Risk', 'Created', 'Expires'].map(h => chalk.cyan(h)),
        colWidths: [20, 25, 40, 10, 20, 20],
      });

      approvals.forEach((approval: any) => {
        const riskColor = {
          low: chalk.green,
          medium: chalk.yellow,
          high: chalk.red,
          critical: chalk.red.bold,
        }[approval.riskLevel] || chalk.white;

        table.push([
          approval.id.substring(0, 8) + '...',
          approval.agentName || approval.agentId.substring(0, 8) + '...',
          approval.requestSummary.substring(0, 37) + '...',
          riskColor(approval.riskLevel),
          new Date(approval.createdAt).toLocaleString(),
          new Date(approval.expiresAt).toLocaleString(),
        ]);
      });

      console.log(table.toString());
      console.log(chalk.dim(`\nTotal: ${approvals.length} pending approval(s)`));
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch approvals'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ----------------------------------------------------------------------------
// approval decide
// ----------------------------------------------------------------------------

program
  .command('approval:decide <approvalId>')
  .description('Approve or reject an approval request')
  .requiredOption('-d, --decision <decision>', 'Decision (approved or rejected)')
  .requiredOption('-u, --user <userId>', 'Your user ID')
  .option('-r, --reason <reason>', 'Reason for decision')
  .action(async (approvalId, options) => {
    requireAuth();

    if (!['approved', 'rejected'].includes(options.decision)) {
      console.error(chalk.red('Decision must be "approved" or "rejected"'));
      process.exit(1);
    }

    const spinner = ora('Processing decision...').start();

    try {
      await apiRequest(`/api/approvals/${approvalId}/decide`, {
        method: 'POST',
        body: JSON.stringify({
          decision: options.decision,
          userId: options.user,
          reason: options.reason,
        }),
      });

      spinner.succeed(chalk.green(`Approval ${options.decision}!`));
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to process decision'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ----------------------------------------------------------------------------
// Helper functions
// ----------------------------------------------------------------------------

function collect(value: string, previous: string[]) {
  return previous.concat([value]);
}

// Parse and execute
program.parse();
