#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const contentBoundary_js_1 = require("./contentBoundary.js");
const judge_js_1 = require("./judge.js");
const toolBus_js_1 = require("./toolBus.js");
const tools_js_1 = require("./tools.js");
const workflowSpec_js_1 = require("./workflowSpec.js");
const usage = () => {
    console.log(`Agent Lab CLI
Usage:
  agent-lab run --workflow <path> [--targets <file|csv>] [--lab] [--dry-run]
  agent-lab judge --run <runId>
  agent-lab tools list
  agent-lab workflows validate <path>
`);
};
const argValue = (flag) => {
    const idx = process.argv.indexOf(flag);
    if (idx >= 0) {
        return process.argv[idx + 1];
    }
    return undefined;
};
const loadTargets = (input) => {
    if (!input)
        return undefined;
    const resolved = path_1.default.resolve(input);
    if (fs_1.default.existsSync(resolved)) {
        return fs_1.default
            .readFileSync(resolved, 'utf-8')
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
    }
    return input.split(',').map((t) => t.trim()).filter(Boolean);
};
const artifactsBase = path_1.default.join(process.cwd(), 'artifacts', 'agent-lab');
const ensureDir = (dir) => {
    fs_1.default.mkdirSync(dir, { recursive: true });
};
const command = process.argv[2];
(async () => {
    if (!command) {
        usage();
        return;
    }
    switch (command) {
        case 'run': {
            const workflowPath = argValue('--workflow');
            if (!workflowPath) {
                console.error('--workflow is required');
                process.exit(1);
            }
            const targets = loadTargets(argValue('--targets'));
            const labMode = process.argv.includes('--lab');
            const dryRun = process.argv.includes('--dry-run') || !labMode;
            const runId = argValue('--run-id') ?? crypto_1.default.randomUUID();
            const workflow = (0, workflowSpec_js_1.loadWorkflowSpec)(workflowPath);
            const boundary = new contentBoundary_js_1.ContentBoundary();
            ensureDir(artifactsBase);
            const tools = (0, tools_js_1.builtInTools)(artifactsBase);
            const { bus, evidence } = (0, toolBus_js_1.createDefaultBus)(workflow, runId, boundary, artifactsBase, tools, dryRun, labMode);
            const summary = await (0, toolBus_js_1.runWorkflow)({ workflow, bus, evidence, workflowPath, targets });
            const judged = (0, judge_js_1.judgeRun)(summary);
            evidence.writeJudge(judged.scores, judged.markdown);
            console.log(`Run complete. Evidence stored at ${evidence.runPath}`);
            return;
        }
        case 'judge': {
            const runId = argValue('--run');
            if (!runId) {
                console.error('--run is required');
                process.exit(1);
            }
            const runPath = path_1.default.join(artifactsBase, 'runs', runId, 'run.json');
            if (!fs_1.default.existsSync(runPath)) {
                console.error(`Run ${runId} not found at ${runPath}`);
                process.exit(1);
            }
            const summary = JSON.parse(fs_1.default.readFileSync(runPath, 'utf-8'));
            const evidenceDir = path_1.default.dirname(path_1.default.dirname(runPath));
            const dummyEvidence = { writeJudge: (judge, markdown) => {
                    fs_1.default.writeFileSync(path_1.default.join(evidenceDir, 'judge.json'), JSON.stringify(judge));
                    fs_1.default.writeFileSync(path_1.default.join(evidenceDir, 'judge.md'), markdown);
                    return {};
                } };
            const judged = (0, judge_js_1.judgeRun)(summary);
            dummyEvidence.writeJudge(judged.scores, judged.markdown);
            console.log(`Judged run ${runId}`);
            return;
        }
        case 'tools': {
            const tools = (0, tools_js_1.builtInTools)(artifactsBase);
            if (process.argv[3] === 'list') {
                tools.forEach((tool) => {
                    console.log(`${tool.name}@${tool.version} - ${tool.description}`);
                });
                return;
            }
            usage();
            return;
        }
        case 'workflows': {
            if (process.argv[3] === 'validate') {
                const wfPath = process.argv[4];
                if (!wfPath) {
                    console.error('Provide a workflow path to validate.');
                    process.exit(1);
                }
                const spec = (0, workflowSpec_js_1.loadWorkflowSpec)(wfPath);
                console.log(`Workflow ${spec.name} is valid.`);
                return;
            }
            usage();
            return;
        }
        default:
            usage();
    }
})();
