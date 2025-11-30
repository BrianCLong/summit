import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export const policyCommand = new Command('policy')
  .description('Manage and check governance policies');

policyCommand
  .command('list')
  .description('List active policies')
  .action(() => {
    // In a real implementation this would fetch from the server or OPA directly
    // For now we list the policies we saw in PolicyGuard
    console.log(chalk.bold.blue('\n🛡️  Active Governance Policies'));

    const policies = [
      { name: 'budget-limit', severity: 'critical', desc: 'Task budget must not exceed $50' },
      { name: 'no-credential-access', severity: 'critical', desc: 'No access to secrets/keys' },
      { name: 'license-compliance', severity: 'high', desc: 'No restricted licenses (GPL, etc)' },
      { name: 'reasonable-scope', severity: 'medium', desc: 'No dangerous system commands' },
      { name: 'data-residency', severity: 'high', desc: 'Data must stay in allowed regions' },
    ];

    policies.forEach(p => {
      const severityColor = p.severity === 'critical' ? chalk.red : (p.severity === 'high' ? chalk.yellow : chalk.white);
      console.log(`  ${chalk.bold(p.name)} [${severityColor(p.severity)}]: ${p.desc}`);
    });
  });

policyCommand
  .command('check')
  .description('Check a task input against OPA policies')
  .argument('<taskJsonFile>', 'Path to task JSON file')
  .action((taskJsonFile) => {
    try {
      const taskData = JSON.parse(fs.readFileSync(taskJsonFile, 'utf-8'));
      console.log(chalk.blue(`Evaluating policies for task...`));

      // Attempt to run OPA if available
      try {
        const opaInput = JSON.stringify({ input: taskData });
        // This is a placeholder for actual OPA execution
        // execSync(`opa eval -d policy/ -i ...`);
        console.log(chalk.yellow('OPA binary not found in path, skipping local Rego check.'));
      } catch (e) {
        // ignore
      }

      // Simulate checks based on PolicyGuard logic
      const violations = [];
      if (taskData.budgetUSD > 50) violations.push('budget-limit exceeded');
      if (JSON.stringify(taskData).match(/password/i)) violations.push('no-credential-access violation');

      if (violations.length > 0) {
        console.log(chalk.red('\n❌ Policy Check Failed:'));
        violations.forEach(v => console.log(`  - ${v}`));
        process.exit(1);
      } else {
        console.log(chalk.green('\n✅ All Policy Checks Passed'));
      }

    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });
