// @ts-nocheck
import * as v8 from 'v8';
import * as os from 'os';
import { logger } from '../config/logger.js';

export interface SystemHealth {
  isOverloaded: boolean;
  reason?: string;
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    uptime: number;
    loadAverage: number[];
  };
}

class SystemMonitor {
  private static instance: SystemMonitor;
  private lastCpuUsage: NodeJS.CpuUsage | null = null;
  private lastCpuTime: number = Date.now();
  private currentCpuLoad: number = 0;

  // Thresholds
  private readonly MEMORY_THRESHOLD = 0.85; // 85% heap usage
  private readonly CPU_THRESHOLD = 0.90;    // 90% CPU load

  private constructor() {
    // Start periodic sampling
    setInterval(() => this.sampleCpu(), 5000).unref();
  }

  public static getInstance(): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor();
    }
    return SystemMonitor.instance;
  }

  private sampleCpu() {
    const currentCpuUsage = process.cpuUsage();
    const currentTime = Date.now();

    if (this.lastCpuUsage) {
      const timeDiff = currentTime - this.lastCpuTime;
      const userDiff = currentCpuUsage.user - this.lastCpuUsage.user;
      const systemDiff = currentCpuUsage.system - this.lastCpuUsage.system;

      // Calculate % usage (microseconds / milliseconds * 1000)
      const totalUsage = (userDiff + systemDiff) / (timeDiff * 1000);
      this.currentCpuLoad = Math.min(1.0, totalUsage);
    }

    this.lastCpuUsage = currentCpuUsage;
    this.lastCpuTime = currentTime;
  }

  public getHealth(): SystemHealth {
    const heapStats = v8.getHeapStatistics();
    const memoryUsage = heapStats.used_heap_size / heapStats.heap_size_limit;

    const loadAvg = os.loadavg();
    const cpuUsage = this.currentCpuLoad;

    let isOverloaded = false;
    let reason: string | undefined;

    if (memoryUsage > this.MEMORY_THRESHOLD) {
      isOverloaded = true;
      reason = `Memory usage critical: ${(memoryUsage * 100).toFixed(1)}%`;
      logger.warn({ memoryUsage, threshold: this.MEMORY_THRESHOLD }, 'System Monitor: Memory overload detected');
    } else if (cpuUsage > this.CPU_THRESHOLD) {
      isOverloaded = true;
      reason = `CPU usage critical: ${(cpuUsage * 100).toFixed(1)}%`;
      logger.warn({ cpuUsage, threshold: this.CPU_THRESHOLD }, 'System Monitor: CPU overload detected');
    }

    return {
      isOverloaded,
      reason,
      metrics: {
        cpuUsage,
        memoryUsage,
        uptime: process.uptime(),
        loadAverage: loadAvg,
      },
    };
  }
}

export const systemMonitor = SystemMonitor.getInstance();
