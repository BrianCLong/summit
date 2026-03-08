"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubprocessRunner = void 0;
const node_child_process_1 = require("node:child_process");
/**
 * Subprocess runner for Python and Go benchmarks
 *
 * Executes benchmarks in separate processes and parses JSON output
 */
class SubprocessRunner {
    options;
    constructor(options) {
        this.options = {
            timeout: 60000,
            ...options,
        };
    }
    /**
     * Run the subprocess benchmark
     */
    async run() {
        return new Promise((resolve, reject) => {
            const { command, args = [], cwd, env, timeout } = this.options;
            const child = (0, node_child_process_1.spawn)(command, args, {
                cwd,
                env: { ...process.env, ...env },
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            const timer = setTimeout(() => {
                child.kill('SIGTERM');
                reject(new Error(`Subprocess timed out after ${timeout}ms`));
            }, timeout);
            child.on('close', (code) => {
                clearTimeout(timer);
                if (code !== 0) {
                    reject(new Error(`Subprocess exited with code ${code}: ${stderr}`));
                    return;
                }
                try {
                    // Parse JSON results from stdout
                    const results = JSON.parse(stdout);
                    resolve(results);
                }
                catch (error) {
                    reject(new Error(`Failed to parse benchmark results: ${error}`));
                }
            });
            child.on('error', (error) => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }
    /**
     * Create a Python benchmark runner
     */
    static python(scriptPath, options) {
        return new SubprocessRunner({
            command: 'python',
            args: [scriptPath, '--output', 'json'],
            ...options,
        });
    }
    /**
     * Create a Go benchmark runner
     */
    static go(binaryPath, options) {
        return new SubprocessRunner({
            command: binaryPath,
            args: ['--output', 'json'],
            ...options,
        });
    }
}
exports.SubprocessRunner = SubprocessRunner;
