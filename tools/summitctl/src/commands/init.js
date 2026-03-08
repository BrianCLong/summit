"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const utils_1 = require("../utils");
exports.initCommand = new commander_1.Command('init')
    .description('Scaffold dev environment')
    .option('--full', 'Run full setup including smoke tests')
    .option('--start', 'Start services after bootstrap')
    .action(async (options) => {
    console.log(chalk_1.default.bold('Initializing Development Environment...'));
    try {
        // 1. Bootstrap
        await (0, utils_1.runCommandWithStream)('make bootstrap', 'Bootstrapping dependencies and environment');
        // 2. Start services (if requested or full)
        if (options.start || options.full) {
            await (0, utils_1.runCommandWithStream)('make up', 'Starting services');
        }
        // 3. Smoke Test (if full)
        if (options.full) {
            await (0, utils_1.runCommandWithStream)('make smoke', 'Running smoke tests');
        }
        console.log(chalk_1.default.green('\nDevelopment environment initialized successfully!'));
        console.log(chalk_1.default.blue('You can now run:'));
        console.log(chalk_1.default.white('  summitctl test      # Run tests'));
        console.log(chalk_1.default.white('  summitctl check     # Validate code'));
    }
    catch (error) {
        console.error(chalk_1.default.red('\nInit failed. Please check the logs above.'));
        process.exit(1);
    }
});
