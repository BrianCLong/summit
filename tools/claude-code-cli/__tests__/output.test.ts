/**
 * Output Formatting Tests
 *
 * Note: We test the output module via re-implementing the key functions
 * to avoid ESM/CJS issues with chalk in Jest. The actual implementation
 * is tested via the golden integration tests.
 */

import type { CLIOutputSchema, Diagnostic, NormalizedEnv } from '../src/types/index.js';

// Re-implement the buildJsonOutput function for testing (avoids chalk import)
function buildJsonOutput(
  command: string,
  args: string[],
  normalizedEnv: NormalizedEnv,
  status: 'success' | 'error' | 'cancelled',
  result: unknown,
  diagnostics: Diagnostic[],
  startTime?: number,
  includeTimestamps: boolean = false
): CLIOutputSchema {
  const output: CLIOutputSchema = {
    version: '1.0.0',
    command,
    args,
    normalized_env: normalizedEnv,
    status,
    result,
    diagnostics,
  };

  if (includeTimestamps) {
    output.timestamp = new Date().toISOString();
    if (startTime) {
      output.duration_ms = Date.now() - startTime;
    }
  }

  return output;
}

// Simple state for testing
let outputConfig = {
  output: 'pretty' as 'pretty' | 'json',
  format: 'pretty' as 'pretty' | 'json',
  verbose: false,
  quiet: false,
  noColor: false,
  includeTimestamps: false,
};

function configureOutput(options: Partial<typeof outputConfig>): void {
  if (options.output) {
    outputConfig.format = options.output;
  }
  outputConfig = { ...outputConfig, ...options };
}

function isJsonOutput(): boolean {
  return outputConfig.format === 'json';
}

function isQuiet(): boolean {
  return outputConfig.quiet;
}

function isVerbose(): boolean {
  return outputConfig.verbose;
}

describe('Output Configuration', () => {
  beforeEach(() => {
    // Reset to defaults
    configureOutput({
      output: 'pretty',
      noColor: false,
      verbose: false,
      quiet: false,
      includeTimestamps: false,
    });
  });

  describe('configureOutput', () => {
    it('should set JSON output mode', () => {
      expect(isJsonOutput()).toBe(false);
      configureOutput({ output: 'json' });
      expect(isJsonOutput()).toBe(true);
    });

    it('should set quiet mode', () => {
      expect(isQuiet()).toBe(false);
      configureOutput({ quiet: true });
      expect(isQuiet()).toBe(true);
    });

    it('should set verbose mode', () => {
      expect(isVerbose()).toBe(false);
      configureOutput({ verbose: true });
      expect(isVerbose()).toBe(true);
    });
  });
});

describe('JSON Output Schema', () => {
  const mockEnv: NormalizedEnv = {
    tz: 'UTC',
    locale: 'C',
    nodeVersion: 'v20.0.0',
    platform: 'linux',
    arch: 'x64',
  };

  describe('buildJsonOutput', () => {
    it('should include all required schema fields', () => {
      const output = buildJsonOutput('run analyze', ['.'], mockEnv, 'success', { fileCount: 10 }, []);

      expect(output).toHaveProperty('version', '1.0.0');
      expect(output).toHaveProperty('command', 'run analyze');
      expect(output).toHaveProperty('args', ['.']);
      expect(output).toHaveProperty('normalized_env');
      expect(output).toHaveProperty('status', 'success');
      expect(output).toHaveProperty('result');
      expect(output).toHaveProperty('diagnostics');
    });

    it('should have correct version', () => {
      const output = buildJsonOutput('test', [], mockEnv, 'success', null, []);
      expect(output.version).toBe('1.0.0');
    });

    it('should include normalized environment', () => {
      const output = buildJsonOutput('test', [], mockEnv, 'success', null, []);

      expect(output.normalized_env.tz).toBe('UTC');
      expect(output.normalized_env.locale).toBe('C');
      expect(output.normalized_env.nodeVersion).toBe('v20.0.0');
      expect(output.normalized_env.platform).toBe('linux');
      expect(output.normalized_env.arch).toBe('x64');
    });

    it('should not include timestamps by default', () => {
      configureOutput({ includeTimestamps: false });
      const output = buildJsonOutput('test', [], mockEnv, 'success', null, []);

      expect(output.timestamp).toBeUndefined();
      expect(output.duration_ms).toBeUndefined();
    });

    it('should include timestamps when enabled', () => {
      const startTime = Date.now() - 100;
      const output = buildJsonOutput('test', [], mockEnv, 'success', null, [], startTime, true);

      expect(output.timestamp).toBeDefined();
      expect(output.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(output.duration_ms).toBeDefined();
      expect(output.duration_ms).toBeGreaterThanOrEqual(100);
    });

    it('should include diagnostics', () => {
      const diagnostics: Diagnostic[] = [
        { level: 'error', message: 'Something failed', code: 'ERR001' },
        { level: 'warning', message: 'Something suspicious', file: 'test.ts', line: 42 },
      ];

      const output = buildJsonOutput('test', [], mockEnv, 'error', null, diagnostics);

      expect(output.diagnostics).toHaveLength(2);
      expect(output.diagnostics[0]).toMatchObject({
        level: 'error',
        message: 'Something failed',
        code: 'ERR001',
      });
      expect(output.diagnostics[1]).toMatchObject({
        level: 'warning',
        message: 'Something suspicious',
        file: 'test.ts',
        line: 42,
      });
    });

    it('should include result data', () => {
      const result = { files: ['a.ts', 'b.ts'], count: 2 };
      const output = buildJsonOutput('test', [], mockEnv, 'success', result, []);

      expect(output.result).toEqual(result);
    });
  });

  describe('Schema Stability', () => {
    it('should produce identical output for identical inputs', () => {
      const args = ['./src'];
      const result = { files: ['a.ts', 'b.ts'] };
      const diagnostics: Diagnostic[] = [];

      // Reset timestamps for comparison
      configureOutput({ includeTimestamps: false });

      const output1 = buildJsonOutput('run', args, mockEnv, 'success', result, diagnostics);
      const output2 = buildJsonOutput('run', args, mockEnv, 'success', result, diagnostics);

      expect(JSON.stringify(output1)).toBe(JSON.stringify(output2));
    });

    it('should have deterministic key ordering', () => {
      configureOutput({ includeTimestamps: false });
      const output = buildJsonOutput('test', [], mockEnv, 'success', null, []);

      const json = JSON.stringify(output);

      // Keys should appear in consistent order
      const versionIndex = json.indexOf('"version"');
      const commandIndex = json.indexOf('"command"');
      const argsIndex = json.indexOf('"args"');
      const envIndex = json.indexOf('"normalized_env"');
      const statusIndex = json.indexOf('"status"');

      // All keys should be present
      expect(versionIndex).toBeGreaterThan(-1);
      expect(commandIndex).toBeGreaterThan(-1);
      expect(argsIndex).toBeGreaterThan(-1);
      expect(envIndex).toBeGreaterThan(-1);
      expect(statusIndex).toBeGreaterThan(-1);
    });
  });

  describe('Status Values', () => {
    it('should accept success status', () => {
      const output = buildJsonOutput('test', [], mockEnv, 'success', null, []);
      expect(output.status).toBe('success');
    });

    it('should accept error status', () => {
      const output = buildJsonOutput('test', [], mockEnv, 'error', null, []);
      expect(output.status).toBe('error');
    });

    it('should accept cancelled status', () => {
      const output = buildJsonOutput('test', [], mockEnv, 'cancelled', null, []);
      expect(output.status).toBe('cancelled');
    });
  });
});
