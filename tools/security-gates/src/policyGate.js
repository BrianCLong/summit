"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforcePolicyGate = enforcePolicyGate;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
async function enforcePolicyGate(rootDir, config) {
    const inputPath = node_path_1.default.resolve(rootDir, config.inputPath);
    if (!node_fs_1.default.existsSync(inputPath)) {
        return { gate: 'policy', ok: false, details: [`policy input missing at ${config.inputPath}`] };
    }
    const input = JSON.parse(node_fs_1.default.readFileSync(inputPath, 'utf-8'));
    const denies = [];
    if (config.denyWildcardIam) {
        denies.push(...detectWildcardIam(input));
    }
    if (!config.allowPublicEndpoints) {
        denies.push(...detectPublicExposure(input));
    }
    return {
        gate: 'policy',
        ok: denies.length === 0,
        details: denies.length ? denies : ['Policy bundle denies are clear']
    };
}
function detectWildcardIam(input) {
    const issues = [];
    input.iamRoles?.forEach((role) => {
        role.statements.forEach((statement) => {
            if (statement.action === '*' || statement.resource === '*') {
                issues.push(`Role ${role.name} contains wildcard action/resource`);
            }
        });
    });
    return issues;
}
function detectPublicExposure(input) {
    const issues = [];
    const publicEndpoints = input.exposures?.publicEndpoints ?? [];
    if (publicEndpoints.length) {
        issues.push(`Public endpoints not allowed: ${publicEndpoints.join(', ')}`);
    }
    return issues;
}
