import fetch from 'node-fetch';
import pino from 'pino';
import { tokenEstimate } from '../../utils/tokens';
import { withTimeout } from '../../utils/timeout';
import type { ProviderResponse } from './types';

const logger = pino({ name: 'llm-perplexity-adapter' });
const API_URL = process.env.PERPLEXITY_API_URL || 'https://api.perplexity.ai/chat/completions';
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 20000);
const CACHE_TTL_MS = Number(process.env.PERPLEXITY_CACHE_TTL_MS || 15 * 60 * 1000);

interface CacheEntry {
  expires: number;
  response: ProviderResponse;
}

const cache = new Map<string, CacheEntry>();

export async function search(model: string, prompt: string): Promise<ProviderResponse> {
  const cacheKey = `${model}:${prompt}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.response;
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey || process.env.COPILOT_LLM_OFFLINE === 'true') {
    logger.warn('Perplexity adapter running in offline mode');
    const tokensIn = tokenEstimate(prompt);
    const tokensOut = Math.max(80, Math.round(tokensIn * 0.75));
    const response: ProviderResponse = {
      text: '[offline] Perplexity mock response. Configure PERPLEXITY_API_KEY to enable live routing.',
      tokensIn,
      tokensOut,
      costUsd: 0,
      citations: []
    };
    cache.set(cacheKey, { response, expires: now + CACHE_TTL_MS });
    return response;
  }

  const body = {
    model,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    return_citations: true
  };

  const response = await withTimeout(
    fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    }),
    TIMEOUT_MS,
    'Perplexity search timed out'
  );

  if (!response.ok) {
    const reason = await response.text();
    logger.error({ status: response.status, reason }, 'Perplexity request failed');
    throw new Error(`Perplexity request failed: ${response.status} ${reason}`);
  }

  const payload: any = await response.json();
  const choice = payload?.choices?.[0];
  const content = choice?.message?.content ?? '';
  const tokensIn = payload?.usage?.prompt_tokens ?? tokenEstimate(prompt);
  const tokensOut = payload?.usage?.completion_tokens ?? tokenEstimate(content);
  const costUsd = calculateCost(tokensIn, tokensOut, payload?.usage?.total_tokens);
  const citations: ProviderResponse['citations'] = choice?.citations?.map((citation: any) => ({
    url: citation?.url,
    title: citation?.title
  })) || [];

  const result: ProviderResponse = {
    text: content,
    tokensIn,
    tokensOut,
    costUsd,
    citations
  };

  cache.set(cacheKey, { response: result, expires: now + CACHE_TTL_MS });
  return result;
}

function calculateCost(tokensIn: number, tokensOut: number, totalTokens?: number): number {
  if (typeof totalTokens === 'number' && Number.isFinite(totalTokens)) {
    const rate = Number(process.env.COST_PERPLEXITY_TOTAL || 0.00002);
    return Number((totalTokens * rate).toFixed(6));
  }
  const inRate = Number(process.env.COST_PERPLEXITY_IN || 0.00001);
  const outRate = Number(process.env.COST_PERPLEXITY_OUT || 0.00002);
  const cost = tokensIn * inRate + tokensOut * outRate;
  return Number(cost.toFixed(6));
}
