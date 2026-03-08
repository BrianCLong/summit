"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testCommand = exports.testAction = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const utils_1 = require("../utils");
const testAction = async (options) => {
    // Logic:
    // If --all is passed, run everything.
    // If specific flags are passed, run only those.
    // If NO flags are passed, run everything (default behavior).
    const hasSpecificFlag = options.unit || options.integration || options.e2e || options.smoke;
    const runAll = options.all || !hasSpecificFlag;
    console.log(chalk_1.default.bold('Running Tests...'));
    let hasError = false;
    if (runAll || options.unit) {
        try {
            await (0, utils_1.runCommandWithStream)('npm run test:unit', 'Unit Tests');
        }
        catch (e) {
            hasError = true;
        }
    }
    if (runAll || options.integration) {
        try {
            await (0, utils_1.runCommandWithStream)('npm run test:integration', 'Integration Tests');
        }
        catch (e) {
            hasError = true;
        }
    }
    if (runAll || options.smoke) {
        try {
            await (0, utils_1.runCommandWithStream)('make smoke', 'Smoke Tests');
        }
        catch (e) {
            hasError = true;
        }
    }
    if (runAll || options.e2e) {
        try {
            await (0, utils_1.runCommandWithStream)('npm run test:e2e', 'E2E Tests');
        }
        catch (e) {
            hasError = true;
        }
    }
    if (hasError) {
        console.error(chalk_1.default.red('\nSome tests failed.'));
        process.exit(1);
    }
    else {
        console.log(chalk_1.default.green('\nAll executed test suites passed!'));
    }
};
exports.testAction = testAction;
exports.testCommand = new commander_1.Command('test')
    .description('Run tests')
    .option('--unit', 'Run unit tests')
    .option('--integration', 'Run integration tests')
    .option('--e2e', 'Run E2E tests')
    .option('--smoke', 'Run smoke tests')
    .option('--all', 'Run all tests')
    .action(exports.testAction);
