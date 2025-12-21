import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { metrics } from '@opentelemetry/api';

import { CostSample, RunCostSummary } from './types.js';
import { IntelGraphClient } from '../intelgraph/client.js';

export interface LLMUsage {
  model: string;
  vendor: 'openai' | 'anthropic' | 'google' | 'local';
  inputTokens: number;
  outputTokens: number;
}

export interface LLMCallMetadata {
  feature?: string;
  tenantId?: string;
  environment?: string;
  traceId?: string;
}

const meter = metrics.getMeter('maestro-llm-observability');

const costCounter = meter.createCounter('llm_cost_usd_total', {
  description: 'Estimated LLM spend in USD',
});

const tokenCounter = meter.createCounter('llm_tokens_total', {
  description: 'Total LLM tokens consumed by segment',
});

interface CostMeterOptions {
  usageLogPath?: string;
  defaultEnvironment?: string;
}

export class CostMeter {
  constructor(
    private ig: IntelGraphClient,
    private pricingTable: Record<string, {  // e.g. "openai:gpt-4.1"
      inputPer1K: number; // USD
      outputPer1K: number;
    }>,
    options: CostMeterOptions = {},
  ) {
    this.usageLogPath =
      options.usageLogPath || process.env.LLM_USAGE_LOG_PATH || 'logs/llm-usage.ndjson';
    this.defaultEnvironment =
      options.defaultEnvironment ||
      process.env.LLM_ENVIRONMENT ||
      process.env.NODE_ENV ||
      'unknown';
  }

  private usageLogPath: string;
  private defaultEnvironment: string;

  estimateCost(usage: LLMUsage): number {
    const key = `${usage.vendor}:${usage.model}`;
    const pricing = this.pricingTable[key];
    if (!pricing) return 0;

    const inCost = (usage.inputTokens / 1000) * pricing.inputPer1K;
    const outCost = (usage.outputTokens / 1000) * pricing.outputPer1K;
    return inCost + outCost;
  }

  async record(
    runId: string,
    taskId: string,
    usage: LLMUsage,
    metadata: LLMCallMetadata = {},
  ): Promise<CostSample> {
    const cost = this.estimateCost(usage);
    const sample: CostSample = {
      id: crypto.randomUUID(),
      runId,
      taskId,
      model: usage.model,
      vendor: usage.vendor,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      currency: 'USD',
      cost,
      createdAt: new Date().toISOString(),
      feature: metadata.feature,
      tenantId: metadata.tenantId,
      environment: metadata.environment || this.defaultEnvironment,
    };

    await this.ig.recordCostSample(sample);
    this.emitMetrics(sample);
    this.appendUsageLog(sample, metadata.traceId);
    return sample;
  }

  async summarize(runId: string): Promise<RunCostSummary> {
    return this.ig.getRunCostSummary(runId);
  }

  private emitMetrics(sample: CostSample) {
    const attributes = {
      vendor: sample.vendor,
      model: sample.model,
      feature: sample.feature || 'unspecified',
      tenant: sample.tenantId || 'unspecified',
      environment: sample.environment || this.defaultEnvironment,
    };

    costCounter.add(sample.cost, attributes);
    tokenCounter.add(sample.inputTokens, { ...attributes, segment: 'prompt' });
    tokenCounter.add(sample.outputTokens, { ...attributes, segment: 'completion' });
  }

  private appendUsageLog(sample: CostSample, traceId?: string) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      traceId,
      vendor: sample.vendor,
      model: sample.model,
      inputTokens: sample.inputTokens,
      outputTokens: sample.outputTokens,
      cost: sample.cost,
      currency: sample.currency,
      feature: sample.feature,
      tenantId: sample.tenantId,
      environment: sample.environment || this.defaultEnvironment,
    };

    const logDir = path.dirname(this.usageLogPath);
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(this.usageLogPath, `${JSON.stringify(logEntry)}\n`);
  }
}
