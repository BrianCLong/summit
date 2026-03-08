"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPlugin = buildPlugin;
const child_process_1 = require("child_process");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
async function buildPlugin(options) {
    const spinner = (0, ora_1.default)('Building plugin...').start();
    try {
        const args = options.watch ? ['--watch'] : [];
        const tsc = (0, child_process_1.spawn)('tsc', args, {
            stdio: 'inherit',
            shell: true,
        });
        tsc.on('close', (code) => {
            if (code === 0) {
                spinner.succeed(chalk_1.default.green('Plugin built successfully!'));
            }
            else {
                spinner.fail(chalk_1.default.red('Build failed'));
                process.exit(code || 1);
            }
        });
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Build failed'));
        throw error;
    }
}
