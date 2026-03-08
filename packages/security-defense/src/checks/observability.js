"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runObservabilityChecks = void 0;
const fs_utils_js_1 = require("../fs-utils.js");
const runObservabilityChecks = (root) => {
    const results = [];
    const auditConfigs = (0, fs_utils_js_1.findFiles)(root, ['observability/**/*audit*.{yml,yaml,json}', 'logging/**/*audit*.{yml,yaml,json}']);
    const evidenceTemplates = (0, fs_utils_js_1.findFiles)(root, ['templates/**/*evidence*.*', 'runbooks/**/*evidence*.*']);
    if (auditConfigs.length === 0) {
        results.push({
            epic: 'Epic 7',
            requirement: 'Centralized audit logging',
            status: 'fail',
            message: 'No audit log configuration detected.',
            remediation: 'Add centralized audit log configuration with retention and immutability controls.',
        });
    }
    else {
        const retentionIssues = [];
        auditConfigs.forEach((file) => {
            const content = (0, fs_utils_js_1.loadFile)(file) ?? '';
            if (!/retention/i.test(content) || !/(immutable|appendOnly)/i.test(content)) {
                retentionIssues.push(file);
            }
        });
        if (retentionIssues.length > 0) {
            results.push({
                epic: 'Epic 7',
                requirement: 'Retention and immutability',
                status: 'fail',
                message: 'Audit configs missing retention or immutability controls.',
                remediation: 'Specify retention period and immutability (WORM/append-only) in audit configs.',
                details: { retentionIssues },
            });
        }
        else {
            results.push({
                epic: 'Epic 7',
                requirement: 'Retention and immutability',
                status: 'pass',
                message: 'Audit log configs declare retention and immutability controls.',
            });
        }
    }
    if (evidenceTemplates.length === 0) {
        results.push({
            epic: 'Epic 7',
            requirement: 'Incident evidence packet',
            status: 'fail',
            message: 'No incident evidence template found.',
            remediation: 'Add a template documenting hashes, timelines, and affected resources.',
        });
    }
    else {
        results.push({
            epic: 'Epic 7',
            requirement: 'Incident evidence packet',
            status: 'pass',
            message: 'Incident evidence templates are present for forensics.',
            details: { evidenceTemplates },
        });
    }
    return results;
};
exports.runObservabilityChecks = runObservabilityChecks;
