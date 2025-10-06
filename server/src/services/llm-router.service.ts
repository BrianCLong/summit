import crypto from 'node:crypto';
import pino from 'pino';
import { opaEvaluate } from '../utils/opa-client';
import { tokenEstimate, tokenEstimateForAttachments } from '../utils/tokens';
import {
  estimateCost,
  getBudgetForProvider,
  getPerBriefCap,
  getProviderSpend,
  isWithinPerBriefCap,
  recordLLMCall,
  recordPolicyDenial,
  type ProviderKey
} from '../utils/cost-logger';
import { writeProvenance } from '../utils/provenance';
import { pg } from '../db/pg';
import * as OpenAI from './providers/openai.adapter';
import * as Anthropic from './providers/anthropic.adapter';
import * as Google from './providers/google.adapter';
import * as Perplexity from './providers/perplexity.adapter';
import type { ProviderAttachment } from './providers/types';

const logger = pino({ name: 'llm-router' });

export type Provider = ProviderKey;
export type Purpose = 'search' | 'synthesis' | 'long_context' | 'multimodal' | 'default';

export interface Req {
  investigationId: string;
  userId: string;
  text: string;
  attachments?: ProviderAttachment[];
  requireCitations?: boolean;
  classification?: 'U' | 'C' | 'S' | 'TS';
}

export interface Route {
  provider: Provider;
  model: string;
  purpose: Purpose;
  reason: string;
}

export interface ExecuteResult {
  text: string;
  route: Route;
  provId?: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  citations?: Array<{ url: string; title?: string }>;
  budgetRemaining?: number;
}

interface Analysis {
  tokens: number;
  needsCitations: boolean;
  hasImage: boolean;
}

const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const FALLBACK_OPENAI_MODEL = process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini';

function analyze(req: Req): Analysis {
  const tokens = tokenEstimate(req.text) + tokenEstimateForAttachments(req.attachments);
  const text = req.text || '';
  const needsCitations =
    !!req.requireCitations || /\b(cite|citation|source|references?)\b/i.test(text);
  const hasImage = /\b(image|screenshot|figure|photo)\b/i.test(text) || !!req.attachments?.length;
  return { tokens, needsCitations, hasImage };
}

function enforcePerBriefCap(route: Route, analysis: Analysis): Route {
  const cap = getPerBriefCap();
  if (!Number.isFinite(cap)) return route;

  const estimatedOutputTokens = Math.max(512, Math.round(analysis.tokens * 0.7));
  const estimatedCost = estimateCost(route.provider, analysis.tokens, estimatedOutputTokens);

  if (estimatedCost <= cap) return route;

  if (route.provider !== 'openai') {
    return {
      provider: 'openai',
      model: FALLBACK_OPENAI_MODEL,
      purpose: 'synthesis',
      reason: `${route.reason}; rerouted to openai for cap ${cap}`
    };
  }

  if (route.model !== FALLBACK_OPENAI_MODEL) {
    return {
      provider: 'openai',
      model: FALLBACK_OPENAI_MODEL,
      purpose: route.purpose,
      reason: `${route.reason}; downshifted to ${FALLBACK_OPENAI_MODEL} for cap ${cap}`
    };
  }

  return route;
}

export function decide(req: Req): Route {
  const analysis = analyze(req);

  let route: Route;
  if (analysis.needsCitations) {
    route = {
      provider: 'perplexity',
      model: 'sonar-pro',
      purpose: 'search',
      reason: 'requires grounded citations'
    };
  } else if (analysis.tokens > 80_000) {
    route = {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet',
      purpose: 'long_context',
      reason: 'ultra-long prompt'
    };
  } else if (analysis.hasImage) {
    route = {
      provider: 'google',
      model: 'gemini-1.5-pro',
      purpose: 'multimodal',
      reason: 'contains image context'
    };
  } else {
    route = {
      provider: 'openai',
      model: DEFAULT_OPENAI_MODEL,
      purpose: 'synthesis',
      reason: 'default synthesis path'
    };
  }

  const cappedRoute = enforcePerBriefCap(route, analysis);
  return cappedRoute;
}

async function invokeProvider(route: Route, req: Req, attempt = 0): Promise<ExecuteResult> {
  const start = Date.now();
  try {
    let response;
    if (route.provider === 'perplexity') {
      response = await Perplexity.search(route.model, req.text);
    } else if (route.provider === 'anthropic') {
      response = await Anthropic.complete(route.model, req.text, req.attachments);
    } else if (route.provider === 'google') {
      response = await Google.generate(route.model, req.text, req.attachments);
    } else {
      response = await OpenAI.complete(route.model, req.text, req.attachments);
    }

    const latencyMs = Date.now() - start;
    return {
      text: response.text,
      route,
      tokensIn: response.tokensIn,
      tokensOut: response.tokensOut,
      costUsd: response.costUsd,
      latencyMs,
      citations: response.citations
    };
  } catch (error) {
    logger.error({ error, route, attempt }, 'LLM provider execution failed');
    if (route.provider !== 'openai' && attempt === 0) {
      logger.warn({ route }, 'Falling back to OpenAI after provider failure');
      return invokeProvider(
        {
          provider: 'openai',
          model: FALLBACK_OPENAI_MODEL,
          purpose: 'synthesis',
          reason: `${route.reason}; fallback from ${route.provider}`
        },
        req,
        attempt + 1
      );
    }
    throw error instanceof Error ? error : new Error('LLM provider failure');
  }
}

export async function execute(req: Req): Promise<ExecuteResult> {
  const classification = (req.classification || 'U').toUpperCase() as Req['classification'];
  const flagEnabled = (process.env.COPILOT_MULTI_LLM || '').toLowerCase() === 'true';
  const route = flagEnabled
    ? decide(req)
    : {
        provider: 'openai',
        model: DEFAULT_OPENAI_MODEL,
        purpose: 'synthesis',
        reason: 'feature flag disabled'
      };

  const policyInput = {
    classification,
    provider: route.provider,
    model: route.model,
    requiresCitations: !!req.requireCitations
  };

  const policyResult = await opaEvaluate('intelgraph/llm/route', policyInput);
  if (!policyResult.allow) {
    recordPolicyDenial('intelgraph/llm/route', policyResult.reason);
    throw new Error(`OPA denied LLM route: ${policyResult.reason || 'policy violation'}`);
  }

  const spend = getProviderSpend(route.provider);
  const budget = getBudgetForProvider(route.provider);
  if (Number.isFinite(budget) && spend >= budget) {
    throw new Error(`Budget exhausted for provider ${route.provider}`);
  }

  const execution = await invokeProvider(route, req);

  if (!isWithinPerBriefCap(execution.costUsd)) {
    logger.warn({ cost: execution.costUsd, cap: getPerBriefCap(), route }, 'Per-brief cap exceeded');
  }

  const provenanceId = await writeProvenance({
    investigationId: req.investigationId,
    provider: route.provider,
    model: route.model,
    tokensIn: execution.tokensIn,
    tokensOut: execution.tokensOut,
    costUsd: execution.costUsd,
    latencyMs: execution.latencyMs,
    promptHash: crypto.createHash('sha256').update(req.text).digest('hex'),
    routeReason: route.reason
  });

  const policyOutput = await opaEvaluate('intelgraph/llm/output', {
    purpose: route.purpose,
    citations: !!execution.citations?.length,
    classification
  });

  let text = execution.text;
  if (!policyOutput.allow) {
    recordPolicyDenial('intelgraph/llm/output', policyOutput.reason);
    text = '[REDACTED BY POLICY]';
  }

  const metrics = recordLLMCall({
    provider: route.provider,
    model: route.model,
    tokensIn: execution.tokensIn,
    tokensOut: execution.tokensOut,
    costUsd: execution.costUsd,
    latencyMs: execution.latencyMs,
    purpose: route.purpose,
    routeReason: route.reason
  });

  try {
    await pg.write(
      `INSERT INTO llm_calls (investigation_id, provider, model, tokens_in, tokens_out, cost_usd, latency_ms, route_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.investigationId,
        route.provider,
        route.model,
        execution.tokensIn,
        execution.tokensOut,
        execution.costUsd,
        execution.latencyMs,
        route.reason
      ]
    );
  } catch (error) {
    logger.warn({ error }, 'Failed to persist llm_calls ledger');
  }

  return {
    ...execution,
    text,
    provId: provenanceId,
    budgetRemaining: metrics.remaining
  };
}
