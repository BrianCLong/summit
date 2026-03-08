"use strict";
/**
 * Policy Gate Tests
 *
 * Tests for OPA policy evaluation and enforcement.
 */
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const policy_js_1 = require("../src/lib/policy.js");
describe('Policy Gate', () => {
    let tempDir;
    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-test-'));
    });
    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
    describe('sortActions', () => {
        it('sorts actions deterministically by type', () => {
            const actions = [
                { type: 'network', kind: 'provider' },
                { type: 'read_file', path: '/b.txt' },
                { type: 'write_patch', files: ['c.txt'], diff_bytes: 100 },
                { type: 'read_file', path: '/a.txt' },
                { type: 'exec_tool', tool: 'git', args: ['status'] },
            ];
            const sorted = (0, policy_js_1.sortActions)(actions);
            // Should be sorted: exec_tool, network, read_file (a), read_file (b), write_patch
            expect(sorted[0].type).toBe('exec_tool');
            expect(sorted[1].type).toBe('network');
            expect(sorted[2].type).toBe('read_file');
            expect(sorted[2].path).toBe('/a.txt');
            expect(sorted[3].type).toBe('read_file');
            expect(sorted[3].path).toBe('/b.txt');
            expect(sorted[4].type).toBe('write_patch');
        });
        it('sorts files within write_patch actions', () => {
            const actions = [
                { type: 'write_patch', files: ['z.txt', 'a.txt', 'm.txt'], diff_bytes: 100 },
            ];
            const sorted = (0, policy_js_1.sortActions)(actions);
            const writeAction = sorted[0];
            expect(writeAction.files).toEqual(['a.txt', 'm.txt', 'z.txt']);
        });
        it('produces stable output for repeated calls', () => {
            const actions = [
                { type: 'write_patch', files: ['b.txt', 'a.txt'], diff_bytes: 50 },
                { type: 'read_file', path: '/test.txt' },
            ];
            const result1 = (0, policy_js_1.stableStringify)((0, policy_js_1.sortActions)(actions));
            const result2 = (0, policy_js_1.stableStringify)((0, policy_js_1.sortActions)(actions));
            expect(result1).toBe(result2);
        });
    });
    describe('buildPolicyInput', () => {
        it('builds deterministic policy input', () => {
            const actions = [
                { type: 'write_patch', files: ['b.txt', 'a.txt'], diff_bytes: 100 },
            ];
            const input = (0, policy_js_1.buildPolicyInput)('run', { ci: true, write: true, policyPresent: true }, tempDir, actions);
            expect(input.command).toBe('run');
            expect(input.flags.ci).toBe(true);
            expect(input.flags.write).toBe(true);
            expect(input.flags.policy_present).toBe(true);
            expect(input.repo_root).toBe(path.resolve(tempDir));
            expect(input.actions[0].type).toBe('write_patch');
            // Files should be sorted
            expect(input.actions[0].files).toEqual(['a.txt', 'b.txt']);
        });
    });
    describe('loadPolicyBundle', () => {
        it('returns valid for directory with policy.rego', () => {
            const bundleDir = path.join(tempDir, 'bundle');
            fs.mkdirSync(bundleDir);
            fs.writeFileSync(path.join(bundleDir, 'policy.rego'), 'package test');
            const result = (0, policy_js_1.loadPolicyBundle)(bundleDir);
            expect(result.valid).toBe(true);
        });
        it('returns invalid for directory without policy.rego', () => {
            const bundleDir = path.join(tempDir, 'empty-bundle');
            fs.mkdirSync(bundleDir);
            const result = (0, policy_js_1.loadPolicyBundle)(bundleDir);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('No policy.rego found');
        });
        it('returns invalid for non-existent path', () => {
            const result = (0, policy_js_1.loadPolicyBundle)('/nonexistent/path');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Policy bundle not found');
        });
    });
    describe('PolicyGate', () => {
        describe('CI mode without policy', () => {
            it('throws PolicyError with exit code 2', () => {
                const gate = new policy_js_1.PolicyGate({
                    ci: true,
                    policyBundle: undefined,
                    repoRoot: tempDir,
                });
                expect(() => gate.initialize()).toThrow(policy_js_1.PolicyError);
                try {
                    gate.initialize();
                }
                catch (error) {
                    expect(error).toBeInstanceOf(policy_js_1.PolicyError);
                    const policyError = error;
                    expect(policyError.exitCode).toBe(policy_js_1.POLICY_EXIT_CODE);
                    expect(policyError.reasons).toContain('ci_mode_requires_policy');
                }
            });
            it('error message indicates policy is required', () => {
                const gate = new policy_js_1.PolicyGate({
                    ci: true,
                    policyBundle: undefined,
                    repoRoot: tempDir,
                });
                try {
                    gate.initialize();
                    fail('Should have thrown');
                }
                catch (error) {
                    const policyError = error;
                    expect(policyError.message).toContain('Policy bundle required');
                }
            });
        });
        describe('non-CI mode without policy', () => {
            it('allows operations by default', () => {
                const gate = new policy_js_1.PolicyGate({
                    ci: false,
                    policyBundle: undefined,
                    repoRoot: tempDir,
                });
                gate.initialize();
                const decision = gate.evaluate('run', { write: true }, [
                    { type: 'write_patch', files: ['test.txt'], diff_bytes: 100 },
                ]);
                expect(decision.allow).toBe(true);
            });
        });
        describe('policy loaded state', () => {
            it('reports policy not loaded when no bundle provided', () => {
                const gate = new policy_js_1.PolicyGate({
                    ci: false,
                    policyBundle: undefined,
                    repoRoot: tempDir,
                });
                gate.initialize();
                expect(gate.isPolicyLoaded()).toBe(false);
            });
        });
    });
    describe('PolicyError', () => {
        it('formats error with stable-sorted reasons', () => {
            const error = new policy_js_1.PolicyError('Test error', ['reason_z', 'reason_a', 'reason_m']);
            const formatted = error.format();
            expect(formatted).toContain('Policy Error: Test error');
            expect(formatted).toContain('Deny reasons:');
            // Reasons should be sorted
            const reasonsSection = formatted.split('Deny reasons:')[1];
            const reasonIndex = {
                a: reasonsSection.indexOf('reason_a'),
                m: reasonsSection.indexOf('reason_m'),
                z: reasonsSection.indexOf('reason_z'),
            };
            expect(reasonIndex.a).toBeLessThan(reasonIndex.m);
            expect(reasonIndex.m).toBeLessThan(reasonIndex.z);
        });
        it('has correct exit code', () => {
            const error = new policy_js_1.PolicyError('Test', ['reason'], policy_js_1.POLICY_EXIT_CODE);
            expect(error.exitCode).toBe(2);
        });
    });
    describe('stableStringify', () => {
        it('produces consistent output regardless of key order', () => {
            const obj1 = { z: 1, a: 2, m: 3 };
            const obj2 = { a: 2, z: 1, m: 3 };
            expect((0, policy_js_1.stableStringify)(obj1)).toBe((0, policy_js_1.stableStringify)(obj2));
        });
    });
});
