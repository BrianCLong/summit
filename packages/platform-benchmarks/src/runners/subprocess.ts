import { spawn } from 'node:child_process';
import type { BenchmarkResult, BenchmarkConfig } from '../types.js';

/**
 * Options for subprocess runner
 */
export interface SubprocessOptions {
  /** Command to run */
  command: string;
  /** Arguments */
  args?: string[];
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Subprocess runner for Python and Go benchmarks
 *
 * Executes benchmarks in separate processes and parses JSON output
 */
export class SubprocessRunner {
  private options: SubprocessOptions;

  constructor(options: SubprocessOptions) {
    this.options = {
      timeout: 60000,
      ...options,
    };
  }

  /**
   * Run the subprocess benchmark
   */
  async run(): Promise<BenchmarkResult[]> {
    return new Promise((resolve, reject) => {
      const { command, args = [], cwd, env, timeout } = this.options;

      const child = spawn(command, args, {
        cwd,
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Subprocess timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);

        if (code !== 0) {
          reject(new Error(`Subprocess exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          // Parse JSON results from stdout
          const results = JSON.parse(stdout) as BenchmarkResult[];
          resolve(results);
        } catch (error) {
          reject(new Error(`Failed to parse benchmark results: ${error}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Create a Python benchmark runner
   */
  static python(scriptPath: string, options?: Partial<SubprocessOptions>): SubprocessRunner {
    return new SubprocessRunner({
      command: 'python',
      args: [scriptPath, '--output', 'json'],
      ...options,
    });
  }

  /**
   * Create a Go benchmark runner
   */
  static go(binaryPath: string, options?: Partial<SubprocessOptions>): SubprocessRunner {
    return new SubprocessRunner({
      command: binaryPath,
      args: ['--output', 'json'],
      ...options,
    });
  }
}
