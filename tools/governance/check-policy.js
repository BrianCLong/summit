#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const verify_bundle_1 = require("../../summit/agents/policy/bundle/verify-bundle");
function loadPolicy() {
    const raw = node_fs_1.default.readFileSync('summit/agents/policy/policy.yml', 'utf8');
    const parsed = js_yaml_1.default.load(raw);
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('policy.yml must parse to an object');
    }
    return parsed;
}
function validateSemantics(policy) {
    const errors = [];
    const semantics = policy.semantics;
    if (!semantics || !Array.isArray(semantics.allowed_actions)) {
        errors.push('policy.semantics.allowed_actions must be an array');
    }
    return { ok: errors.length === 0, errors };
}
function validateIntensity(policy) {
    const errors = [];
    const intensity = policy.intensity;
    const min = Number(intensity?.min);
    const max = Number(intensity?.max);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
        errors.push('policy.intensity must define numeric min/max with 0 <= min <= max');
    }
    return { ok: errors.length === 0, errors };
}
function shouldVerifyProdBundle(changedFiles) {
    return changedFiles.some((file) => file.startsWith('summit/agents/policy/') || file.startsWith('summit/agents/skills/'));
}
function main() {
    const changedFiles = process.argv.slice(2);
    const policy = loadPolicy();
    const checks = [validateSemantics(policy), validateIntensity(policy)];
    const errors = checks.flatMap((check) => check.errors);
    if (shouldVerifyProdBundle(changedFiles)) {
        const verification = (0, verify_bundle_1.verifyBundle)('prod');
        if (!verification.ok) {
            errors.push(...verification.errors, 'Update policy-bundle.prod.json and ensure approvals include governance.');
        }
    }
    if (errors.length > 0) {
        console.error(errors.join('\n'));
        process.exit(1);
    }
    console.log('Policy checks passed.');
}
main();
