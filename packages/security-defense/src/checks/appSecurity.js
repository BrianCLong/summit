"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAppSecurityChecks = void 0;
const fs_utils_js_1 = require("../fs-utils.js");
const runAppSecurityChecks = (root) => {
    const results = [];
    const graphqlConfigs = (0, fs_utils_js_1.findFiles)(root, ['graphql/**/*.{json,yml,yaml}']);
    if (graphqlConfigs.length === 0) {
        results.push({
            epic: 'Epic 8',
            requirement: 'GraphQL guardrails',
            status: 'fail',
            message: 'No GraphQL configuration detected for depth/complexity limits or rate limits.',
            remediation: 'Add GraphQL server config with depth/complexity limits and persisted query enforcement.',
        });
    }
    else {
        const missingGuardrails = [];
        graphqlConfigs.forEach((file) => {
            const content = (0, fs_utils_js_1.loadFile)(file) ?? '';
            if (!/depthLimit/i.test(content) || !/complexity/i.test(content)) {
                missingGuardrails.push(file);
            }
            if (!/persisted/i.test(content) && !/persistedQueries/i.test(content)) {
                missingGuardrails.push(file);
            }
        });
        if (missingGuardrails.length > 0) {
            results.push({
                epic: 'Epic 8',
                requirement: 'GraphQL guardrails',
                status: 'fail',
                message: 'GraphQL configs missing depth/complexity or persisted query guardrails.',
                remediation: 'Define depth, complexity, persisted queries, and per-identity rate limits.',
                details: { missingGuardrails },
            });
        }
        else {
            results.push({
                epic: 'Epic 8',
                requirement: 'GraphQL guardrails',
                status: 'pass',
                message: 'GraphQL guardrails detected (depth, complexity, persisted queries).',
            });
        }
    }
    const dlpConfigs = (0, fs_utils_js_1.findFiles)(root, ['observability/**/*redaction*.{yml,yaml,json}', 'logging/**/*redaction*.{yml,yaml,json}']);
    if (dlpConfigs.length === 0) {
        results.push({
            epic: 'Epic 8',
            requirement: 'DLP and redaction',
            status: 'fail',
            message: 'No log redaction or DLP configuration found.',
            remediation: 'Add redaction rules to prevent sensitive fields from reaching logs/telemetry.',
        });
    }
    else {
        results.push({
            epic: 'Epic 8',
            requirement: 'DLP and redaction',
            status: 'pass',
            message: 'Redaction/DLP configurations detected for telemetry.',
            details: { dlpConfigs },
        });
    }
    return results;
};
exports.runAppSecurityChecks = runAppSecurityChecks;
