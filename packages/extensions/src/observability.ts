export type LogLevel = "info" | "warn" | "error" | "debug";

export interface ExtensionLogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  args?: any[];
}

export interface ExtensionTrace {
  name: string;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface ExtensionMetrics {
  activations: number;
  failures: number;
  averageActivationMs: number;
  logs: ExtensionLogEntry[];
  traces: ExtensionTrace[];
}

export class ExtensionObservability {
  private metrics: Map<string, ExtensionMetrics> = new Map();

  recordActivation(extensionName: string, durationMs: number): void {
    const metrics = this.ensureMetrics(extensionName);
    metrics.activations += 1;
    metrics.averageActivationMs =
      (metrics.averageActivationMs * (metrics.activations - 1) + durationMs) / metrics.activations;
  }

  recordFailure(extensionName: string, error: string): void {
    const metrics = this.ensureMetrics(extensionName);
    metrics.failures += 1;
    this.recordTrace(extensionName, "activation", 0, false, error);
  }

  recordTrace(
    extensionName: string,
    name: string,
    durationMs: number,
    success: boolean,
    error?: string
  ): void {
    const metrics = this.ensureMetrics(extensionName);
    metrics.traces.push({ name, durationMs, success, error });
  }

  recordLog(extensionName: string, level: LogLevel, message: string, ...args: any[]): void {
    const metrics = this.ensureMetrics(extensionName);
    metrics.logs.push({ level, message, timestamp: Date.now(), args });
  }

  getMetrics(extensionName: string): ExtensionMetrics {
    return this.ensureMetrics(extensionName);
  }

  private ensureMetrics(extensionName: string): ExtensionMetrics {
    const existing = this.metrics.get(extensionName);
    if (existing) return existing;
    const metrics: ExtensionMetrics = {
      activations: 0,
      failures: 0,
      averageActivationMs: 0,
      logs: [],
      traces: [],
    };
    this.metrics.set(extensionName, metrics);
    return metrics;
  }
}
