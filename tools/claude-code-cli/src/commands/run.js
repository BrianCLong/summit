"use strict";
/**
 * Run Command
 *
 * Execute a Claude Code agent task with deterministic behavior.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRunCommand = registerRunCommand;
const glob_1 = require("glob");
const env_js_1 = require("../utils/env.js");
const output_js_1 = require("../utils/output.js");
/**
 * Analyze a directory and return deterministic file listing
 */
async function analyzeDirectory(root) {
    const files = await (0, glob_1.glob)('**/*', {
        cwd: root,
        nodir: true,
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'coverage/**'],
    });
    const directories = await (0, glob_1.glob)('**/', {
        cwd: root,
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'coverage/**'],
    });
    // Sort for deterministic output
    const sortedFiles = (0, env_js_1.deterministicSort)(files);
    const sortedDirs = (0, env_js_1.deterministicSort)(directories);
    return {
        root,
        files: sortedFiles,
        fileCount: sortedFiles.length,
        directories: sortedDirs,
        directoryCount: sortedDirs.length,
    };
}
/**
 * Register the run command
 */
function registerRunCommand(program) {
    program
        .command('run')
        .description('Execute a Claude Code task')
        .argument('[task]', 'Task to execute (analyze, etc.)', 'analyze')
        .argument('[path]', 'Path to operate on', '.')
        .action(async (task, path, _options, cmd) => {
        const startTime = Date.now();
        const globalOpts = cmd.optsWithGlobals();
        const normalizedEnv = (0, env_js_1.getNormalizedEnv)({ tz: globalOpts.tz, locale: globalOpts.locale });
        const diagnostics = [];
        let status = 'success';
        let result;
        try {
            switch (task) {
                case 'analyze': {
                    (0, output_js_1.log)(`Analyzing ${path}...`, 'info');
                    result = await analyzeDirectory(path);
                    (0, output_js_1.log)(`Found ${result.fileCount} files`, 'info');
                    break;
                }
                default: {
                    status = 'error';
                    diagnostics.push({
                        level: 'error',
                        message: `Unknown task: ${task}`,
                        code: 'UNKNOWN_TASK',
                    });
                }
            }
        }
        catch (err) {
            status = 'error';
            diagnostics.push({
                level: 'error',
                message: err instanceof Error ? err.message : String(err),
                code: 'EXECUTION_ERROR',
            });
        }
        const output = (0, output_js_1.buildJsonOutput)(`run ${task}`, [path], normalizedEnv, status, result, diagnostics, startTime);
        (0, output_js_1.outputResult)(output);
        if (status === 'error') {
            process.exit(2);
        }
    });
}
