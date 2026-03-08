"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPlugin = testPlugin;
const child_process_1 = require("child_process");
const chalk_1 = __importDefault(require("chalk"));
async function testPlugin(options) {
    console.log(chalk_1.default.blue('Running tests...'));
    const args = ['test'];
    if (options.coverage) {
        args.push('--coverage');
    }
    const jest = (0, child_process_1.spawn)('npx', ['jest', ...args], {
        stdio: 'inherit',
        shell: true,
    });
    jest.on('close', (code) => {
        if (code === 0) {
            console.log(chalk_1.default.green('Tests passed!'));
        }
        else {
            console.log(chalk_1.default.red('Tests failed'));
            process.exit(code || 1);
        }
    });
}
