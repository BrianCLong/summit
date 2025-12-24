import { SandboxOptions } from './types.js';

export class PluginSandbox {
  constructor(private options: SandboxOptions = {}) {
    this.options = {
      timeoutMs: 5000,
      memoryLimitMb: 128,
      allowNetwork: false,
      ...options
    };
  }

  /**
   * Executes a function within a simulated sandbox.
   * Note: True process isolation requires more than this in-process implementation.
   * This provides basic guardrails like timeouts.
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    const { timeoutMs, memoryLimitMb, allowNetwork } = this.options;

    // Simulate memory check (best effort in Node.js within same process)
    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

    // Create a timeout promise
    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Plugin execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      // Race execution against timeout
      const result = await Promise.race([fn(), timeoutPromise]);

      const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const usedMemory = endMemory - startMemory;

      // Post-execution memory check (mostly for reporting/warning in this in-process model)
      if (memoryLimitMb && usedMemory > memoryLimitMb) {
        // We can't retroactively stop it, but we can warn or throw for the future
        // For strict enforcement, we'd need child_process or worker_threads.
        // The prompt asks for "hard timeouts + memory caps (best-effort)"
        console.warn(`Plugin exceeded memory soft limit: used ~${usedMemory.toFixed(2)}MB, limit ${memoryLimitMb}MB`);
      }

      return result;
    } finally {
      clearTimeout(timeoutHandle!);
    }
  }

  /**
   * Enforce network policy check.
   * Plugins should call this before making external requests.
   */
  checkNetworkAccess(host: string): void {
    if (!this.options.allowNetwork) {
      throw new Error(`Network access denied by sandbox policy. Target: ${host}`);
    }
  }
}
