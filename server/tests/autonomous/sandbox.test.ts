
import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { ActionSandbox, SandboxConfig } from '../../src/autonomous/sandbox';
import type { Logger } from 'pino';
import { EventEmitter } from 'events';

// Mock pino logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

// Mock child_process
const spawnMock = jest.fn();

jest.unstable_mockModule('child_process', () => ({
  spawn: spawnMock,
}));

describe('ActionSandbox', () => {
  let ActionSandbox: typeof import('../../src/autonomous/sandbox').ActionSandbox;
  let sandbox: InstanceType<typeof ActionSandbox>;
  let spawn: typeof spawnMock;
  const defaultConfig: SandboxConfig = {
    timeoutMs: 1000,
    maxMemoryMB: 128,
    maxCpuPercent: 50,
    networkPolicy: 'none',
    allowedHosts: [],
    allowedPorts: [],
    workingDir: '/work',
    readOnlyPaths: [],
    environment: {},
  };

  beforeAll(async () => {
    ({ ActionSandbox } = await import('../../src/autonomous/sandbox'));
    ({ spawn } = await import('child_process'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sandbox = new ActionSandbox(mockLogger);
    (sandbox as any).networkGuard = {
      monitor: () => ({ on: jest.fn(), stop: jest.fn() }),
    };
    jest.spyOn(sandbox as any, 'getContainerStats').mockResolvedValue(null);
    (spawn as jest.Mock).mockImplementation(() => {
        const ee = new EventEmitter();
        (ee as any).stdout = new EventEmitter();
        (ee as any).stderr = new EventEmitter();
        (ee as any).kill = jest.fn(() => ee.emit('close', 0));
        setTimeout(() => ee.emit('close', 0), 10);
        return ee;
    });
  });

  describe('buildDockerArgs', () => {
    it('should include resource limits', async () => {
      // We can't access private method directly, so we inspect spawn calls
      await sandbox.execute({
        id: 'test-id',
        command: ['echo', 'hello'],
        config: defaultConfig,
        artifacts: new Map(),
        logger: mockLogger,
      });

      const spawnCalls = (spawn as jest.Mock).mock.calls;
      const dockerCall = spawnCalls.find(call => call[0] === 'docker' && call[1].includes('run'));

      expect(dockerCall).toBeDefined();
      const args = dockerCall[1];

      expect(args).toContain('--memory');
      expect(args).toContain('128m');
      expect(args).toContain('--cpus');
      expect(args).toContain('0.5');
      expect(args).toContain('--network');
      expect(args).toContain('none');
    });
  });

  describe('Output Filtering', () => {
    it('should detect secrets in stdout', async () => {
       (spawn as jest.Mock).mockImplementation(() => {
        const ee = new EventEmitter();
        (ee as any).stdout = new EventEmitter();
        (ee as any).stderr = new EventEmitter();
        (ee as any).kill = jest.fn();

        setTimeout(() => {
            (ee as any).stdout.emit('data', 'Here is my API Key: sk-12345');
            ee.emit('close', 0);
        }, 10);
        return ee;
      });

      const result = await sandbox.execute({
        id: 'test-secret',
        command: ['echo', 'secret'],
        config: defaultConfig,
        artifacts: new Map(),
        logger: mockLogger,
      });

      expect(result.violations).toEqual(
        expect.arrayContaining([expect.stringMatching(/Suspicious output detected/)])
      );
    });
  });

  describe('Timeout', () => {
      it('should kill process on timeout', async () => {
        const killMock = jest.fn();
        const spawnedProcess = new EventEmitter();

        (spawn as jest.Mock).mockImplementation(() => {
            (spawnedProcess as any).stdout = new EventEmitter();
            (spawnedProcess as any).stderr = new EventEmitter();
            (spawnedProcess as any).kill = (...args: any[]) => {
                killMock(...args);
                setImmediate(() => spawnedProcess.emit('close', 137));
            };
            // Never close automatically
            return spawnedProcess;
        });

        const execPromise = sandbox.execute({
            id: 'test-timeout',
            command: ['sleep', '10'],
            config: { ...defaultConfig, timeoutMs: 100 },
            artifacts: new Map(),
            logger: mockLogger,
        });

        const result = await execPromise;

        expect(killMock).toHaveBeenCalledWith('SIGKILL');
        expect(result.violations).toEqual(
            expect.arrayContaining([expect.stringMatching(/Execution timeout/)])
        );

      });
  });
});
