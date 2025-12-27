/**
 * Soak Test Harness
 * Executes a sustained stream of requests with optional chaos injection
 */

import { AxiosInstance } from 'axios';
import { Logger } from '../utils/Logger.js';

export interface ChaosConfig {
  latencySpikeEvery?: number;
  latencySpikeDelayMs?: number;
  dependencyDownEvery?: number;
}

export interface SoakTestOptions {
  requestCount: number;
  targetErrorRate: number;
  concurrency?: number;
  payload: Record<string, any>;
  chaos?: ChaosConfig;
}

export interface SoakTestResult {
  startTime: string;
  endTime: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  errorRate: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  latencySpikesInjected: number;
  dependencyDownInjected: number;
  passed: boolean;
  errors: Array<{ index: number; message: string; status?: number }>;
}

export type SoakRequestExecutor = (requestIndex: number) => Promise<void>;

export class SoakTestHarness {
  private client: AxiosInstance;
  private logger: Logger;

  constructor(client: AxiosInstance, logger = new Logger('SoakTestHarness')) {
    this.client = client;
    this.logger = logger;
  }

  async run(
    options: SoakTestOptions,
    executor?: SoakRequestExecutor
  ): Promise<SoakTestResult> {
    const { requestCount, targetErrorRate, chaos } = options;
    const concurrency = Math.max(1, options.concurrency || 5);
    const latencies: number[] = [];
    const errors: Array<{ index: number; message: string; status?: number }> = [];
    let successCount = 0;
    let errorCount = 0;
    let latencySpikesInjected = 0;
    let dependencyDownInjected = 0;

    const startTime = Date.now();
    let currentIndex = 0;

    const performRequest = async (requestIndex: number) => {
      const shouldInjectLatency =
        !!chaos?.latencySpikeEvery &&
        chaos.latencySpikeEvery > 0 &&
        (requestIndex + 1) % chaos.latencySpikeEvery === 0;
      if (shouldInjectLatency) {
        latencySpikesInjected += 1;
        const delay = chaos?.latencySpikeDelayMs ?? 500;
        await this.delay(delay);
      }

      const shouldDropDependency =
        !!chaos?.dependencyDownEvery &&
        chaos.dependencyDownEvery > 0 &&
        (requestIndex + 1) % chaos.dependencyDownEvery === 0;

      const start = Date.now();
      try {
        if (shouldDropDependency) {
          dependencyDownInjected += 1;
          throw new Error('Simulated dependency outage');
        }

        if (executor) {
          await executor(requestIndex);
        } else {
          await this.client.post('', options.payload);
        }

        const duration = Date.now() - start;
        latencies.push(duration);
        successCount += 1;
      } catch (error: any) {
        const duration = Date.now() - start;
        latencies.push(duration);
        errorCount += 1;
        errors.push({
          index: requestIndex,
          message: error?.message || 'Unknown error',
          status: error?.response?.status,
        });
      }
    };

    const workers = Array.from({ length: concurrency }, async () => {
      while (currentIndex < requestCount) {
        const requestIndex = currentIndex;
        currentIndex += 1;
        await performRequest(requestIndex);
      }
    });

    await Promise.all(workers);

    const endTime = Date.now();
    const errorRate = requestCount > 0 ? errorCount / requestCount : 0;

    const result: SoakTestResult = {
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      totalRequests: requestCount,
      successCount,
      errorCount,
      errorRate,
      averageLatency: this.calculateAverage(latencies),
      p95Latency: this.calculatePercentile(latencies, 95),
      p99Latency: this.calculatePercentile(latencies, 99),
      latencySpikesInjected,
      dependencyDownInjected,
      passed: errorRate <= targetErrorRate,
      errors,
    };

    this.logger.info(
      `Soak complete: ${successCount}/${requestCount} success, error rate ${(errorRate * 100).toFixed(2)}% (target ${(targetErrorRate * 100).toFixed(2)}%)`
    );

    if (!result.passed) {
      this.logger.warn('Error rate exceeded target. Review collected errors.');
    }

    return result;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.min(Math.max(index, 0), sorted.length - 1)];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
