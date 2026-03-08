"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.grade = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const readJson = async (filePath) => {
    const raw = await promises_1.default.readFile(filePath, 'utf8');
    return JSON.parse(raw);
};
const findRunId = (trace) => trace[0]?.run_id ?? 'unknown';
const extractChangedPaths = (trace) => {
    const changes = [];
    trace
        .filter((event) => event.event_type === 'file_changes')
        .forEach((event) => {
        const entries = event.data.changes ?? [];
        entries.forEach((line) => {
            const trimmed = line.trim();
            const pathPart = trimmed.slice(3).trim();
            if (pathPart.length > 0) {
                changes.push(pathPart);
            }
        });
    });
    return changes;
};
const grade = async ({ trace, prompts, skillDir, }) => {
    const runId = findRunId(trace);
    const checks = [];
    let passed = 0;
    for (const promptCase of prompts) {
        const resultPath = node_path_1.default.join(skillDir, 'artifacts', runId, promptCase.id, 'result.json');
        const result = await readJson(resultPath);
        const triggerPass = result.triggered === promptCase.expected_trigger;
        checks.push({
            id: `trigger-${promptCase.id}`,
            pass: triggerPass,
            notes: triggerPass
                ? undefined
                : `Expected trigger=${promptCase.expected_trigger} for ${promptCase.id}`,
        });
        if (triggerPass) {
            passed += 1;
        }
        const policyPath = node_path_1.default.join(skillDir, 'artifacts', runId, promptCase.id, 'policy-summary.json');
        const policyExists = await promises_1.default
            .access(policyPath)
            .then(() => true)
            .catch(() => false);
        const policyPass = result.triggered ? policyExists : !policyExists;
        checks.push({
            id: `artifact-${promptCase.id}`,
            pass: policyPass,
            notes: policyPass ? undefined : 'Unexpected policy artifact presence',
        });
        if (policyPass) {
            passed += 1;
        }
    }
    const changedPaths = extractChangedPaths(trace);
    const allowedPrefix = node_path_1.default.join('evals', 'skills', 'add-opa-policy', 'artifacts');
    const invalidPaths = changedPaths.filter((changed) => !changed.startsWith(allowedPrefix));
    const pathPass = invalidPaths.length === 0;
    checks.push({
        id: 'artifact-boundary',
        pass: pathPass,
        notes: pathPass ? undefined : `Unexpected changes: ${invalidPaths.join(', ')}`,
    });
    if (pathPass) {
        passed += 1;
    }
    const totalChecks = checks.length;
    const score = Math.round((passed / totalChecks) * 100);
    return {
        overall_pass: checks.every((check) => check.pass),
        score,
        checks,
    };
};
exports.grade = grade;
