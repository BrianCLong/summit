"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultBus = exports.runWorkflow = exports.ToolBus = void 0;
const path_1 = __importDefault(require("path"));
const evidence_js_1 = require("./evidence.js");
const policy_js_1 = require("./policy.js");
class ToolBus {
    options;
    registry = {};
    policy;
    constructor(options) {
        this.options = options;
        this.policy = options.policyEngine ?? new policy_js_1.BasicPolicyEngine(options.policyConfig);
    }
    register(tool) {
        this.registry[tool.name] = tool;
    }
    listTools() {
        return Object.values(this.registry).map((tool) => ({ name: tool.name, version: tool.version, description: tool.description }));
    }
    async execute(toolName, inputs, evidence, stepName) {
        const tool = this.registry[toolName];
        if (!tool) {
            return { decision: { allowed: false, reason: 'Unknown tool', policyVersion: '1.0.0' }, status: 'denied', message: 'Tool not registered' };
        }
        const target = typeof inputs.url === 'string' ? inputs.url : typeof inputs.domain === 'string' ? inputs.domain : undefined;
        const decision = this.policy.evaluate({ tool: toolName, target, labMode: this.options.labMode });
        if (!decision.allowed) {
            const artifact = evidence.record(stepName, tool.name, tool.version, inputs, { denied: true }, decision, decision.reason);
            return { decision, artifactId: artifact.id, status: 'denied', message: decision.reason };
        }
        try {
            const result = await tool.execute(inputs, {
                labMode: this.options.labMode,
                dryRun: this.options.dryRun,
                boundary: this.options.boundary,
                evidenceRoot: evidence.runPath,
                policyDecision: decision,
                timeoutMs: this.options.timeoutMs ?? this.options.policyConfig.defaultTimeoutMs ?? 5000,
            });
            const artifact = evidence.record(stepName, tool.name, tool.version, inputs, result.output, decision, result.notes);
            return { decision, artifactId: artifact.id, status: 'allowed', message: 'Completed' };
        }
        catch (err) {
            const artifact = evidence.record(stepName, tool.name, tool.version, inputs, { error: err?.message ?? String(err) }, decision);
            return { decision, artifactId: artifact.id, status: 'error', message: err?.message ?? String(err) };
        }
    }
}
exports.ToolBus = ToolBus;
const runWorkflow = async (options) => {
    const { workflow, bus, evidence, workflowPath, targets } = options;
    evidence.init();
    const startedAt = new Date().toISOString();
    const stepsSummary = [];
    const runTargets = targets && targets.length > 0 ? targets : [''];
    for (const target of runTargets) {
        for (const step of workflow.steps) {
            const inputs = { ...(step.inputs ?? {}) };
            if (target) {
                if (inputs.url === '{{target}}') {
                    inputs.url = target;
                }
                if (inputs.domain === '{{target}}') {
                    inputs.domain = target;
                }
                if (!inputs.url && !inputs.domain) {
                    inputs.target = target;
                }
            }
            const result = await bus.execute(step.tool, inputs, evidence, step.name);
            stepsSummary.push({
                name: target ? `${step.name} (${target})` : step.name,
                tool: step.tool,
                status: result.status,
                message: result.message,
                evidenceId: result.artifactId,
            });
        }
    }
    const finishedAt = new Date().toISOString();
    const summary = {
        runId: path_1.default.basename(evidence.runPath),
        workflow: workflowPath,
        startedAt,
        finishedAt,
        steps: stepsSummary,
        objectives: workflow.objectives,
        expect: workflow.expect,
        policyVersion: '1.0.0',
    };
    evidence.writeRunSummary(summary);
    const reportLines = [
        `# Agent Lab Run Report`,
        `- Workflow: ${workflow.name}`,
        `- Run ID: ${summary.runId}`,
        `- Started: ${startedAt}`,
        `- Finished: ${finishedAt}`,
        '',
        '## Steps',
        ...stepsSummary.map((s) => `- [${s.status}] ${s.name} via ${s.tool} (evidence ${s.evidenceId ?? 'n/a'}): ${s.message}`),
    ];
    evidence.writeReport(reportLines.join('\n'));
    return summary;
};
exports.runWorkflow = runWorkflow;
const createDefaultBus = (workflow, runId, boundary, artifactsDir, tools, dryRun, labMode) => {
    const policyConfig = {
        allowedTools: tools.map((t) => t.name),
        targetAllowlist: workflow.policy?.targetAllowlist ?? ['example.com', 'example.org', 'localhost'],
        commandAllowlist: workflow.policy?.commandAllowlist,
        defaultTimeoutMs: workflow.policy?.defaultTimeoutMs ?? 5000,
        rateLimit: { maxCalls: 50, intervalMs: 60000 },
    };
    const bus = new ToolBus({
        baseArtifactsDir: artifactsDir,
        boundary,
        policyConfig,
        dryRun,
        labMode,
    });
    tools.forEach((tool) => bus.register(tool));
    const evidence = new evidence_js_1.EvidenceStore(path_1.default.join(artifactsDir, 'runs'), boundary, runId);
    return { bus, evidence };
};
exports.createDefaultBus = createDefaultBus;
