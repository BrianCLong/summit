/**
 * Usage tracker - records prompt usage for analytics
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { PromptUsageMetric } from '../core/types.js';

export class UsageTracker {
  private metricsFile: string;

  constructor() {
    const dataDir = join(homedir(), '.intelgraph', 'prompt-system');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    this.metricsFile = join(dataDir, 'usage-metrics.jsonl');
  }

  /**
   * Record a prompt usage event
   */
  track(metric: PromptUsageMetric): void {
    const line = JSON.stringify(metric) + '\n';

    try {
      writeFileSync(this.metricsFile, line, { flag: 'a' });
    } catch (error) {
      console.warn('Failed to track usage metric:', error);
    }
  }

  /**
   * Get all recorded metrics
   */
  getAll(): PromptUsageMetric[] {
    if (!existsSync(this.metricsFile)) {
      return [];
    }

    const content = readFileSync(this.metricsFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    return lines.map(line => {
      try {
        return JSON.parse(line) as PromptUsageMetric;
      } catch {
        return null;
      }
    }).filter((m): m is PromptUsageMetric => m !== null);
  }

  /**
   * Get metrics for a specific template
   */
  getForTemplate(templateId: string): PromptUsageMetric[] {
    return this.getAll().filter(m => m.templateId === templateId);
  }

  /**
   * Get metrics within a time period
   */
  getForPeriod(days: number): PromptUsageMetric[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffTime = cutoff.toISOString();

    return this.getAll().filter(m => m.timestamp >= cutoffTime);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    if (existsSync(this.metricsFile)) {
      writeFileSync(this.metricsFile, '');
    }
  }
}
