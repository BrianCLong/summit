"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCiCdChecks = void 0;
const path_1 = __importDefault(require("path"));
const yaml_1 = __importDefault(require("yaml"));
const fs_utils_js_1 = require("../fs-utils.js");
const workflowPatterns = ['.github/workflows/**/*.yml', '.github/workflows/**/*.yaml'];
const usesRegex = /uses:\s*([^@\s]+)@([^\s]+)/i;
const staticAwsKeyRegex = /(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN)/;
const isPinned = (ref) => /^[0-9a-f]{40}$/i.test(ref);
const evaluateWorkflowFile = (filePath) => {
    const results = [];
    const content = (0, fs_utils_js_1.loadFile)(filePath);
    if (!content) {
        return results;
    }
    const parsed = yaml_1.default.parse(content) ?? {};
    const permissions = parsed.permissions;
    if (!permissions) {
        results.push({
            epic: 'Epic 2',
            requirement: 'Workflow permissions',
            status: 'fail',
            message: `${path_1.default.basename(filePath)} is missing explicit permissions.`,
            remediation: 'Declare minimal permissions at the workflow or job level (contents: read, id-token: write when needed).',
            details: { filePath },
        });
    }
    const missingPins = [];
    const steps = Object.values(parsed.jobs ?? {}).flatMap((job) => job?.steps ?? []);
    steps.forEach((step) => {
        if (typeof step?.uses === 'string') {
            const match = step.uses.match(usesRegex);
            if (match) {
                const ref = match[2];
                if (!isPinned(ref) && !step.uses.startsWith('./')) {
                    missingPins.push({ action: match[1], ref });
                }
            }
        }
    });
    if (missingPins.length > 0) {
        results.push({
            epic: 'Epic 2',
            requirement: 'Pinned actions',
            status: 'fail',
            message: 'Reusable actions must be pinned by commit SHA.',
            remediation: 'Update uses: declarations to use full-length commit SHAs.',
            details: { filePath, missingPins },
        });
    }
    const staticKeysDetected = [];
    if (content.match(staticAwsKeyRegex)) {
        staticKeysDetected.push('AWS static credentials referenced in workflow.');
    }
    if (staticKeysDetected.length > 0) {
        results.push({
            epic: 'Epic 2',
            requirement: 'OIDC migration',
            status: 'fail',
            message: 'Static cloud keys detected inside workflows.',
            remediation: 'Replace static keys with OIDC federated roles and remove shared secrets from workflows.',
            details: { filePath, findings: staticKeysDetected },
        });
    }
    const policySteps = steps.filter((step) => typeof step?.run === 'string' && /opa|conftest|policy/i.test(step.run));
    if (policySteps.length === 0) {
        results.push({
            epic: 'Epic 2',
            requirement: 'Policy-as-code gate',
            status: 'fail',
            message: 'No OPA/Conftest policy gate detected in workflow.',
            remediation: 'Add a policy-as-code step to block risky changes before deploy.',
            details: { filePath },
        });
    }
    const cacheKeys = steps
        .filter((step) => typeof step?.uses === 'string' && step.uses.includes('actions/cache'))
        .map((step) => step?.with?.key)
        .filter(Boolean);
    const unsafeCacheKeys = cacheKeys.filter((key) => !key?.includes('${{ github.sha }}') && !key?.includes('${{ github.run_id }}'));
    if (unsafeCacheKeys.length > 0) {
        results.push({
            epic: 'Epic 2',
            requirement: 'Cache hardening',
            status: 'fail',
            message: 'Cache keys missing run-specific entropy detected.',
            remediation: 'Scope cache keys to run identifiers to prevent cross-PR poisoning.',
            details: { filePath, unsafeCacheKeys },
        });
    }
    return results;
};
const runCiCdChecks = (root) => {
    const results = [];
    const workflows = (0, fs_utils_js_1.findFiles)(root, workflowPatterns);
    if (workflows.length === 0) {
        results.push({
            epic: 'Epic 2',
            requirement: 'Workflow coverage',
            status: 'fail',
            message: 'No GitHub Actions workflows found to enforce CI/CD hardening.',
            remediation: 'Define workflows under .github/workflows with explicit permissions and policy gates.',
        });
        return results;
    }
    workflows.forEach((workflow) => {
        results.push(...evaluateWorkflowFile(workflow));
    });
    return results;
};
exports.runCiCdChecks = runCiCdChecks;
