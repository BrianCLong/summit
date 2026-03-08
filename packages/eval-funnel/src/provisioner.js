"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiEvalProvisioner = exports.ShellProvisioningExecutor = void 0;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_util_1 = require("node:util");
const execAsync = (0, node_util_1.promisify)(node_child_process_1.exec);
class ShellProvisioningExecutor {
    async execute(command, env = {}, cwd) {
        const { stdout, stderr } = await execAsync(command, { env: { ...process.env, ...env }, cwd });
        return { stdout, stderr };
    }
}
exports.ShellProvisioningExecutor = ShellProvisioningExecutor;
class MultiEvalProvisioner {
    executor;
    constructor(executor) {
        this.executor = executor ?? new ShellProvisioningExecutor();
    }
    async provision(customers, template, options = {}) {
        if (customers.length === 0) {
            return [];
        }
        const concurrency = Math.max(1, options.concurrency ?? 4);
        const baseNamespace = options.baseNamespace ?? 'eval';
        const workingDirectory = (0, node_path_1.resolve)(options.workingDirectory ?? process.cwd());
        const artifactRoot = (0, node_path_1.resolve)(options.artifactRoot ?? (0, node_path_1.join)(workingDirectory, 'eval-artifacts'));
        (0, node_fs_1.mkdirSync)(artifactRoot, { recursive: true });
        const queue = [...customers];
        const active = [];
        const results = [];
        const runNext = async () => {
            const next = queue.shift();
            if (!next)
                return;
            const envName = `${baseNamespace}-${next.id}`;
            const startedAt = Date.now();
            const artifactsPath = (0, node_path_1.join)(artifactRoot, envName);
            (0, node_fs_1.mkdirSync)(artifactsPath, { recursive: true });
            const command = this.interpolate(template.command, next.templateValues, envName);
            const envVars = { ...template.environment, ...next.templateValues, ENVIRONMENT_NAME: envName };
            let status = 'succeeded';
            let stdout = '';
            let stderr = '';
            if (options.dryRun) {
                stdout = `[dry-run] ${command}`;
            }
            else {
                try {
                    const output = await this.executor.execute(command, envVars, workingDirectory);
                    stdout = output.stdout;
                    stderr = output.stderr;
                }
                catch (error) {
                    status = 'failed';
                    stderr = error.message;
                }
            }
            const finishedAt = Date.now();
            const result = {
                customerId: next.id,
                environmentName: envName,
                startedAt,
                finishedAt,
                status,
                stdout,
                stderr,
                artifactsPath,
            };
            (0, node_fs_1.writeFileSync)((0, node_path_1.join)(artifactsPath, 'provisioning.json'), JSON.stringify(result, null, 2), 'utf8');
            results.push(result);
            await runNext();
        };
        while (active.length < concurrency && queue.length > 0) {
            const task = runNext();
            active.push(task);
        }
        await Promise.all(active);
        return results;
    }
    interpolate(command, values, envName) {
        return command
            .replace(/\{\{env\}\}/g, envName)
            .replace(/\{\{([a-zA-Z0-9_\-]+)\}\}/g, (_, key) => values[key] ?? '');
    }
}
exports.MultiEvalProvisioner = MultiEvalProvisioner;
