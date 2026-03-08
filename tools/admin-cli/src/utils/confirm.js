"use strict";
/**
 * Confirmation utilities for destructive operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIRMATION_PHRASES = void 0;
exports.confirm = confirm;
exports.confirmWithPhrase = confirmWithPhrase;
exports.requireProductionConfirmation = requireProductionConfirmation;
exports.confirmAfterDryRun = confirmAfterDryRun;
exports.abort = abort;
exports.isInteractive = isInteractive;
exports.requireInteractive = requireInteractive;
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
/**
 * Standard confirmation phrases for destructive operations
 */
exports.CONFIRMATION_PHRASES = {
    DELETE: 'I understand this will delete data',
    SUSPEND: 'I understand this will suspend the tenant',
    ROTATE: 'I understand this will rotate keys',
    FORCE: 'I understand this is a destructive operation',
    PRODUCTION: 'I understand this affects production',
};
/**
 * Prompt for simple yes/no confirmation
 */
async function confirm(message) {
    const { confirmed } = await inquirer_1.default.prompt([
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
async function confirmWithPhrase(options) {
    const phrase = options.typedConfirmationPhrase ?? exports.CONFIRMATION_PHRASES.FORCE;
    console.log();
    console.log(chalk_1.default.yellow('⚠'), chalk_1.default.bold.yellow('WARNING:'), options.message);
    console.log();
    if (options.requireTypedConfirmation) {
        console.log(chalk_1.default.gray(`To confirm, type: "${chalk_1.default.bold(phrase)}"`));
        console.log();
        const { confirmation } = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'confirmation',
                message: 'Confirmation:',
            },
        ]);
        if (confirmation !== phrase) {
            console.log(chalk_1.default.red('Confirmation phrase did not match. Operation cancelled.'));
            return false;
        }
        return true;
    }
    return confirm(options.confirmText ?? 'Are you sure you want to proceed?');
}
/**
 * Require explicit confirmation for production environments
 */
async function requireProductionConfirmation(environment, operation) {
    if (environment !== 'production' && environment !== 'prod') {
        return true;
    }
    return confirmWithPhrase({
        message: `You are about to ${operation} in PRODUCTION environment.`,
        requireTypedConfirmation: true,
        typedConfirmationPhrase: exports.CONFIRMATION_PHRASES.PRODUCTION,
    });
}
/**
 * Show dry-run notice and confirm to proceed with actual operation
 */
async function confirmAfterDryRun(dryRunResults, operation) {
    console.log();
    console.log(chalk_1.default.bgBlue.white(' DRY RUN COMPLETE '));
    console.log();
    console.log(chalk_1.default.gray('The following changes would be made:'));
    console.log(dryRunResults);
    console.log();
    return confirm(`Proceed with ${operation}?`);
}
/**
 * Abort operation with message
 */
function abort(message) {
    console.log();
    console.log(chalk_1.default.yellow('Operation cancelled.'), message ?? '');
    process.exit(0);
}
/**
 * Check if running interactively (TTY)
 */
function isInteractive() {
    return process.stdin.isTTY ?? false;
}
/**
 * Require interactive mode for dangerous operations
 */
function requireInteractive(operation) {
    if (!isInteractive()) {
        console.error(chalk_1.default.red('Error:'), `${operation} requires interactive mode.`);
        console.error(chalk_1.default.gray('Use --force flag to bypass (dangerous), or run in an interactive terminal.'));
        process.exit(1);
    }
}
