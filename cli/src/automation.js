"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTOMATION_WORKFLOWS = void 0;
exports.runAutomationWorkflow = runAutomationWorkflow;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const defaultRunner = async (command, cwd) => {
    try {
        const { stdout, stderr } = await execAsync(command, {
            cwd,
            env: { ...process.env, FORCE_COLOR: '0' },
            shell: '/bin/bash',
        });
        return {
            stdout,
            stderr,
            exitCode: 0,
        };
    }
    catch (error) {
        return {
            stdout: error?.stdout ?? '',
            stderr: error?.stderr ?? (error instanceof Error ? error.message : ''),
            exitCode: typeof error?.code === 'number' ? error.code : 1,
        };
    }
};
exports.AUTOMATION_WORKFLOWS = {
    init: [
        {
            name: 'bootstrap',
            command: 'make bootstrap',
            description: 'Install dependencies, prepare .env, and prime tooling',
        },
        {
            name: 'bring-up-stack',
            command: 'make up',
            description: 'Start local development stack (Docker compose)',
        },
    ],
    check: [
        {
            name: 'lint',
            command: 'npm run lint',
            description: 'Run lint + formatting checks across the workspace',
        },
        {
            name: 'typecheck',
            command: 'npm run typecheck',
            description: 'Type-check the monorepo (tsc -b)',
        },
    ],
    test: [
        {
            name: 'unit-and-integration',
            command: 'npm test -- --runInBand',
            description: 'Execute unit/integration test suites',
        },
    ],
    'release-dry-run': [
        {
            name: 'changeset-status',
            command: 'npx changeset status --output=.changeset-status.json',
            description: 'Summarize pending release changes without mutating versions',
        },
        {
            name: 'semantic-release-dry-run',
            command: 'npm run release -- --dry-run',
            description: 'Validate release pipeline without publishing artifacts',
        },
    ],
};
async function runAutomationWorkflow(workflow, options = {}) {
    const steps = exports.AUTOMATION_WORKFLOWS[workflow];
    if (!steps) {
        throw new Error(`Unknown workflow: ${workflow}`);
    }
    const results = [];
    const startedAt = new Date();
    for (const step of steps) {
        const stepStart = Date.now();
        const runner = options.runner ?? defaultRunner;
        const { stdout, stderr, exitCode } = await runner(step.command, options.cwd);
        const finishedAt = new Date();
        results.push({
            ...step,
            status: exitCode === 0 ? 'success' : 'failed',
            exitCode,
            stdout: stdout ?? '',
            stderr: stderr ?? '',
            startedAt: new Date(stepStart).toISOString(),
            finishedAt: finishedAt.toISOString(),
            durationMs: finishedAt.getTime() - stepStart,
        });
    }
    const finishedAt = new Date();
    const successCount = results.filter((r) => r.status === 'success').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;
    return {
        workflow,
        results,
        summary: {
            total: results.length,
            successCount,
            failedCount,
            durationMs: finishedAt.getTime() - startedAt.getTime(),
            startedAt: startedAt.toISOString(),
            finishedAt: finishedAt.toISOString(),
        },
    };
}
