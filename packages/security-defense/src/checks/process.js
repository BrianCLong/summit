"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runProcessChecks = void 0;
const fs_utils_js_1 = require("../fs-utils.js");
const runProcessChecks = (root) => {
    const results = [];
    const codeowners = (0, fs_utils_js_1.findFiles)(root, ['CODEOWNERS', '.github/CODEOWNERS'])[0];
    if (!codeowners) {
        results.push({
            epic: 'Epic 9',
            requirement: 'Reviewer policy',
            status: 'fail',
            message: 'CODEOWNERS file missing. High-risk areas require explicit approvers.',
            remediation: 'Add CODEOWNERS rules for IAM, deploy, DNS, and authZ paths.',
        });
    }
    else {
        const content = (0, fs_utils_js_1.loadFile)(codeowners) ?? '';
        const requiredPaths = ['iam', 'deploy', 'dns', 'authz'];
        const missingPaths = requiredPaths.filter((path) => !content.includes(path));
        if (missingPaths.length > 0) {
            results.push({
                epic: 'Epic 9',
                requirement: 'Reviewer policy',
                status: 'fail',
                message: 'CODEOWNERS missing coverage for sensitive paths.',
                remediation: 'Add CODEOWNERS entries for sensitive paths with two-person rule.',
                details: { missingPaths },
            });
        }
        else {
            results.push({
                epic: 'Epic 9',
                requirement: 'Reviewer policy',
                status: 'pass',
                message: 'Sensitive paths have CODEOWNERS coverage.',
            });
        }
    }
    const trainingMaterials = (0, fs_utils_js_1.findFiles)(root, ['runbooks/tabletop/**/*', 'runbooks/**/*tabletop*.*', 'training/**/*security*.*']);
    if (trainingMaterials.length === 0) {
        results.push({
            epic: 'Epic 9',
            requirement: 'Tabletop and training',
            status: 'fail',
            message: 'No tabletop drills or training materials detected.',
            remediation: 'Add tabletop runbooks (token leak, supply-chain compromise) and training content.',
        });
    }
    else {
        results.push({
            epic: 'Epic 9',
            requirement: 'Tabletop and training',
            status: 'pass',
            message: 'Tabletop drills/training content available.',
            details: { trainingMaterials },
        });
    }
    return results;
};
exports.runProcessChecks = runProcessChecks;
