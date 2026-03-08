"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FoundryRunner = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
class FoundryRunner {
    options;
    state;
    constructor(options) {
        this.options = options;
        this.state = {
            iteration: 0,
            completed: false,
            status: 'running',
            logs: [],
        };
    }
    async run() {
        const cwd = this.options.cwd || process.cwd();
        const stateFile = path_1.default.join(cwd, 'run_state.json');
        console.log(chalk_1.default.blue(`Foundry Loop started in ${cwd}`));
        console.log(chalk_1.default.dim(`Prompt: ${this.options.prompt}`));
        console.log(chalk_1.default.dim(`Promise Token: ${this.options.completionPromise}`));
        while (this.state.iteration < this.options.maxIterations && !this.state.completed) {
            this.state.iteration++;
            console.log(chalk_1.default.yellow(`\nIteration ${this.state.iteration}/${this.options.maxIterations}`));
            // Simulate agent work (for skeleton)
            this.state.logs.push(`Iteration ${this.state.iteration}: running...`);
            // Check for completion promise
            const isComplete = this.checkCompletion(cwd);
            if (isComplete) {
                if (this.state.iteration >= (this.options.minIterations || 0)) {
                    this.state.completed = true;
                    this.state.status = 'completed';
                    console.log(chalk_1.default.green('Completion promise found! Stopping loop.'));
                }
                else {
                    console.log(chalk_1.default.yellow(`Completion found but min iterations (${this.options.minIterations}) not met. Continuing...`));
                }
            }
            await this.saveState(stateFile);
            if (this.state.completed)
                break;
            // Simulate delay or work
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        if (!this.state.completed) {
            this.state.status = 'stopped';
            console.log(chalk_1.default.red('Max iterations reached.'));
        }
        await this.saveState(stateFile);
        return this.state;
    }
    checkCompletion(cwd) {
        const promiseFile = path_1.default.join(cwd, 'PROMISE');
        if (fs_1.default.existsSync(promiseFile)) {
            const content = fs_1.default.readFileSync(promiseFile, 'utf-8');
            return content.includes(this.options.completionPromise);
        }
        return false;
    }
    async saveState(filepath) {
        fs_1.default.writeFileSync(filepath, JSON.stringify(this.state, null, 2));
    }
}
exports.FoundryRunner = FoundryRunner;
