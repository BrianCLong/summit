/**
 * Policy Gate Tests
 *
 * Tests for OPA policy evaluation and enforcement.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  PolicyGate,
  PolicyError,
  PolicyAction,
  buildPolicyInput,
  sortActions,
  stableStringify,
  loadPolicyBundle,
  POLICY_EXIT_CODE,
} from '../src/lib/policy.js';

describe('Policy Gate', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('sortActions', () => {
    it('sorts actions deterministically by type', () => {
      const actions: PolicyAction[] = [
        { type: 'network', kind: 'provider' },
        { type: 'read_file', path: '/b.txt' },
        { type: 'write_patch', files: ['c.txt'], diff_bytes: 100 },
        { type: 'read_file', path: '/a.txt' },
        { type: 'exec_tool', tool: 'git', args: ['status'] },
      ];

      const sorted = sortActions(actions);

      // Should be sorted: exec_tool, network, read_file (a), read_file (b), write_patch
      expect(sorted[0].type).toBe('exec_tool');
      expect(sorted[1].type).toBe('network');
      expect(sorted[2].type).toBe('read_file');
      expect((sorted[2] as { path: string }).path).toBe('/a.txt');
      expect(sorted[3].type).toBe('read_file');
      expect((sorted[3] as { path: string }).path).toBe('/b.txt');
      expect(sorted[4].type).toBe('write_patch');
    });

    it('sorts files within write_patch actions', () => {
      const actions: PolicyAction[] = [
        { type: 'write_patch', files: ['z.txt', 'a.txt', 'm.txt'], diff_bytes: 100 },
      ];

      const sorted = sortActions(actions);
      const writeAction = sorted[0] as { type: 'write_patch'; files: string[] };

      expect(writeAction.files).toEqual(['a.txt', 'm.txt', 'z.txt']);
    });

    it('produces stable output for repeated calls', () => {
      const actions: PolicyAction[] = [
        { type: 'write_patch', files: ['b.txt', 'a.txt'], diff_bytes: 50 },
        { type: 'read_file', path: '/test.txt' },
      ];

      const result1 = stableStringify(sortActions(actions));
      const result2 = stableStringify(sortActions(actions));

      expect(result1).toBe(result2);
    });
  });

  describe('buildPolicyInput', () => {
    it('builds deterministic policy input', () => {
      const actions: PolicyAction[] = [
        { type: 'write_patch', files: ['b.txt', 'a.txt'], diff_bytes: 100 },
      ];

      const input = buildPolicyInput(
        'run',
        { ci: true, write: true, policyPresent: true },
        tempDir,
        actions
      );

      expect(input.command).toBe('run');
      expect(input.flags.ci).toBe(true);
      expect(input.flags.write).toBe(true);
      expect(input.flags.policy_present).toBe(true);
      expect(input.repo_root).toBe(path.resolve(tempDir));
      expect(input.actions[0].type).toBe('write_patch');
      // Files should be sorted
      expect((input.actions[0] as { files: string[] }).files).toEqual(['a.txt', 'b.txt']);
    });
  });

  describe('loadPolicyBundle', () => {
    it('returns valid for directory with policy.rego', () => {
      const bundleDir = path.join(tempDir, 'bundle');
      fs.mkdirSync(bundleDir);
      fs.writeFileSync(path.join(bundleDir, 'policy.rego'), 'package test');

      const result = loadPolicyBundle(bundleDir);
      expect(result.valid).toBe(true);
    });

    it('returns invalid for directory without policy.rego', () => {
      const bundleDir = path.join(tempDir, 'empty-bundle');
      fs.mkdirSync(bundleDir);

      const result = loadPolicyBundle(bundleDir);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('No policy.rego found');
    });

    it('returns invalid for non-existent path', () => {
      const result = loadPolicyBundle('/nonexistent/path');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Policy bundle not found');
    });
  });

  describe('PolicyGate', () => {
    describe('CI mode without policy', () => {
      it('throws PolicyError with exit code 2', () => {
        const gate = new PolicyGate({
          ci: true,
          policyBundle: undefined,
          repoRoot: tempDir,
        });

        expect(() => gate.initialize()).toThrow(PolicyError);

        try {
          gate.initialize();
        } catch (error) {
          expect(error).toBeInstanceOf(PolicyError);
          const policyError = error as PolicyError;
          expect(policyError.exitCode).toBe(POLICY_EXIT_CODE);
          expect(policyError.reasons).toContain('ci_mode_requires_policy');
        }
      });

      it('error message indicates policy is required', () => {
        const gate = new PolicyGate({
          ci: true,
          policyBundle: undefined,
          repoRoot: tempDir,
        });

        try {
          gate.initialize();
          fail('Should have thrown');
        } catch (error) {
          const policyError = error as PolicyError;
          expect(policyError.message).toContain('Policy bundle required');
        }
      });
    });

    describe('non-CI mode without policy', () => {
      it('allows operations by default', () => {
        const gate = new PolicyGate({
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
        const gate = new PolicyGate({
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
      const error = new PolicyError(
        'Test error',
        ['reason_z', 'reason_a', 'reason_m']
      );

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
      const error = new PolicyError('Test', ['reason'], POLICY_EXIT_CODE);
      expect(error.exitCode).toBe(2);
    });
  });

  describe('stableStringify', () => {
    it('produces consistent output regardless of key order', () => {
      const obj1 = { z: 1, a: 2, m: 3 };
      const obj2 = { a: 2, z: 1, m: 3 };

      expect(stableStringify(obj1)).toBe(stableStringify(obj2));
    });
  });
});
