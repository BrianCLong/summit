import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Executor, ExecutionError } from '../executor.js';
import { execa } from 'execa';

// Mock execa
jest.mock('execa');

describe('Executor', () => {
  let mockOutput;
  let mockConfig;
  let executor;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock output formatter
    mockOutput = {
      debug: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
      format: 'human',
    };

    // Create mock config
    mockConfig = {
      dev: {
        composeFile: './compose/docker-compose.yml',
        profiles: ['default'],
      },
    };

    executor = new Executor(mockOutput, mockConfig);
  });

  describe('constructor', () => {
    it('should require output formatter', () => {
      expect(() => new Executor(null, mockConfig)).toThrow('Output formatter is required');
    });

    it('should require configuration', () => {
      expect(() => new Executor(mockOutput, null)).toThrow('Configuration is required');
    });

    it('should initialize with valid parameters', () => {
      expect(executor.output).toBe(mockOutput);
      expect(executor.config).toBe(mockConfig);
      expect(executor.projectRoot).toBeDefined();
      expect(executor.commandCache).toBeInstanceOf(Map);
    });
  });

  describe('validateCommand', () => {
    it('should accept valid command and args', () => {
      expect(() => executor.validateCommand('echo', ['hello'])).not.toThrow();
    });

    it('should reject empty command', () => {
      expect(() => executor.validateCommand('', [])).toThrow('Command must be a non-empty string');
    });

    it('should reject non-string command', () => {
      expect(() => executor.validateCommand(null, [])).toThrow('Command must be a non-empty string');
    });

    it('should reject non-array args', () => {
      expect(() => executor.validateCommand('echo', 'not-an-array')).toThrow('Arguments must be an array');
    });

    it('should reject invalid arg types', () => {
      expect(() => executor.validateCommand('echo', ['hello', {}, 'world'])).toThrow(
        'Argument at index 1 must be a string or number'
      );
    });

    it('should warn about dangerous commands', () => {
      executor.validateCommand('rm', ['-rf', '/']);
      expect(mockOutput.warning).toHaveBeenCalledWith('Dangerous command detected: rm');
    });

    it('should accept string and number args', () => {
      expect(() => executor.validateCommand('echo', ['hello', 123, 'world'])).not.toThrow();
    });
  });

  describe('validateOptions', () => {
    it('should set default timeout', () => {
      const options = executor.validateOptions({});
      expect(options.timeout).toBe(Executor.DEFAULT_TIMEOUT);
    });

    it('should accept valid timeout', () => {
      const options = executor.validateOptions({ timeout: 5000 });
      expect(options.timeout).toBe(5000);
    });

    it('should reject negative timeout', () => {
      expect(() => executor.validateOptions({ timeout: -1 })).toThrow('Timeout must be a positive number');
    });

    it('should cap excessive timeout', () => {
      const options = executor.validateOptions({ timeout: 999999999 });
      expect(options.timeout).toBe(Executor.MAX_TIMEOUT);
      expect(mockOutput.warning).toHaveBeenCalled();
    });

    it('should reject non-existent working directory', () => {
      expect(() => executor.validateOptions({ cwd: '/nonexistent/path' })).toThrow('Working directory does not exist');
    });

    it('should sanitize null/undefined env vars', () => {
      const options = executor.validateOptions({
        env: {
          KEY1: 'value1',
          KEY2: null,
          KEY3: undefined,
          KEY4: 'value4',
        },
      });

      expect(options.env).toEqual({
        KEY1: 'value1',
        KEY4: 'value4',
      });
    });
  });

  describe('exec', () => {
    it('should execute command successfully', async () => {
      execa.mockResolvedValue({
        exitCode: 0,
        stdout: 'success',
        stderr: '',
      });

      const result = await executor.exec('echo', ['hello']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('success');
      expect(result.duration).toBeDefined();
      expect(mockOutput.debug).toHaveBeenCalledWith('Executing: echo hello');
    });

    it('should throw ExecutionError on non-zero exit code', async () => {
      execa.mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'error occurred',
      });

      await expect(executor.exec('false')).rejects.toThrow(ExecutionError);
      await expect(executor.exec('false')).rejects.toThrow('Command failed with exit code 1');
    });

    it('should not throw on non-zero exit when ignoreExitCode is true', async () => {
      execa.mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'error occurred',
      });

      const result = await executor.exec('false', [], { ignoreExitCode: true });
      expect(result.exitCode).toBe(1);
    });

    it('should handle command not found error', async () => {
      execa.mockRejectedValue({
        code: 'ENOENT',
      });

      await expect(executor.exec('nonexistent')).rejects.toThrow(ExecutionError);
      await expect(executor.exec('nonexistent')).rejects.toThrow('Command not found: nonexistent');
    });

    it('should handle killed/timeout error', async () => {
      execa.mockRejectedValue({
        killed: true,
        signal: 'SIGTERM',
      });

      await expect(executor.exec('slow-command')).rejects.toThrow(ExecutionError);
      await expect(executor.exec('slow-command')).rejects.toThrow('Command was killed');
    });

    it('should include duration in error context', async () => {
      execa.mockRejectedValue({
        code: 'ENOENT',
      });

      try {
        await executor.exec('nonexistent');
      } catch (error) {
        expect(error.context.duration).toBeDefined();
        expect(error.context.command).toBe('nonexistent');
      }
    });
  });

  describe('execScript', () => {
    it('should require script path', async () => {
      await expect(executor.execScript('')).rejects.toThrow('Script path is required');
    });

    // Note: Full script execution tests would require actual filesystem
  });

  describe('execMake', () => {
    beforeEach(() => {
      // Mock commandExists to return true for make
      executor.commandExists = jest.fn().mockResolvedValue(true);
    });

    it('should require target', async () => {
      await expect(executor.execMake('')).rejects.toThrow('Make target is required');
    });

    it('should check if make is installed', async () => {
      executor.commandExists = jest.fn().mockResolvedValue(false);

      await expect(executor.execMake('test')).rejects.toThrow('make is not installed');
    });

    it('should execute make target', async () => {
      execa.mockResolvedValue({ exitCode: 0 });
      executor.exec = jest.fn().mockResolvedValue({ exitCode: 0 });

      await executor.execMake('test', ['arg1']);

      expect(executor.exec).toHaveBeenCalledWith('make', ['test', 'arg1'], {});
    });
  });

  describe('execJust', () => {
    beforeEach(() => {
      executor.commandExists = jest.fn().mockResolvedValue(true);
    });

    it('should require recipe', async () => {
      await expect(executor.execJust('')).rejects.toThrow('Just recipe is required');
    });

    it('should check if just is installed', async () => {
      executor.commandExists = jest.fn().mockResolvedValue(false);

      await expect(executor.execJust('test')).rejects.toThrow('just is not installed');
    });
  });

  describe('execNpm', () => {
    beforeEach(() => {
      executor.detectPackageManager = jest.fn().mockResolvedValue('pnpm');
      executor.exec = jest.fn().mockResolvedValue({ exitCode: 0 });
    });

    it('should require script name', async () => {
      await expect(executor.execNpm('')).rejects.toThrow('Script name is required');
    });

    it('should detect and use package manager', async () => {
      await executor.execNpm('test', ['--coverage']);

      expect(executor.detectPackageManager).toHaveBeenCalled();
      expect(executor.exec).toHaveBeenCalledWith('pnpm', ['run', 'test', '--coverage'], {});
    });
  });

  describe('execCompose', () => {
    beforeEach(() => {
      executor.commandExists = jest.fn().mockResolvedValue(true);
      executor.exec = jest.fn().mockResolvedValue({ exitCode: 0 });
      // Mock existsSync for compose file check
      jest.spyOn(executor, 'exec').mockResolvedValue({ exitCode: 0 });
    });

    it('should require command', async () => {
      await expect(executor.execCompose('')).rejects.toThrow('Docker compose command is required');
    });

    it('should check if docker is installed', async () => {
      executor.commandExists = jest.fn().mockResolvedValue(false);

      await expect(executor.execCompose('up')).rejects.toThrow('Docker is not installed');
    });
  });

  describe('detectPackageManager', () => {
    it('should detect pnpm if available', async () => {
      execa.mockResolvedValue({ exitCode: 0 });

      const pm = await executor.detectPackageManager();

      expect(pm).toBe('pnpm');
      expect(execa).toHaveBeenCalledWith('pnpm', ['--version'], expect.any(Object));
    });

    it('should fallback to npm if pnpm not available', async () => {
      execa.mockRejectedValue(new Error('not found'));

      const pm = await executor.detectPackageManager();

      expect(pm).toBe('npm');
    });

    it('should cache result', async () => {
      execa.mockResolvedValue({ exitCode: 0 });

      await executor.detectPackageManager();
      await executor.detectPackageManager();

      // Should only call execa once due to caching
      expect(execa).toHaveBeenCalledTimes(1);
    });
  });

  describe('commandExists', () => {
    it('should return true for existing command', async () => {
      execa.mockResolvedValue({ exitCode: 0 });

      const exists = await executor.commandExists('docker');

      expect(exists).toBe(true);
      expect(execa).toHaveBeenCalledWith('which', ['docker'], expect.any(Object));
    });

    it('should return false for non-existing command', async () => {
      execa.mockRejectedValue(new Error('not found'));

      const exists = await executor.commandExists('nonexistent');

      expect(exists).toBe(false);
    });

    it('should cache results', async () => {
      execa.mockResolvedValue({ exitCode: 0 });

      await executor.commandExists('docker');
      await executor.commandExists('docker');

      expect(execa).toHaveBeenCalledTimes(1);
    });

    it('should return false for empty command', async () => {
      const exists = await executor.commandExists('');
      expect(exists).toBe(false);
    });
  });

  describe('getComposeStatus', () => {
    beforeEach(() => {
      executor.execCompose = jest.fn();
    });

    it('should return empty array if no output', async () => {
      executor.execCompose.mockResolvedValue({ stdout: '' });

      const status = await executor.getComposeStatus();

      expect(status).toEqual([]);
    });

    it('should parse JSON output', async () => {
      const mockServices = [
        { name: 'postgres', status: 'running' },
        { name: 'redis', status: 'running' },
      ];
      executor.execCompose.mockResolvedValue({
        stdout: JSON.stringify(mockServices),
      });

      const status = await executor.getComposeStatus();

      expect(status).toEqual(mockServices);
    });

    it('should handle invalid JSON gracefully', async () => {
      executor.execCompose.mockResolvedValue({ stdout: 'invalid json' });

      const status = await executor.getComposeStatus();

      expect(status).toEqual([]);
      expect(mockOutput.debug).toHaveBeenCalledWith(expect.stringContaining('Failed to parse'));
    });

    it('should handle errors gracefully', async () => {
      executor.execCompose.mockRejectedValue(new Error('Docker not running'));

      const status = await executor.getComposeStatus();

      expect(status).toEqual([]);
      expect(mockOutput.debug).toHaveBeenCalledWith(expect.stringContaining('Failed to get compose status'));
    });
  });

  describe('clearCache', () => {
    it('should clear command cache', async () => {
      execa.mockResolvedValue({ exitCode: 0 });

      // Add something to cache
      await executor.commandExists('docker');
      expect(executor.commandCache.size).toBeGreaterThan(0);

      // Clear cache
      executor.clearCache();
      expect(executor.commandCache.size).toBe(0);
    });
  });
});

describe('ExecutionError', () => {
  it('should create error with message', () => {
    const error = new ExecutionError('Test error');

    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ExecutionError');
  });

  it('should include context', () => {
    const context = { command: 'test', exitCode: 1 };
    const error = new ExecutionError('Test error', context);

    expect(error.context).toEqual(context);
  });

  it('should include timestamp', () => {
    const error = new ExecutionError('Test error');

    expect(error.timestamp).toBeDefined();
    expect(new Date(error.timestamp)).toBeInstanceOf(Date);
  });

  it('should serialize to JSON', () => {
    const error = new ExecutionError('Test error', { command: 'test' });
    const json = error.toJSON();

    expect(json.name).toBe('ExecutionError');
    expect(json.message).toBe('Test error');
    expect(json.context).toEqual({ command: 'test' });
    expect(json.timestamp).toBeDefined();
    expect(json.stack).toBeDefined();
  });
});
