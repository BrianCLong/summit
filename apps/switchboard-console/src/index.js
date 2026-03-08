#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const node_path_1 = __importDefault(require("node:path"));
const node_readline_1 = __importDefault(require("node:readline"));
const ConsoleSession_js_1 = require("./session/ConsoleSession.js");
const loader_js_1 = require("./registry/loader.js");
const validator_js_1 = require("./registry/validator.js");
const program = new commander_1.Command();
program
    .name('switchboard')
    .description('Summit Switchboard CLI')
    .version('0.1.0');
const registryCmd = program.command('registry').description('Manage tool/server registries');
registryCmd
    .command('validate')
    .description('Validate a registry file or directory')
    .requiredOption('--registry <path>', 'path to registry file or directory')
    .action(async (options) => {
    try {
        const sources = await (0, loader_js_1.loadRegistrySources)(options.registry);
        const result = (0, validator_js_1.validateRegistrySources)(sources);
        if (result.valid) {
            process.stdout.write('PASS\n');
            process.stdout.write(`Tools: ${result.stats.tools}\n`);
            process.stdout.write(`Servers: ${result.stats.servers}\n`);
            process.exit(0);
        }
        else {
            process.stdout.write('FAIL\n');
            const maxErrors = 5;
            const firstN = result.errors.slice(0, maxErrors);
            for (const error of firstN) {
                const fileInfo = error.file ? `[${node_path_1.default.basename(error.file)}] ` : '';
                process.stderr.write(`${fileInfo}${error.path}: ${error.message}\n`);
                if (error.hint) {
                    process.stderr.write(`  Hint: ${error.hint}\n`);
                }
            }
            if (result.errors.length > maxErrors) {
                process.stdout.write(`+${result.errors.length - maxErrors} more errors\n`);
            }
            process.exit(2);
        }
    }
    catch (error) {
        process.stderr.write(`IO/Runtime Error: ${error.message}\n`);
        process.exit(1);
    }
});
program
    .command('repl', { isDefault: true })
    .description('Start the Switchboard REPL (default)')
    .option('--resume <id>', 'resume session by ID')
    .action(async (options) => {
    const resumeId = options.resume;
    const sessionRoot = node_path_1.default.join(process.cwd(), '.summit', 'switchboard', 'sessions');
    const skillsetDir = node_path_1.default.join(process.cwd(), '.summit', 'skillsets');
    const session = new ConsoleSession_js_1.ConsoleSession({
        sessionRoot,
        skillsetDir,
        sessionId: resumeId,
    });
    await session.init(Boolean(resumeId));
    const rl = node_readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'switchboard> ',
    });
    const handleLine = async (line) => {
        try {
            const response = await session.handleInput(line);
            if (response) {
                process.stdout.write(`${response}\n`);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            process.stdout.write(`Error: ${message}\n`);
        }
        finally {
            rl.prompt();
        }
    };
    process.stdout.write(`Session ${session.id} ready. Type /exit to end.\n`);
    rl.prompt();
    rl.on('line', (line) => {
        void handleLine(line);
    });
    rl.on('close', async () => {
        await session.end();
        process.exit(0);
    });
});
program.parse(process.argv);
