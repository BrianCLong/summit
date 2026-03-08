"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCommand = exports.checkAction = void 0;
const ai_maturity_1 = require("./check/ai-maturity");
const modality_fit_1 = require("./check/modality-fit");
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const utils_1 = require("../utils");
const checkAction = async (options) => {
    console.log(chalk_1.default.bold('Validating Code Quality...'));
    let hasError = false;
    if (options.lint !== false) {
        try {
            await (0, utils_1.runCommandWithStream)('npm run lint', 'Linting code');
        }
        catch (e) {
            hasError = true;
        }
    }
    if (options.types !== false) {
        try {
            await (0, utils_1.runCommandWithStream)('npm run typecheck', 'Checking types');
        }
        catch (e) {
            hasError = true;
        }
    }
    if (options.security !== false) {
        try {
            console.log(chalk_1.default.blue('\n> Running security scan...'));
            // Check for gitleaks or trivy
            await (0, utils_1.runCommandWithStream)('npm audit', 'Dependency Audit');
            // Check if gitleaks is installed
            try {
                await (0, utils_1.execAsync)('gitleaks version');
                await (0, utils_1.runCommandWithStream)('gitleaks detect --no-git --verbose', 'Secret Scanning (Gitleaks)');
            }
            catch (e) {
                console.log(chalk_1.default.yellow('ℹ Gitleaks not found, skipping secret scan.'));
            }
        }
        catch (e) {
            hasError = true;
        }
    }
    if (hasError) {
        console.error(chalk_1.default.red('\nChecks failed. See output above for details.'));
        process.exit(1);
    }
    else {
        console.log(chalk_1.default.green('\nAll checks passed!'));
    }
};
exports.checkAction = checkAction;
exports.checkCommand = new commander_1.Command('check')
    .description('Validate code quality')
    .option('--no-lint', 'Skip linting')
    .option('--no-types', 'Skip type checking')
    .option('--no-security', 'Skip security scan')
    .action(exports.checkAction);
exports.checkCommand.addCommand(ai_maturity_1.aiMaturityCommand);
exports.checkCommand.addCommand(modality_fit_1.modalityFitCommand);
