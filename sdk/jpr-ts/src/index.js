"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JurisdictionalPolicyResolver = void 0;
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const yaml_1 = __importDefault(require("yaml"));
class JurisdictionalPolicyResolver {
    options;
    cacheEntry;
    constructor(options) {
        if (!options.policiesPath) {
            throw new Error('policiesPath is required');
        }
        this.options = {
            cliCommand: ['go', 'run', './cmd/jprcli'],
            cliCwd: path_1.default.resolve(__dirname, '..', '..', '..', 'jpr'),
            ...options
        };
    }
    can(input) {
        const engine = this.ensureEngine();
        return evaluate(engine, input).decision;
    }
    explain(input) {
        const engine = this.ensureEngine();
        return evaluate(engine, input);
    }
    refresh() {
        this.cacheEntry = undefined;
    }
    ensureEngine() {
        const etag = this.computeEtag();
        if (this.cacheEntry && this.cacheEntry.compiled.etag === etag && Date.now() < this.cacheEntry.expiresAt) {
            return this.cacheEntry.compiled;
        }
        const compiled = this.compileWithGo();
        const ttlMs = Math.max(compiled.ttl / 1_000_000, 0);
        this.cacheEntry = {
            compiled,
            expiresAt: Date.now() + ttlMs
        };
        return compiled;
    }
    compileWithGo() {
        const command = this.options.cliCommand ?? ['go', 'run', './cmd/jprcli'];
        const [exec, ...args] = command;
        const finalArgs = [...args, '--policies', this.options.policiesPath, '--mode', 'compile'];
        const result = (0, child_process_1.spawnSync)(exec, finalArgs, {
            cwd: this.options.cliCwd,
            encoding: 'utf8'
        });
        if (result.error) {
            throw result.error;
        }
        if (result.status !== 0) {
            throw new Error(`jpr cli failed: ${result.stderr}`);
        }
        try {
            return JSON.parse(result.stdout);
        }
        catch (err) {
            throw new Error(`failed to parse CLI output: ${err}`);
        }
    }
    computeEtag() {
        const source = (0, fs_1.readFileSync)(this.options.policiesPath, 'utf8');
        const parsed = yaml_1.default.parse(source);
        const h = crypto_1.default.createHash('sha256');
        h.update(JSON.stringify(parsed));
        return h.digest('hex');
    }
}
exports.JurisdictionalPolicyResolver = JurisdictionalPolicyResolver;
function evaluate(engine, input) {
    const keyCandidates = buildKeyCandidates(input);
    const traces = [];
    const decisionTime = input.decisionTime ?? new Date();
    for (const key of keyCandidates) {
        const indexes = engine.index[key];
        if (!indexes) {
            continue;
        }
        for (const idx of indexes) {
            const rule = engine.rules[idx];
            const { matched, reason } = evaluateRule(rule, input, decisionTime);
            const trace = {
                policyId: rule.policyId,
                priority: rule.priority,
                effect: rule.effect,
                effectiveFrom: rule.effectiveFrom,
                effectiveTo: rule.effectiveTo,
                matched,
                reason
            };
            traces.push(trace);
            if (matched) {
                const decision = {
                    allowed: rule.effect === 'allow',
                    effect: rule.effect,
                    policyId: rule.policyId,
                    evaluated: decisionTime.toISOString(),
                    reason,
                    matchedKey: key
                };
                return { decision, chain: traces };
            }
        }
    }
    const decision = {
        allowed: engine.defaultEffect === 'allow',
        effect: engine.defaultEffect,
        policyId: '',
        evaluated: decisionTime.toISOString(),
        reason: `default-effect:${engine.defaultEffect}`,
        matchedKey: ''
    };
    return { decision, chain: traces };
}
function buildKeyCandidates(input) {
    const jurisdiction = input.jurisdiction || '*';
    const dataClass = input.dataClass || '*';
    const purpose = input.purpose || '*';
    const action = input.action;
    if (!action) {
        throw new Error('action is required');
    }
    return [
        `${jurisdiction}|${dataClass}|${purpose}|${action}`,
        `${jurisdiction}|*|${purpose}|${action}`,
        `${jurisdiction}|${dataClass}|*|${action}`,
        `${jurisdiction}|*|*|${action}`,
        `*|${dataClass}|${purpose}|${action}`,
        `*|*|${purpose}|${action}`,
        `*|${dataClass}|*|${action}`,
        `*|*|*|${action}`
    ];
}
function evaluateRule(rule, input, when) {
    if (!withinRange(rule.effectiveFrom, rule.effectiveTo, when)) {
        return { matched: false, reason: `out-of-range:${rule.effectiveFrom}-${rule.effectiveTo}` };
    }
    if (!matchesValue(rule.jurisdiction, input.jurisdiction)) {
        return { matched: false, reason: `jurisdiction-mismatch:${input.jurisdiction}` };
    }
    if (!matchesValue(rule.dataClass, input.dataClass)) {
        return { matched: false, reason: `data-class-mismatch:${input.dataClass}` };
    }
    if (!matchesValue(rule.purpose, input.purpose)) {
        return { matched: false, reason: `purpose-mismatch:${input.purpose}` };
    }
    const facts = input.facts ?? {};
    const traits = input.traits ?? {};
    if (rule.conditions) {
        for (const [field, expected] of Object.entries(rule.conditions)) {
            const actual = facts[field] ?? traits[field];
            if (actual !== expected) {
                return { matched: false, reason: `condition-mismatch:${field}` };
            }
        }
    }
    if (rule.overrides) {
        for (const value of rule.overrides) {
            if (value === input.dataClass || value === input.jurisdiction || value === input.purpose) {
                return { matched: false, reason: `override-suppressed:${value}` };
            }
        }
    }
    return { matched: true, reason: 'matched' };
}
function withinRange(start, end, current) {
    const lower = toDate(start);
    const upper = toDate(end);
    if (lower && current < lower) {
        return false;
    }
    if (upper && current > upper) {
        return false;
    }
    return true;
}
function toDate(value) {
    if (!value || value.startsWith('0001-01-01')) {
        return undefined;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return undefined;
    }
    return date;
}
function matchesValue(ruleValue, inputValue) {
    if (!ruleValue || ruleValue === '*') {
        return true;
    }
    if (!inputValue) {
        return false;
    }
    return ruleValue.localeCompare(inputValue, undefined, { sensitivity: 'accent' }) === 0;
}
__exportStar(require("./types"), exports);
