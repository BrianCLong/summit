"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgent = runAgent;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const hash_js_1 = require("./hash.js");
const manifest_js_1 = require("./manifest.js");
const schema_js_1 = require("./schema.js");
const stable_json_js_1 = require("./stable-json.js");
function slugify(input) {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'agent';
}
function resolveGitSha() {
    const envSha = process.env.GIT_SHA;
    if (envSha && envSha.length >= 7) {
        return envSha;
    }
    const result = (0, node_child_process_1.spawnSync)('git', ['rev-parse', '--short=12', 'HEAD'], { encoding: 'utf-8' });
    if (result.status === 0 && result.stdout.trim()) {
        return result.stdout.trim();
    }
    return 'unknown000000';
}
function resolveRepoRoot() {
    const result = (0, node_child_process_1.spawnSync)('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf-8' });
    if (result.status === 0 && result.stdout.trim()) {
        return result.stdout.trim();
    }
    return process.cwd();
}
async function runAgent(agentPath, fixturePath) {
    const manifestPath = agentPath.endsWith('.yaml') || agentPath.endsWith('.yml') || agentPath.endsWith('.json')
        ? agentPath
        : node_path_1.default.join(agentPath, 'agent.yaml');
    const { raw: manifestRaw, data: manifestData } = await (0, manifest_js_1.readManifestFile)(manifestPath);
    const manifestParse = schema_js_1.manifestSchema.safeParse(manifestData);
    if (!manifestParse.success) {
        throw new Error('Manifest validation failed. Run summit adk validate for details.');
    }
    const fixtureRaw = await promises_1.default.readFile(fixturePath, 'utf-8');
    const fixtureData = JSON.parse(fixtureRaw);
    const manifestDigest = (0, hash_js_1.hashBytes)(Buffer.from(manifestRaw));
    const fixtureDigest = (0, hash_js_1.hashBytes)(Buffer.from(fixtureRaw));
    const gitSha = resolveGitSha();
    const sha12 = gitSha.slice(0, 12);
    const agentSlug = slugify(manifestParse.data.name);
    const fixtureName = fixtureData.name || node_path_1.default.basename(fixturePath, node_path_1.default.extname(fixturePath));
    const fixtureSlug = slugify(fixtureName);
    const hashSeed = (0, stable_json_js_1.stableStringify)({
        agent: manifestParse.data.name,
        fixture: fixtureName,
        manifest: manifestDigest,
        fixtureDigest,
    });
    const hash8 = (0, hash_js_1.hashBytes)(hashSeed).slice(0, 8);
    const evidenceId = `EVI-${agentSlug}-${fixtureSlug}-${sha12}-${hash8}`;
    const outputDir = node_path_1.default.join(resolveRepoRoot(), 'artifacts', 'agent-runs', evidenceId);
    await promises_1.default.mkdir(outputDir, { recursive: true });
    const allowTools = new Set(manifestParse.data.policy?.allow_tools ?? []);
    const toolsUnsafeEnabled = process.env.S_ADK_UNSAFE_TOOLS === '1';
    const toolCalls = fixtureData.tool_calls ?? [];
    const toolEvents = [];
    let toolCallsAllowed = 0;
    let toolCallsBlocked = 0;
    toolCalls.forEach((call, index) => {
        const allowed = toolsUnsafeEnabled && allowTools.has(call.name);
        const eventBase = {
            type: 'tool_call',
            index,
            tool: call.name,
            allowed,
            input: call.input ?? {},
        };
        if (allowed) {
            toolCallsAllowed += 1;
            toolEvents.push({ ...eventBase, status: 'allowed' });
        }
        else {
            toolCallsBlocked += 1;
            toolEvents.push({ ...eventBase, status: 'denied' });
        }
    });
    const traceEvents = [
        {
            type: 'workflow_start',
            evidence_id: evidenceId,
            agent: manifestParse.data.name,
            fixture: fixtureName,
        },
        {
            type: 'fixture_loaded',
            inputs: fixtureData.inputs ?? {},
        },
        ...toolEvents,
        {
            type: 'workflow_end',
            status: toolCallsBlocked > 0 ? 'blocked' : 'ok',
        },
    ];
    const tracePath = node_path_1.default.join(outputDir, 'trace.jsonl');
    const traceBody = traceEvents.map((event) => (0, stable_json_js_1.stableStringify)(event)).join('\n');
    await promises_1.default.writeFile(tracePath, `${traceBody}\n`, 'utf-8');
    const result = {
        evidence_id: evidenceId,
        agent: {
            name: manifestParse.data.name,
            manifest_path: manifestPath,
        },
        fixture: {
            name: fixtureName,
            path: fixturePath,
            digest_sha256: fixtureDigest,
        },
        outcome: toolCallsBlocked > 0 ? 'blocked' : 'ok',
        output: fixtureData.inputs ?? {},
    };
    const resultPath = node_path_1.default.join(outputDir, 'result.json');
    await (0, manifest_js_1.writeDeterministicJson)(resultPath, result);
    const metrics = {
        evidence_id: evidenceId,
        counters: {
            tool_calls_total: toolCalls.length,
            tool_calls_allowed: toolCallsAllowed,
            tool_calls_blocked: toolCallsBlocked,
        },
    };
    const metricsPath = node_path_1.default.join(outputDir, 'metrics.json');
    await (0, manifest_js_1.writeDeterministicJson)(metricsPath, metrics);
    const traceDigest = (0, hash_js_1.hashBytes)(await promises_1.default.readFile(tracePath, 'utf-8'));
    const resultDigest = (0, hash_js_1.hashBytes)(await promises_1.default.readFile(resultPath, 'utf-8'));
    const metricsDigest = (0, hash_js_1.hashBytes)(await promises_1.default.readFile(metricsPath, 'utf-8'));
    const stamp = {
        evidence_id: evidenceId,
        git_sha: sha12,
        manifest_digest: manifestDigest,
        fixture_digest: fixtureDigest,
        trace_digest: traceDigest,
        result_digest: resultDigest,
        metrics_digest: metricsDigest,
    };
    const stampPath = node_path_1.default.join(outputDir, 'stamp.json');
    await (0, manifest_js_1.writeDeterministicJson)(stampPath, stamp);
    return { evidenceId, outputDir };
}
