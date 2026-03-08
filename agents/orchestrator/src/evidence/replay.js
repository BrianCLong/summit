"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.replayEvidenceBundle = replayEvidenceBundle;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const types_js_1 = require("./types.js");
const bundle_js_1 = require("./bundle.js");
async function replayEvidenceBundle(options) {
    const bundlePath = options.bundlePath;
    const planPath = node_path_1.default.join(bundlePath, 'plan.json');
    const tracePath = node_path_1.default.join(bundlePath, 'trace.ndjson');
    const manifestPath = node_path_1.default.join(bundlePath, 'manifest.json');
    const [planRaw, traceRaw, manifestRaw] = await Promise.all([
        node_fs_1.promises.readFile(planPath, 'utf8'),
        node_fs_1.promises.readFile(tracePath, 'utf8'),
        node_fs_1.promises.readFile(manifestPath, 'utf8'),
    ]);
    const plan = types_js_1.PlanIRSchema.parse(JSON.parse(planRaw));
    const manifest = JSON.parse(manifestRaw);
    if (!manifest.files || manifest.files.length === 0) {
        return {
            ok: false,
            mismatches: ['manifest missing file entries'],
            diff: 'manifest.files empty',
        };
    }
    const manifestPaths = new Set(manifest.files.map((file) => file.path));
    const requiredPaths = ['plan.json', 'trace.ndjson'];
    for (const required of requiredPaths) {
        if (!manifestPaths.has(required)) {
            return {
                ok: false,
                mismatches: [`manifest missing ${required}`],
                diff: `manifest.files missing ${required}`,
            };
        }
    }
    const traceEvents = parseTrace(traceRaw);
    const replayEvents = traceEvents.map((event) => normalizeEvent(event));
    const mismatches = [];
    const normalizedOriginal = traceEvents.map((event) => normalizeEvent(event));
    if (normalizedOriginal.length !== replayEvents.length) {
        mismatches.push('event count mismatch');
    }
    const sequenceMismatch = compareSequence(normalizedOriginal, replayEvents);
    if (sequenceMismatch) {
        mismatches.push(sequenceMismatch);
    }
    for (const event of traceEvents) {
        if (event.run_id !== plan.run_id) {
            mismatches.push(`event run_id mismatch: ${event.run_id}`);
            break;
        }
        if (event.plan_id && event.plan_id !== plan.plan_id) {
            mismatches.push(`event plan_id mismatch: ${event.plan_id}`);
            break;
        }
    }
    if (options.contractRegistry) {
        for (const event of traceEvents) {
            if (event.type === 'tool:completed' || event.type === 'tool:validation_failed') {
                const toolName = event.tool_name ?? '';
                const contract = options.contractRegistry.get(toolName);
                if (!contract) {
                    mismatches.push(`missing contract for tool ${toolName}`);
                    continue;
                }
            }
        }
    }
    if (mismatches.length > 0 && options.strict) {
        return {
            ok: false,
            mismatches,
            diff: buildDiff(normalizedOriginal, replayEvents),
        };
    }
    const replayTracePath = node_path_1.default.join(bundlePath, 'trace.replay.ndjson');
    const replayContent = replayEvents.map((event) => `${(0, bundle_js_1.stableStringifyLine)(event)}\n`).join('');
    await node_fs_1.promises.writeFile(replayTracePath, replayContent, 'utf8');
    return {
        ok: mismatches.length === 0,
        mismatches,
        diff: mismatches.length > 0 ? buildDiff(normalizedOriginal, replayEvents) : undefined,
    };
}
function parseTrace(raw) {
    const lines = raw.split('\n').filter(Boolean);
    return lines.map((line) => {
        const parsed = JSON.parse(line);
        if (!isTraceEvent(parsed)) {
            throw new Error('Invalid trace event schema');
        }
        return parsed;
    });
}
function isTraceEvent(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    return (typeof value.type === 'string' &&
        typeof value.timestamp === 'string' &&
        typeof value.run_id === 'string');
}
function normalizeEvent(event) {
    return {
        ...event,
        timestamp: 'normalized',
    };
}
function compareSequence(original, replay) {
    const len = Math.min(original.length, replay.length);
    for (let i = 0; i < len; i += 1) {
        const o = original[i];
        const r = replay[i];
        if (o.type !== r.type || o.step_id !== r.step_id || o.tool_name !== r.tool_name) {
            return `event mismatch at index ${i}`;
        }
    }
    return undefined;
}
function buildDiff(original, replay) {
    const originalLines = original.map((event) => (0, bundle_js_1.stableStringify)(event)).join('');
    const replayLines = replay.map((event) => (0, bundle_js_1.stableStringify)(event)).join('');
    return `--- original\n${originalLines}\n--- replay\n${replayLines}`;
}
