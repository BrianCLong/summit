"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.foundryCommands = void 0;
const commander_1 = require("commander");
const foundry_1 = require("@summit/foundry");
const chalk_1 = __importDefault(require("chalk"));
exports.foundryCommands = {
    loop: new commander_1.Command('loop')
        .description('Run an agent loop')
        .argument('<prompt>', 'The prompt for the agent')
        .option('--model <name>', 'Model to use')
        .option('--min-iterations <number>', 'Minimum number of iterations', '0')
        .option('-m, --max-iterations <number>', 'Maximum number of iterations', '10')
        .option('-p, --promise <token>', 'Completion promise token', '<promise>COMPLETE</promise>')
        .option('--agent <name>', 'Agent to use', 'mock')
        .action(async (prompt, options) => {
        console.log(chalk_1.default.bold('Starting Foundry Loop...'));
        const runOptions = {
            prompt,
            model: options.model,
            minIterations: parseInt(options.minIterations, 10),
            maxIterations: parseInt(options.maxIterations, 10),
            completionPromise: options.promise,
            agent: options.agent,
            cwd: process.cwd()
        };
        const runner = new foundry_1.FoundryRunner(runOptions);
        try {
            const result = await runner.run();
            console.log(chalk_1.default.bold(`Loop finished with status: ${result.status}`));
            if (result.status === 'completed') {
                process.exit(0);
            }
            else {
                process.exit(1);
            }
        }
        catch (error) {
            console.error(chalk_1.default.red('Error running loop:'), error);
            process.exit(1);
        }
    }),
};
