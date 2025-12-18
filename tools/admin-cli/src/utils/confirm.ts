/**
 * Confirmation utilities for destructive operations
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import type { ConfirmationOptions } from '../types/index.js';

/**
 * Standard confirmation phrases for destructive operations
 */
export const CONFIRMATION_PHRASES = {
  DELETE: 'I understand this will delete data',
  SUSPEND: 'I understand this will suspend the tenant',
  ROTATE: 'I understand this will rotate keys',
  FORCE: 'I understand this is a destructive operation',
  PRODUCTION: 'I understand this affects production',
} as const;

/**
 * Prompt for simple yes/no confirmation
 */
export async function confirm(message: string): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: false,
    },
  ]);
  return confirmed;
}

/**
 * Prompt for confirmation with typed phrase
 */
export async function confirmWithPhrase(options: ConfirmationOptions): Promise<boolean> {
  const phrase = options.typedConfirmationPhrase ?? CONFIRMATION_PHRASES.FORCE;

  console.log();
  console.log(chalk.yellow('⚠'), chalk.bold.yellow('WARNING:'), options.message);
  console.log();

  if (options.requireTypedConfirmation) {
    console.log(
      chalk.gray(`To confirm, type: "${chalk.bold(phrase)}"`)
    );
    console.log();

    const { confirmation } = await inquirer.prompt([
      {
        type: 'input',
        name: 'confirmation',
        message: 'Confirmation:',
      },
    ]);

    if (confirmation !== phrase) {
      console.log(chalk.red('Confirmation phrase did not match. Operation cancelled.'));
      return false;
    }

    return true;
  }

  return confirm(options.confirmText ?? 'Are you sure you want to proceed?');
}

/**
 * Require explicit confirmation for production environments
 */
export async function requireProductionConfirmation(
  environment: string,
  operation: string
): Promise<boolean> {
  if (environment !== 'production' && environment !== 'prod') {
    return true;
  }

  return confirmWithPhrase({
    message: `You are about to ${operation} in PRODUCTION environment.`,
    requireTypedConfirmation: true,
    typedConfirmationPhrase: CONFIRMATION_PHRASES.PRODUCTION,
  });
}

/**
 * Show dry-run notice and confirm to proceed with actual operation
 */
export async function confirmAfterDryRun(
  dryRunResults: string,
  operation: string
): Promise<boolean> {
  console.log();
  console.log(chalk.bgBlue.white(' DRY RUN COMPLETE '));
  console.log();
  console.log(chalk.gray('The following changes would be made:'));
  console.log(dryRunResults);
  console.log();

  return confirm(`Proceed with ${operation}?`);
}

/**
 * Abort operation with message
 */
export function abort(message?: string): never {
  console.log();
  console.log(chalk.yellow('Operation cancelled.'), message ?? '');
  process.exit(0);
}

/**
 * Check if running interactively (TTY)
 */
export function isInteractive(): boolean {
  return process.stdin.isTTY ?? false;
}

/**
 * Require interactive mode for dangerous operations
 */
export function requireInteractive(operation: string): void {
  if (!isInteractive()) {
    console.error(
      chalk.red('Error:'),
      `${operation} requires interactive mode.`
    );
    console.error(
      chalk.gray(
        'Use --force flag to bypass (dangerous), or run in an interactive terminal.'
      )
    );
    process.exit(1);
  }
}
