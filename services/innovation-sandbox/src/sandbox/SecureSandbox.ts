import { randomUUID } from 'crypto';
import {
  SandboxConfig,
  CodeSubmission,
  ExecutionResult,
  ExecutionMetrics,
  IsolationLevel,
  SandboxQuota,
} from '../types/index.js';
import { SensitiveDataDetector } from '../detector/SensitiveDataDetector.js';
import { TestCaseGenerator } from '../generator/TestCaseGenerator.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('SecureSandbox');

/**
 * SecureSandbox provides isolated execution environment for rapid prototyping
 * with automatic sensitive data detection and test case generation.
 */
export class SecureSandbox {
  private config: SandboxConfig;
  private detector: SensitiveDataDetector;
  private testGenerator: TestCaseGenerator;
  private isInitialized = false;

  constructor(config: SandboxConfig) {
    this.config = config;
    this.detector = new SensitiveDataDetector();
    this.testGenerator = new TestCaseGenerator();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    logger.info('Initializing sandbox', {
      id: this.config.id,
      isolationLevel: this.config.isolationLevel,
    });

    // Validate configuration based on isolation level
    this.validateConfig();
    this.isInitialized = true;
  }

  private validateConfig(): void {
    const { isolationLevel, quotas, networkAllowlist } = this.config;

    // Airgapped mode: no network allowed
    if (isolationLevel === IsolationLevel.AIRGAPPED && networkAllowlist.length > 0) {
      throw new Error('Airgapped isolation does not allow network access');
    }

    // Mission-ready: stricter quotas
    if (isolationLevel === IsolationLevel.MISSION_READY) {
      if (quotas.cpuMs > 10000) {
        throw new Error('Mission-ready sandbox limited to 10s CPU time');
      }
      if (quotas.memoryMb > 256) {
        throw new Error('Mission-ready sandbox limited to 256MB memory');
      }
    }
  }

  /**
   * Execute code in the isolated sandbox environment
   */
  async execute(submission: CodeSubmission): Promise<ExecutionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const executionId = randomUUID();
    const startTime = Date.now();
    const logs: string[] = [];

    logger.info('Starting execution', { executionId, sandboxId: this.config.id });

    try {
      // Phase 1: Pre-execution sensitive data scan
      const inputFlags = await this.detector.scanInputs(submission.inputs);
      if (inputFlags.length > 0) {
        logger.warn('Sensitive data detected in inputs', {
          executionId,
          flagCount: inputFlags.length,
        });
      }

      // Phase 2: Static code analysis
      const codeFlags = await this.detector.scanCode(submission.code);

      // Phase 3: Execute in isolation
      const { output, metrics } = await this.executeInIsolation(submission, logs);

      // Phase 4: Output scanning
      const outputFlags = await this.detector.scanOutput(output);

      // Phase 5: Generate test cases (if enabled)
      const testCases = this.config.isolationLevel !== IsolationLevel.AIRGAPPED
        ? await this.testGenerator.generateFromExecution(submission, output)
        : undefined;

      const allFlags = [...inputFlags, ...codeFlags, ...outputFlags];

      // Block execution if mission-critical data in non-mission sandbox
      if (
        this.config.isolationLevel !== IsolationLevel.MISSION_READY &&
        allFlags.some(f => f.confidence > 0.9)
      ) {
        return {
          sandboxId: this.config.id,
          executionId,
          status: 'blocked',
          output: null,
          logs: [...logs, 'Execution blocked: High-confidence sensitive data detected'],
          metrics: this.createMetrics(startTime, 0),
          sensitiveDataFlags: allFlags,
          timestamp: new Date(),
        };
      }

      return {
        sandboxId: this.config.id,
        executionId,
        status: 'success',
        output,
        logs,
        metrics,
        sensitiveDataFlags: allFlags,
        testCases,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Execution failed', { executionId, error: errorMessage });

      return {
        sandboxId: this.config.id,
        executionId,
        status: this.categorizeError(error),
        output: null,
        logs: [...logs, `Error: ${errorMessage}`],
        metrics: this.createMetrics(startTime, 0),
        sensitiveDataFlags: [],
        timestamp: new Date(),
      };
    }
  }

  private async executeInIsolation(
    submission: CodeSubmission,
    logs: string[]
  ): Promise<{ output: unknown; metrics: ExecutionMetrics }> {
    const startTime = Date.now();
    const { quotas } = this.config;

    // Create isolated context with resource limits
    const context = this.createIsolatedContext(quotas, logs);

    // Transform code based on language
    const executableCode = this.prepareCode(submission);

    // Execute with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), quotas.wallClockMs);
    });

    const executionPromise = this.runInContext(executableCode, context, submission.inputs);

    const output = await Promise.race([executionPromise, timeoutPromise]);

    const metrics = this.createMetrics(startTime, JSON.stringify(output).length);

    return { output, metrics };
  }

  private createIsolatedContext(
    quotas: SandboxQuota,
    logs: string[]
  ): Record<string, unknown> {
    // Minimal safe globals based on isolation level
    const safeGlobals: Record<string, unknown> = {
      console: {
        log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
        warn: (...args: unknown[]) => logs.push(`WARN: ${args.map(String).join(' ')}`),
        error: (...args: unknown[]) => logs.push(`ERROR: ${args.map(String).join(' ')}`),
      },
      JSON: JSON,
      Math: Math,
      Date: Date,
      Array: Array,
      Object: Object,
      String: String,
      Number: Number,
      Boolean: Boolean,
      Map: Map,
      Set: Set,
      Promise: Promise,
    };

    // Add allowed modules if not airgapped
    if (this.config.isolationLevel !== IsolationLevel.AIRGAPPED) {
      for (const moduleName of this.config.allowedModules) {
        // Only allow safe, pre-approved modules
        if (this.isSafeModule(moduleName)) {
          safeGlobals[moduleName] = this.loadSafeModule(moduleName);
        }
      }
    }

    return safeGlobals;
  }

  private isSafeModule(name: string): boolean {
    const safeModules = ['lodash', 'date-fns', 'uuid', 'zod'];
    return safeModules.includes(name);
  }

  private loadSafeModule(name: string): unknown {
    // In production, this would dynamically load pre-vetted modules
    return {};
  }

  private prepareCode(submission: CodeSubmission): string {
    // Wrap code in async function for consistent execution
    return `
      (async function ${submission.entryPoint}(inputs) {
        ${submission.code}
      })
    `;
  }

  private async runInContext(
    code: string,
    context: Record<string, unknown>,
    inputs: Record<string, unknown>
  ): Promise<unknown> {
    // In production, use isolated-vm or similar
    // This is a simplified implementation for demonstration
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);

    const fn = new AsyncFunction(...contextKeys, 'inputs', `
      "use strict";
      return ${code}(inputs);
    `);

    return fn(...contextValues, inputs);
  }

  private createMetrics(startTime: number, outputBytes: number): ExecutionMetrics {
    return {
      cpuTimeMs: Date.now() - startTime, // Approximation
      wallClockMs: Date.now() - startTime,
      memoryPeakMb: process.memoryUsage().heapUsed / 1024 / 1024,
      outputBytes,
    };
  }

  private categorizeError(error: unknown): ExecutionResult['status'] {
    if (error instanceof Error) {
      if (error.message === 'TIMEOUT') return 'timeout';
      if (error.message.includes('memory')) return 'resource_exceeded';
    }
    return 'error';
  }

  /**
   * Get sandbox configuration (redacted for security)
   */
  getConfig(): Partial<SandboxConfig> {
    return {
      id: this.config.id,
      name: this.config.name,
      isolationLevel: this.config.isolationLevel,
      dataClassification: this.config.dataClassification,
      createdAt: this.config.createdAt,
      expiresAt: this.config.expiresAt,
    };
  }

  /**
   * Terminate sandbox and cleanup resources
   */
  async terminate(): Promise<void> {
    logger.info('Terminating sandbox', { id: this.config.id });
    this.isInitialized = false;
  }
}
