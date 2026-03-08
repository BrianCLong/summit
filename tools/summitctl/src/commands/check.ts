import { aiMaturityCommand } from './check/ai-maturity';
import { modalityFitCommand } from './check/modality-fit';
import { Command } from 'commander';
import chalk from 'chalk';
import { runCommandWithStream, execAsync } from '../utils';

export const checkAction = async (options: any) => {
    console.log(chalk.bold('Validating Code Quality...'));
    let hasError = false;

    if (options.lint !== false) {
        try {
            await runCommandWithStream('npm run lint', 'Linting code');
        } catch (e) { hasError = true; }
    }

    if (options.types !== false) {
        try {
            await runCommandWithStream('npm run typecheck', 'Checking types');
        } catch (e) { hasError = true; }
    }

    if (options.security !== false) {
        try {
            console.log(chalk.blue('\n> Running security scan...'));
            // Check for gitleaks or trivy
            await runCommandWithStream('npm audit', 'Dependency Audit');

            // Check if gitleaks is installed
            try {
                await execAsync('gitleaks version');
                await runCommandWithStream('gitleaks detect --no-git --verbose', 'Secret Scanning (Gitleaks)');
            } catch (e) {
                 console.log(chalk.yellow('ℹ Gitleaks not found, skipping secret scan.'));
            }

        } catch (e) { hasError = true; }
    }

    if (hasError) {
        console.error(chalk.red('\nChecks failed. See output above for details.'));
        process.exit(1);
    } else {
        console.log(chalk.green('\nAll checks passed!'));
    }
};

export const checkCommand = new Command('check')
  .description('Validate code quality')
  .option('--no-lint', 'Skip linting')
  .option('--no-types', 'Skip type checking')
  .option('--no-security', 'Skip security scan')
  .action(checkAction);

checkCommand.addCommand(aiMaturityCommand);
checkCommand.addCommand(modalityFitCommand);
