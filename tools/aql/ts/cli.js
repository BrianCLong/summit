"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const execa_1 = require("execa");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const program = new commander_1.Command();
program
    .name('aql')
    .description('TypeScript CLI for the Summit Audit Query Language (AQL) engine')
    .option('-q, --query <query>', 'Inline AQL query to execute')
    .option('-f, --file <file>', 'Path to file containing an AQL query')
    .option('-F, --fixtures <dir>', 'Fixture directory for connectors', 'fixtures')
    .option('-c, --compiler <path>', 'Path to the compiled aqlc binary')
    .option('--verify <file>', 'Replay provenance against a saved execution result')
    .option('-o, --output <file>', 'Write the compiler JSON output to file')
    .option('--json', 'Emit raw JSON to stdout')
    .option('--show-trace', 'Render execution trace steps');
program.action(async (options) => {
    if (!options.query && !options.file) {
        program.error('Specify either --query or --file');
    }
    const compiler = resolveCompiler(options.compiler);
    const args = buildCompilerArgs(compiler, options);
    try {
        const { stdout } = await runCompiler(compiler, args);
        if (options.output) {
            node_fs_1.default.writeFileSync(options.output, stdout, 'utf8');
        }
        if (options.json) {
            process.stdout.write(`${stdout}\n`);
            return;
        }
        const parsed = JSON.parse(stdout);
        renderResult(parsed, options.showTrace ?? false);
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(chalk_1.default.red(`aql execution failed: ${error.message}`));
        }
        else {
            console.error(chalk_1.default.red('aql execution failed'));
        }
        process.exitCode = 1;
    }
});
program.parseAsync(process.argv);
function resolveCompiler(override) {
    if (override) {
        return override;
    }
    const envPath = process.env.AQLC_PATH;
    if (envPath) {
        return envPath;
    }
    const local = node_path_1.default.join(process.cwd(), 'target', 'release', 'aqlc');
    if (node_fs_1.default.existsSync(local)) {
        return local;
    }
    return 'cargo';
}
function buildCompilerArgs(compiler, options) {
    const baseArgs = [];
    if (options.query) {
        baseArgs.push('--query', options.query);
    }
    if (options.file) {
        baseArgs.push('--file', options.file);
    }
    baseArgs.push('--fixtures', options.fixtures);
    if (options.verify) {
        baseArgs.push('--verify', options.verify);
    }
    if (compiler === 'cargo') {
        return {
            command: 'cargo',
            args: ['run', '--quiet', '--bin', 'aqlc', '--', ...baseArgs],
        };
    }
    return { command: compiler, args: baseArgs };
}
async function runCompiler(compiler, wrapper) {
    const { command, args } = wrapper;
    return (0, execa_1.execa)(command, args, { stdout: 'pipe', stderr: 'pipe' });
}
function renderResult(result, showTrace) {
    if (!result.records.length) {
        console.log(chalk_1.default.yellow('No records matched the query.'));
        if (showTrace) {
            renderTrace(result);
        }
        return;
    }
    console.log(chalk_1.default.bold(`Matched ${result.records.length} result(s):`));
    for (const record of result.records) {
        console.log(`\n${chalk_1.default.cyan(record.subject)} ${chalk_1.default.green(record.action)} @ ${chalk_1.default.magenta(record.timestamp)}`);
        console.log(`  key: ${record.key}`);
        console.log('  connectors:');
        for (const evidence of record.evidence) {
            console.log(`    • ${evidence.connector} :: ${evidence.id} (${evidence.timestamp})`);
        }
        if (record.proofs.length) {
            console.log('  proofs:');
            for (const proof of record.proofs) {
                console.log(`    • ${proof.connector} :: ${proof.digest}`);
            }
        }
    }
    if (showTrace) {
        renderTrace(result);
    }
}
function renderTrace(result) {
    if (!result.trace || !result.trace.steps.length) {
        console.log(chalk_1.default.dim('\nNo execution trace emitted.'));
        return;
    }
    console.log(chalk_1.default.bold('\nExecution trace:'));
    for (const step of result.trace.steps) {
        console.log(`  ${chalk_1.default.blue(step.step)} — ${step.detail}`);
    }
}
