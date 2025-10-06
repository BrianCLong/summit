import fetch from 'node-fetch';
import pino from 'pino';
import { tokenEstimate, tokenEstimateForAttachments } from '../../utils/tokens';
import { withTimeout } from '../../utils/timeout';
import type { ProviderAttachment, ProviderResponse } from './types';

const logger = pino({ name: 'llm-anthropic-adapter' });
const API_URL = process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages';
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 20000);

export async function complete(
  model: string,
  prompt: string,
  attachments?: ProviderAttachment[]
): Promise<ProviderResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || process.env.COPILOT_LLM_OFFLINE === 'true') {
    logger.warn('Anthropic adapter running in offline mode');
    const tokensIn = tokenEstimate(prompt) + tokenEstimateForAttachments(attachments);
    const tokensOut = Math.max(64, Math.round(tokensIn * 0.7));
    return {
      text: '[offline] Anthropic adapter mock response. Configure ANTHROPIC_API_KEY to enable live routing.',
      tokensIn,
      tokensOut,
      costUsd: 0
    };
  }

  const body: any = {
    model,
    max_tokens: 4096,
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }]
  };

  if (attachments?.length) {
    body.messages[0].content = [
      { type: 'text', text: prompt },
      ...attachments.map((attachment) => ({
        type: 'input_image',
        source: {
          type: 'base64',
          media_type: attachment.mime,
          data: attachment.bytesB64
        }
      }))
    ];
  }

  const response = await withTimeout(
    fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    }),
    TIMEOUT_MS,
    'Anthropic completion timed out'
  );

  if (!response.ok) {
    const reason = await response.text();
    logger.error({ status: response.status, reason }, 'Anthropic request failed');
    throw new Error(`Anthropic request failed: ${response.status} ${reason}`);
  }

  const payload: any = await response.json();
  const content = Array.isArray(payload?.content)
    ? payload.content.map((item: any) => item?.text || '').join('\n')
    : payload?.content?.[0]?.text || '';
  const usage = payload?.usage || {};
  const tokensIn = usage.input_tokens ?? tokenEstimate(prompt);
  const tokensOut = usage.output_tokens ?? tokenEstimate(content);
  const costUsd = calculateCost(tokensIn, tokensOut);

  return {
    text: content,
    tokensIn,
    tokensOut,
    costUsd
  };
}

function calculateCost(tokensIn: number, tokensOut: number): number {
  const inRate = Number(process.env.COST_ANTHROPIC_IN || 0.000008);
  const outRate = Number(process.env.COST_ANTHROPIC_OUT || 0.000024);
  const cost = tokensIn * inRate + tokensOut * outRate;
  return Number(cost.toFixed(6));
}
