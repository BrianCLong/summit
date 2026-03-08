"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runIamChecks = void 0;
const fs_utils_js_1 = require("../fs-utils.js");
const wildcardRegex = /"Action"\s*:\s*"\*"|\ballows\s*:\s*\*/i;
const breakglassRegex = /break[-_]?glass/i;
const runIamChecks = (root) => {
    const results = [];
    const iamFiles = (0, fs_utils_js_1.findFiles)(root, ['policies/**/*.{json,rego}', 'iam/**/*.{json,rego}', 'terraform/**/*.{tf,json}']);
    if (iamFiles.length === 0) {
        results.push({
            epic: 'Epic 4',
            requirement: 'IAM policy coverage',
            status: 'fail',
            message: 'No IAM policy artifacts detected to validate boundary roles.',
            remediation: 'Store IAM boundary policies under policies/ or terraform/ for automated validation.',
        });
        return results;
    }
    const wildcardFindings = [];
    const missingBreakglassDeny = [];
    iamFiles.forEach((file) => {
        const content = (0, fs_utils_js_1.loadFile)(file) ?? '';
        if (wildcardRegex.test(content)) {
            wildcardFindings.push(file);
        }
        if (!breakglassRegex.test(content)) {
            missingBreakglassDeny.push(file);
        }
    });
    if (wildcardFindings.length > 0) {
        results.push({
            epic: 'Epic 4',
            requirement: 'No wildcard admin',
            status: 'fail',
            message: 'Wildcard IAM actions detected.',
            remediation: 'Replace wildcard admin permissions with explicit scoped actions per environment.',
            details: { wildcardFindings },
        });
    }
    else {
        results.push({
            epic: 'Epic 4',
            requirement: 'No wildcard admin',
            status: 'pass',
            message: 'No wildcard IAM permissions detected.',
        });
    }
    if (missingBreakglassDeny.length > 0) {
        results.push({
            epic: 'Epic 4',
            requirement: 'Break-glass explicitness',
            status: 'fail',
            message: 'Policies missing break-glass clauses to constrain scope.',
            remediation: 'Add explicit break-glass conditions with expiry and audit requirements.',
            details: { missingBreakglassDeny },
        });
    }
    else {
        results.push({
            epic: 'Epic 4',
            requirement: 'Break-glass explicitness',
            status: 'pass',
            message: 'All policies declare break-glass constraints.',
        });
    }
    return results;
};
exports.runIamChecks = runIamChecks;
