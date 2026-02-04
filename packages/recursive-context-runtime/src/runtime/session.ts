import { InspectEnv, RecursionBudget, SpanRef, ContextHandle, RCRResult } from '../api';
import { v4 as uuidv4 } from 'uuid';

export class RCRSession {
  private budget: RecursionBudget;
  private env: InspectEnv;
  private trace: any[] = [];
  private metrics: Record<string, number> = {
      depth: 0,
      iterations: 0,
      subcalls: 0,
      wallMs: 0,
      costUsd: 0
  };
  private startTime: number;

  constructor(env: InspectEnv, budget: RecursionBudget) {
    this.env = env;
    this.budget = budget;
    this.startTime = Date.now();
  }

  async listFiles(prefix?: string): Promise<string[]> {
    this.checkBudget();
    const start = Date.now();
    try {
        const result = await this.env.listFiles(prefix);
        this.recordTrace('listFiles', { prefix }, { count: result.length });
        return result;
    } catch (e: any) {
        this.recordTrace('listFiles', { prefix }, { error: e.message });
        throw e;
    }
  }

  async readFile(path: string, start?: number, end?: number): Promise<{ text: string; span: SpanRef }> {
    this.checkBudget();
    try {
        const result = await this.env.readFile(path, start, end);
        this.recordTrace('readFile', { path, start, end }, { span: result.span });
        return result;
    } catch (e: any) {
        this.recordTrace('readFile', { path, start, end }, { error: e.message });
        throw e;
    }
  }

  async searchText(pattern: string, opts?: { paths?: string[]; maxHits?: number }): Promise<Array<{ hit: string; span: SpanRef }>> {
      this.checkBudget();
      try {
        const result = await this.env.searchText(pattern, opts);
        this.recordTrace('searchText', { pattern, opts }, { hits: result.length });
        return result;
      } catch (e: any) {
        this.recordTrace('searchText', { pattern, opts }, { error: e.message });
        throw e;
      }
  }

  private checkBudget() {
      const now = Date.now();
      if (now - this.startTime > this.budget.maxWallMs) {
          throw new Error("Budget exceeded: maxWallMs");
      }
      // Future: check maxIterations, maxCostUsd etc.
  }

  private recordTrace(action: string, input: any, output: any) {
      this.trace.push({
          timestamp: new Date().toISOString(),
          action,
          input,
          output
      });
  }

  getTrace() {
      return this.trace;
  }

  getMetrics() {
      return this.metrics;
  }
}
