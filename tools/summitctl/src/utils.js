"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execAsync = void 0;
exports.runCommand = runCommand;
exports.runCommandWithStream = runCommandWithStream;
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
exports.execAsync = util_1.default.promisify(child_process_1.exec);
async function runCommand(command, description) {
    const spinner = (0, ora_1.default)(description).start();
    try {
        const { stdout } = await (0, exports.execAsync)(command);
        spinner.succeed();
        return stdout;
    }
    catch (error) {
        spinner.fail();
        console.error(chalk_1.default.red(`Command failed: ${command}`));
        console.error(chalk_1.default.red(error.message));
        if (error.stdout)
            console.log(error.stdout);
        if (error.stderr)
            console.error(error.stderr);
        throw error;
    }
}
async function runCommandWithStream(command, description) {
    console.log(chalk_1.default.blue(`\n> ${description}...`));
    return new Promise((resolve, reject) => {
        const child = (0, child_process_1.exec)(command);
        child.stdout?.on('data', (data) => {
            process.stdout.write(data);
        });
        child.stderr?.on('data', (data) => {
            process.stderr.write(data);
        });
        child.on('close', (code) => {
            if (code === 0) {
                console.log(chalk_1.default.green(`✓ ${description} completed`));
                resolve();
            }
            else {
                console.error(chalk_1.default.red(`✗ ${description} failed with code ${code}`));
                reject(new Error(`Command failed with code ${code}`));
            }
        });
    });
}
