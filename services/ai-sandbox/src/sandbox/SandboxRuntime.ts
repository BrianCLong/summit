import * as vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import type { ResourceQuotas, ExecutionStatus } from '../types.js';
import { logger } from '../utils/logger.js';

export interface SandboxContext {
  input: unknown;
  config: Record<string, unknown>;
  console: {
    log: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
}

export interface SandboxExecutionResult {
  id: string;
  status: ExecutionStatus;
  output: unknown;
  logs: string[];
  error?: string;
  resourceUsage: {
    cpuMs: number;
    memoryPeakMb: number;
    durationMs: number;
    outputBytes: number;
  };
}

const ALLOWED_GLOBALS = ['Math', 'Date', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Error', 'TypeError', 'RangeError', 'setTimeout', 'clearTimeout', 'Promise'];

export class SandboxRuntime {
  private quotas: ResourceQuotas;
  private logs: string[] = [];

  constructor(quotas: ResourceQuotas) {
    this.quotas = quotas;
  }

  async execute(
    code: string,
    input: unknown,
    config: Record<string, unknown> = {},
  ): Promise<SandboxExecutionResult> {
    const executionId = randomUUID();
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage().heapUsed;
    this.logs = [];

    logger.info({ executionId, codeLength: code.length }, 'Starting sandbox execution');

    // Static analysis - block dangerous patterns
    const blockedPatterns = [
      /require\s*\(/,
      /import\s+/,
      /process\./,
      /global\./,
      /eval\s*\(/,
      /Function\s*\(/,
      /child_process/,
      /fs\./,
      /net\./,
      /http\./,
      /https\./,
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(code)) {
        return {
          id: executionId,
          status: 'failed',
          output: null,
          logs: this.logs,
          error: `Security violation: Blocked pattern detected (${pattern.source})`,
          resourceUsage: {
            cpuMs: 0,
            memoryPeakMb: 0,
            durationMs: 0,
            outputBytes: 0,
          },
        };
      }
    }

    // Create sandboxed context
    const sandboxContext: SandboxContext = {
      input,
      config,
      console: {
        log: (...args) => this.logs.push(`[LOG] ${args.join(' ')}`),
        warn: (...args) => this.logs.push(`[WARN] ${args.join(' ')}`),
        error: (...args) => this.logs.push(`[ERROR] ${args.join(' ')}`),
      },
    };

    // Add allowed globals
    const contextGlobals: Record<string, unknown> = {};
    for (const name of ALLOWED_GLOBALS) {
      contextGlobals[name] = (globalThis as Record<string, unknown>)[name];
    }

    const vmContext = vm.createContext({
      ...contextGlobals,
      ...sandboxContext,
    });

    const wrappedCode = `
      (async function sandboxMain() {
        ${code}
      })();
    `;

    try {
      const script = new vm.Script(wrappedCode, {
        filename: `sandbox-${executionId}.js`,
      });

      const resultPromise = script.runInContext(vmContext, {
        timeout: this.quotas.cpuMs,
        displayErrors: true,
      });

      // Wall-clock timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), this.quotas.timeoutMs);
      });

      const output = await Promise.race([resultPromise, timeoutPromise]);

      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage().heapUsed;
      const durationMs = Number(endTime - startTime) / 1_000_000;
      const memoryPeakMb = Math.max(0, (endMemory - startMemory) / (1024 * 1024));

      const outputStr = JSON.stringify(output);
      const outputBytes = Buffer.byteLength(outputStr, 'utf8');

      if (outputBytes > this.quotas.maxOutputBytes) {
        return {
          id: executionId,
          status: 'failed',
          output: null,
          logs: this.logs,
          error: `Output size (${outputBytes} bytes) exceeds limit (${this.quotas.maxOutputBytes} bytes)`,
          resourceUsage: {
            cpuMs: durationMs,
            memoryPeakMb,
            durationMs,
            outputBytes,
          },
        };
      }

      logger.info({ executionId, durationMs, memoryPeakMb }, 'Sandbox execution completed');

      return {
        id: executionId,
        status: 'completed',
        output,
        logs: this.logs,
        resourceUsage: {
          cpuMs: durationMs,
          memoryPeakMb,
          durationMs,
          outputBytes,
        },
      };
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      // Handle errors from VM context which may not be instanceof Error
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String((error as { message: unknown }).message);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      logger.error({ executionId, error: errorMessage }, 'Sandbox execution failed');

      // Detect timeout from various sources
      const isTimeout =
        errorMessage.toLowerCase().includes('timeout') ||
        errorMessage.includes('Script execution timed out') ||
        errorMessage.includes('execution time');

      return {
        id: executionId,
        status: isTimeout ? 'timeout' : 'failed',
        output: null,
        logs: this.logs,
        error: errorMessage,
        resourceUsage: {
          cpuMs: durationMs,
          memoryPeakMb: 0,
          durationMs,
          outputBytes: 0,
        },
      };
    }
  }
}
