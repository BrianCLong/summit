"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceWorkflowGate = enforceWorkflowGate;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const walker_js_1 = require("./walker.js");
const COMMIT_SHA_REGEX = /^[a-f0-9]{40}$/i;
async function enforceWorkflowGate(rootDir, config) {
    const files = await (0, walker_js_1.findFilesByGlob)(rootDir, config.workflowGlobs);
    const details = [];
    for (const file of files) {
        const content = node_fs_1.default.readFileSync(file, 'utf-8');
        const workflow = parseWorkflow(content);
        const workflowName = node_path_1.default.relative(rootDir, file);
        if (config.enforcePinnedActions) {
            const unpinned = findUnpinnedActions(workflow);
            if (unpinned.length) {
                details.push(`${workflowName}: unpinned actions detected -> ${unpinned.join(', ')}`);
            }
        }
        const permissionIssues = evaluatePermissions(workflow, config);
        if (permissionIssues.length) {
            details.push(`${workflowName}: permission issues -> ${permissionIssues.join('; ')}`);
        }
    }
    return {
        gate: 'workflow',
        ok: details.length === 0,
        details: details.length ? details : ['Workflows pinned and minimally permissioned']
    };
}
function parseWorkflow(content) {
    const lines = content.split(/\r?\n/);
    const permissions = {};
    const uses = [];
    let inPermissions = false;
    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (!line.trim())
            continue;
        if (/^permissions:\s*$/.test(line)) {
            inPermissions = true;
            continue;
        }
        if (inPermissions) {
            if (!/^\s/.test(rawLine)) {
                inPermissions = false;
            }
            else {
                const normalized = line.trim();
                const match = normalized.match(/^([\w-]+):\s*(\w+)/);
                if (match) {
                    permissions[match[1]] = match[2];
                }
                continue;
            }
        }
        const usesMatch = line.match(/uses:\s*(.+)/);
        if (usesMatch) {
            uses.push(usesMatch[1].trim());
        }
    }
    return { permissions, uses };
}
function findUnpinnedActions(workflow) {
    return workflow.uses.filter((actionRef) => {
        if (actionRef.startsWith('./') || actionRef.startsWith('../'))
            return false;
        const [, ref] = actionRef.split('@');
        return !ref || !COMMIT_SHA_REGEX.test(ref);
    });
}
function evaluatePermissions(workflow, config) {
    const required = config.enforceMinimumPermissions;
    const found = workflow.permissions;
    if (!Object.keys(found).length) {
        return ['missing top-level permissions block'];
    }
    const issues = [];
    Object.entries(required).forEach(([perm, level]) => {
        const provided = found[perm];
        if (!provided) {
            issues.push(`${perm} permission missing`);
        }
        else if (provided !== level) {
            issues.push(`${perm} permission must be ${level}, found ${provided}`);
        }
    });
    Object.entries(found).forEach(([perm, level]) => {
        if (required[perm])
            return;
        if (level === 'write') {
            issues.push(`${perm} permission write not allowed`);
        }
    });
    return issues;
}
