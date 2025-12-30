import fs from 'node:fs/promises';
import path from 'node:path';

import { FairnessMetrics, QueryFeatures } from './learning-to-rank.js';

export interface PolicyConstraints {
  maxCost?: number;
  maxLatencyMs?: number;
  allowedProviders?: string[];
  blockedModels?: string[];
  preferredProviders?: string[];
}

export interface DecisionRecord {
  decisionId: string;
  timestamp: string;
  request: {
    prompt: string;
    context: Record<string, any>;
    tenantId?: string;
    userId?: string;
    policies: string[];
    constraints: PolicyConstraints;
    features: QueryFeatures;
  };
  outcome: {
    provider: string;
    model: string;
    score: number;
    estimatedCost: number;
    estimatedLatency: number;
    fairness: FairnessMetrics;
    guardrailActions: {
      piiRedactions: string[];
    };
    fallbacks: Array<{ provider: string; model: string; reason: string }>;
  };
  meta: {
    decisionStartedAt: string;
    decidedAt: string;
  };
}

const DEFAULT_LOG_PATH = path.resolve(
  process.cwd(),
  '.evidence',
  'llm',
  'decisions.jsonl',
);

export class DecisionRecorder {
  constructor(private logPath: string = DEFAULT_LOG_PATH) {}

  getLogPath(): string {
    return this.logPath;
  }

  async record(record: DecisionRecord): Promise<void> {
    const dir = path.dirname(this.logPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(this.logPath, `${JSON.stringify(record)}\n`, 'utf8');
  }

  async load(decisionId: string): Promise<DecisionRecord | null> {
    let content: string;
    try {
      content = await fs.readFile(this.logPath, 'utf8');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }

    for (const line of content.split('\n')) {
      if (!line.trim()) {continue;}
      const parsed = JSON.parse(line) as DecisionRecord;
      if (parsed.decisionId === decisionId) {
        return parsed;
      }
    }

    return null;
  }
}
