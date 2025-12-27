
import { ActionSandbox, SandboxConfig } from '../../src/autonomous/sandbox';
import { Logger } from 'pino';
import { EventEmitter } from 'events';

// Mock pino logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

import { spawn } from 'child_process';

describe('ActionSandbox', () => {
  let sandbox: ActionSandbox;
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

  beforeEach(() => {
    jest.clearAllMocks();
    sandbox = new ActionSandbox(mockLogger);
    (spawn as jest.Mock).mockImplementation(() => {
        const ee = new EventEmitter();
        (ee as any).stdout = new EventEmitter();
        (ee as any).stderr = new EventEmitter();
        (ee as any).kill = jest.fn();
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
        jest.useFakeTimers();
        const killMock = jest.fn();

        (spawn as jest.Mock).mockImplementation(() => {
            const ee = new EventEmitter();
            (ee as any).stdout = new EventEmitter();
            (ee as any).stderr = new EventEmitter();
            (ee as any).kill = killMock;
            // Never close automatically
            return ee;
        });

        const execPromise = sandbox.execute({
            id: 'test-timeout',
            command: ['sleep', '10'],
            config: { ...defaultConfig, timeoutMs: 100 },
            artifacts: new Map(),
            logger: mockLogger,
        });

        jest.advanceTimersByTime(200);

        // We need to trigger close to resolve promise in our mock
        // In real life, SIGKILL would cause close
        const spawnCall = (spawn as jest.Mock).mock.results[0].value;
        spawnCall.emit('close', 137); // SIGKILL exit code

        const result = await execPromise;

        expect(killMock).toHaveBeenCalledWith('SIGKILL');
        expect(result.violations).toEqual(
            expect.arrayContaining([expect.stringMatching(/Execution timeout/)])
        );

        jest.useRealTimers();
      });
  });
});
