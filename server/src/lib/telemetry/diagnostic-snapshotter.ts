
import v8 from 'v8';
import fs from 'fs';
import { telemetry } from './comprehensive-telemetry';
import { Request } from 'express';
import path from 'path';
import os from 'os';
import { performance } from 'perf_hooks';

import { telemetryConfig } from '../../config/telemetry';
import { cfg } from '../../config';

class DiagnosticSnapshotter {
  private snapshotInProgress = false;
  private activeRequests: Set<any> = new Set();

  constructor() {
    // Periodically check thresholds
    setInterval(() => {
      this.checkMemoryThreshold();
      this.checkLatencyThreshold();
    }, 15000);

    telemetry.onMetric((metricName, value) => {
      if (metricName === 'request_duration_seconds') {
        this.latencies.push(value);
      }
    });
  }

  private checkMemoryThreshold() {
    const memoryUsage = process.memoryUsage().heapUsed;
    if (memoryUsage > telemetryConfig.snapshotter.memoryThreshold) {
      this.triggerSnapshot(`memory_threshold_exceeded_${memoryUsage}`);
    }
  }

  private latencies: number[] = [];

  private checkLatencyThreshold() {
    if (this.latencies.length === 0) {
      return;
    }

    const averageLatency = this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
    if (averageLatency > telemetryConfig.snapshotter.latencyThreshold) {
      this.triggerSnapshot(`latency_threshold_exceeded_${averageLatency}`);
    }
    this.latencies = [];
  }

  public triggerSnapshot(reason: string) {
    if (this.snapshotInProgress) {
      console.warn('Snapshot already in progress, skipping.');
      return;
    }

    this.snapshotInProgress = true;
    console.log(`Triggering snapshot due to: ${reason}`);

    try {
      this.captureHeapSnapshot();
      this.captureConfigState();
      this.captureActiveRequests();
    } catch (error) {
      console.error('Failed to capture diagnostic snapshot:', error);
    } finally {
      this.snapshotInProgress = false;
    }
  }

  private captureHeapSnapshot() {
    const snapshotStream = v8.getHeapSnapshot();
    const snapshotPath = path.join(os.tmpdir(), `heap-snapshot-${Date.now()}.heapsnapshot`);
    const fileStream = fs.createWriteStream(snapshotPath);
    snapshotStream.pipe(fileStream);
    console.log(`Heap snapshot captured at: ${snapshotPath}`);
  }

  private captureConfigState() {
    const configPath = path.join(os.tmpdir(), `config-state-${Date.now()}.json`);
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
    console.log(`Configuration state captured at: ${configPath}`);
  }

  private sanitizeHeaders(headers: Record<string, any>) {
    const sanitizedHeaders: Record<string, any> = {};
    for (const key in headers) {
      if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'cookie') {
        sanitizedHeaders[key] = '[REDACTED]';
      } else {
        sanitizedHeaders[key] = headers[key];
      }
    }
    return sanitizedHeaders;
  }

  private captureActiveRequests() {
    const activeRequestsPath = path.join(os.tmpdir(), `active-requests-${Date.now()}.json`);
    const activeRequests = {
      count: this.activeRequests.size,
      requests: Array.from(this.activeRequests).map((req: any) => ({
        method: req.method,
        url: req.url,
        headers: this.sanitizeHeaders(req.headers),
      })),
    };
    fs.writeFileSync(activeRequestsPath, JSON.stringify(activeRequests, null, 2));
    console.log(`Active requests captured at: ${activeRequestsPath}`);
  }

  public trackRequest(req: Request) {
    this.activeRequests.add(req);
  }

  public untrackRequest(req: Request) {
    this.activeRequests.delete(req);
  }
}

export const snapshotter = new DiagnosticSnapshotter();
