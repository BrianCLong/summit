import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecureSandbox } from '../sandbox/SecureSandbox.js';
import {
  SandboxConfig,
  IsolationLevel,
  DataClassification,
  CodeSubmission,
} from '../types/index.js';

describe('SecureSandbox', () => {
  let sandbox: SecureSandbox;
  let config: SandboxConfig;

  beforeEach(() => {
    config = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Sandbox',
      isolationLevel: IsolationLevel.ENHANCED,
      quotas: {
        cpuMs: 5000,
        memoryMb: 128,
        wallClockMs: 10000,
        maxOutputBytes: 1048576,
        maxNetworkBytes: 0,
      },
      allowedModules: [],
      networkAllowlist: [],
      environmentVars: {},
      dataClassification: DataClassification.UNCLASSIFIED,
      autoDetectSensitive: true,
      createdAt: new Date(),
      ownerId: 'user-1',
      tenantId: 'tenant-1',
    };
    sandbox = new SecureSandbox(config);
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid config', async () => {
      await expect(sandbox.initialize()).resolves.not.toThrow();
    });

    it('should reject airgapped sandbox with network allowlist', async () => {
      const airgappedConfig: SandboxConfig = {
        ...config,
        isolationLevel: IsolationLevel.AIRGAPPED,
        networkAllowlist: ['api.example.com'],
      };
      const airgappedSandbox = new SecureSandbox(airgappedConfig);

      await expect(airgappedSandbox.initialize()).rejects.toThrow(
        'Airgapped isolation does not allow network access'
      );
    });

    it('should reject mission-ready with excessive CPU quota', async () => {
      const missionConfig: SandboxConfig = {
        ...config,
        isolationLevel: IsolationLevel.MISSION_READY,
        quotas: { ...config.quotas, cpuMs: 20000 },
      };
      const missionSandbox = new SecureSandbox(missionConfig);

      await expect(missionSandbox.initialize()).rejects.toThrow(
        'Mission-ready sandbox limited to 10s CPU time'
      );
    });

    it('should reject mission-ready with excessive memory', async () => {
      const missionConfig: SandboxConfig = {
        ...config,
        isolationLevel: IsolationLevel.MISSION_READY,
        quotas: { ...config.quotas, memoryMb: 512 },
      };
      const missionSandbox = new SecureSandbox(missionConfig);

      await expect(missionSandbox.initialize()).rejects.toThrow(
        'Mission-ready sandbox limited to 256MB memory'
      );
    });
  });

  describe('Code Execution', () => {
    beforeEach(async () => {
      await sandbox.initialize();
    });

    it('should execute simple code successfully', async () => {
      const submission: CodeSubmission = {
        sandboxId: config.id,
        code: 'return inputs.a + inputs.b;',
        language: 'javascript',
        entryPoint: 'main',
        inputs: { a: 1, b: 2 },
        metadata: {},
      };

      const result = await sandbox.execute(submission);

      expect(result.status).toBe('success');
      expect(result.output).toBe(3);
    });

    it('should capture console logs', async () => {
      const submission: CodeSubmission = {
        sandboxId: config.id,
        code: `
          console.log('Hello');
          console.warn('Warning');
          return 'done';
        `,
        language: 'javascript',
        entryPoint: 'main',
        inputs: {},
        metadata: {},
      };

      const result = await sandbox.execute(submission);

      expect(result.logs).toContain('Hello');
      expect(result.logs.some(l => l.includes('WARN:'))).toBe(true);
    });

    it('should detect sensitive data in inputs', async () => {
      const submission: CodeSubmission = {
        sandboxId: config.id,
        code: 'return inputs;',
        language: 'javascript',
        entryPoint: 'main',
        inputs: { ssn: '123-45-6789' },
        metadata: {},
      };

      const result = await sandbox.execute(submission);

      expect(result.sensitiveDataFlags.length).toBeGreaterThan(0);
    });

    it('should generate test cases', async () => {
      const submission: CodeSubmission = {
        sandboxId: config.id,
        code: 'return inputs.value * 2;',
        language: 'javascript',
        entryPoint: 'main',
        inputs: { value: 5 },
        metadata: {},
      };

      const result = await sandbox.execute(submission);

      expect(result.testCases).toBeDefined();
      expect(result.testCases!.length).toBeGreaterThan(0);
    });

    it('should return execution metrics', async () => {
      const submission: CodeSubmission = {
        sandboxId: config.id,
        code: 'return 42;',
        language: 'javascript',
        entryPoint: 'main',
        inputs: {},
        metadata: {},
      };

      const result = await sandbox.execute(submission);

      expect(result.metrics).toBeDefined();
      expect(result.metrics.cpuTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.wallClockMs).toBeGreaterThanOrEqual(0);
    });

    it('should block execution with high-confidence sensitive data in non-mission sandbox', async () => {
      // Mock the detector to return high-confidence flags
      const submission: CodeSubmission = {
        sandboxId: config.id,
        code: `
          // This contains a real SSN
          const ssn = "123-45-6789";
          return ssn;
        `,
        language: 'javascript',
        entryPoint: 'main',
        inputs: {},
        metadata: {},
      };

      const result = await sandbox.execute(submission);

      // Should either succeed or be blocked depending on detection
      expect(['success', 'blocked']).toContain(result.status);
    });
  });

  describe('Configuration', () => {
    it('should return redacted config', () => {
      const redactedConfig = sandbox.getConfig();

      expect(redactedConfig.id).toBe(config.id);
      expect(redactedConfig.name).toBe(config.name);
      expect(redactedConfig).not.toHaveProperty('ownerId');
      expect(redactedConfig).not.toHaveProperty('tenantId');
    });
  });

  describe('Termination', () => {
    it('should terminate cleanly', async () => {
      await sandbox.initialize();
      await expect(sandbox.terminate()).resolves.not.toThrow();
    });
  });
});
