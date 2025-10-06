import fetch from 'node-fetch';
import pino from 'pino';
import { tokenEstimate, tokenEstimateForAttachments } from '../../utils/tokens';
import { withTimeout } from '../../utils/timeout';
import type { ProviderAttachment, ProviderResponse } from './types';

const logger = pino({ name: 'llm-openai-adapter' });
const API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 20000);

export async function complete(
  model: string,
  prompt: string,
  attachments?: ProviderAttachment[]
): Promise<ProviderResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || process.env.COPILOT_LLM_OFFLINE === 'true') {
    logger.warn('OpenAI adapter running in offline mode');
    const tokensIn = tokenEstimate(prompt) + tokenEstimateForAttachments(attachments);
    const tokensOut = Math.max(32, Math.round(tokensIn * 0.6));
    return {
      text: '[offline] Copilot mock response – configure OPENAI_API_KEY to enable live routing.',
      tokensIn,
      tokensOut,
      costUsd: 0
    };
  }

  const body: any = {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2
  };

  if (attachments?.length) {
    body.messages[0].content = [
      { type: 'text', text: prompt },
      ...attachments.map((attachment) => ({
        type: 'input_image',
        image: {
          b64_json: attachment.bytesB64,
          mime_type: attachment.mime
        }
      }))
    ];
  }

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
    'OpenAI completion timed out'
  );

  if (!response.ok) {
    const reason = await response.text();
    logger.error({ status: response.status, reason }, 'OpenAI request failed');
    throw new Error(`OpenAI request failed: ${response.status} ${reason}`);
  }

  const payload: any = await response.json();
  const content = payload?.choices?.[0]?.message?.content ?? '';
  const usage = payload?.usage || {};
  const tokensIn = usage.prompt_tokens ?? tokenEstimate(prompt);
  const tokensOut = usage.completion_tokens ?? tokenEstimate(content);
  const costUsd = calculateCost(tokensIn, tokensOut);

  return {
    text: content,
    tokensIn,
    tokensOut,
    costUsd
  };
}

function calculateCost(tokensIn: number, tokensOut: number): number {
  const inRate = Number(process.env.COST_OAI_IN || 0.000005);
  const outRate = Number(process.env.COST_OAI_OUT || 0.000015);
  const cost = tokensIn * inRate + tokensOut * outRate;
  return Number(cost.toFixed(6));
}
