#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fast_glob_1 = __importDefault(require("fast-glob"));
const chalk_1 = __importDefault(require("chalk"));
const parse_1 = require("./parse");
const program = new commander_1.Command();
program
    .name('configguard')
    .description('Validate configuration files using JSON Schema with env interpolation support.')
    .option('--schema <path>', 'Path to JSON Schema document for validation')
    .option('--dir <path>', 'Directory containing configuration files', '.')
    .option('--format <format>', 'Output format (text|json)', 'text')
    .option('--enforce <mode>', 'Severity mode: warn (default) or fail', 'warn')
    .option('--allow-env <list>', 'Comma separated allow list of environment variables')
    .option('--deny-env <list>', 'Comma separated deny list of environment variables')
    .option('--defaults <list>', 'Comma separated KEY=VALUE defaults for missing environment variables')
    .action(run);
program.parseAsync().catch((error) => {
    console.error(chalk_1.default.red(`configguard: ${error.message}`));
    process.exitCode = 2;
});
async function run(options) {
    if (!options.schema) {
        console.error(chalk_1.default.red('Missing required option --schema <path>'));
        process.exitCode = 2;
        return;
    }
    const patterns = ['**/*.yml', '**/*.yaml', '**/*.json'];
    const entries = await (0, fast_glob_1.default)(patterns, {
        cwd: options.dir,
        absolute: true,
        dot: false,
    });
    if (!entries.length) {
        console.warn(chalk_1.default.yellow(`No configuration files found in ${options.dir}`));
        return;
    }
    const policy = buildPolicy(options);
    const allDiagnostics = [];
    for (const file of entries) {
        const result = (0, parse_1.loadConfig)(file, options.schema, {
            interpolation: policy,
            strict: false,
        });
        const errors = result.diagnostics.filter((d) => d.severity === 'error');
        const warnings = result.diagnostics.filter((d) => d.severity === 'warning');
        if (options.format === 'json') {
            allDiagnostics.push(...result.diagnostics.map((diag) => ({
                file,
                ...diag,
            })));
        }
        else {
            if (!result.diagnostics.length) {
                console.log(chalk_1.default.green(`✔ ${file}`));
            }
            else {
                for (const diag of result.diagnostics) {
                    const color = diag.severity === 'error' ? chalk_1.default.red : chalk_1.default.yellow;
                    const position = diag.line && diag.column ? `${diag.line}:${diag.column}` : '';
                    console.log(color(`${diag.severity.toUpperCase()} ${file}${position ? `:${position}` : ''} ${diag.message}`));
                    if (diag.hint) {
                        console.log(color(`  hint: ${diag.hint}`));
                    }
                }
            }
        }
        if (options.enforce === 'fail' && errors.length) {
            process.exitCode = 1;
        }
        else if (!process.exitCode && errors.length) {
            process.exitCode = 0;
        }
        if (!process.exitCode && warnings.length && options.enforce === 'warn') {
            process.exitCode = 0;
        }
    }
    if (options.format === 'json') {
        console.log(JSON.stringify({ diagnostics: allDiagnostics }, null, 2));
        if (options.enforce === 'fail' &&
            allDiagnostics.some((d) => d.severity === 'error')) {
            process.exitCode = 1;
        }
    }
}
function buildPolicy(options) {
    const policy = {};
    if (options.allowEnv) {
        policy.allowList = splitList(options.allowEnv);
        policy.requireAllowList = true;
    }
    if (options.denyEnv) {
        policy.denyList = splitList(options.denyEnv);
    }
    if (options.defaults) {
        policy.defaults = Object.fromEntries(splitList(options.defaults).map((entry) => {
            const [key, ...rest] = entry.split('=');
            return [key, rest.join('=')];
        }));
    }
    return policy;
}
function splitList(value) {
    return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
}
