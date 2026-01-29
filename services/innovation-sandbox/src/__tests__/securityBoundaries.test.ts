import { describe, it, expect, beforeEach } from 'vitest';
import { SecureSandbox } from '../sandbox/SecureSandbox.js';
import {
  SandboxConfig,
  IsolationLevel,
  DataClassification,
  CodeSubmission,
  SensitiveDataType,
} from '../types/index.js';

describe('Sandbox security boundaries', () => {
  let sandbox: SecureSandbox;
  let config: SandboxConfig;

  beforeEach(() => {
    config = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Boundary Sandbox',
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

  it('blocks SSRF attempts against metadata endpoints', async () => {
    const submission: CodeSubmission = {
      sandboxId: config.id,
      code: `
        const url = "http://169.254.169.254/latest/meta-data";
        return url;
      `,
      language: 'javascript',
      entryPoint: 'main',
      inputs: {},
      metadata: {},
    };

    const result = await sandbox.execute(submission);

    expect(result.status).toBe('blocked');
    expect(result.sensitiveDataFlags.some(flag => flag.type === SensitiveDataType.SECURITY)).toBe(true);
  });

  it('blocks path traversal payloads', async () => {
    const submission: CodeSubmission = {
      sandboxId: config.id,
      code: 'return inputs.path;',
      language: 'javascript',
      entryPoint: 'main',
      inputs: { path: '../../etc/passwd' },
      metadata: {},
    };

    const result = await sandbox.execute(submission);

    expect(result.status).toBe('blocked');
    expect(result.sensitiveDataFlags.some(flag => flag.type === SensitiveDataType.SECURITY)).toBe(true);
  });

  it('blocks injection payloads', async () => {
    const submission: CodeSubmission = {
      sandboxId: config.id,
      code: 'return inputs.query;',
      language: 'javascript',
      entryPoint: 'main',
      inputs: { query: "' OR 1=1; DROP TABLE users; --" },
      metadata: {},
    };

    const result = await sandbox.execute(submission);

    expect(result.status).toBe('blocked');
    expect(result.sensitiveDataFlags.some(flag => flag.type === SensitiveDataType.SECURITY)).toBe(true);
  });
});
