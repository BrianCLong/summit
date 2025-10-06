import fetch from 'node-fetch';
import pino from 'pino';
import { tokenEstimate, tokenEstimateForAttachments } from '../../utils/tokens';
import { withTimeout } from '../../utils/timeout';
import type { ProviderAttachment, ProviderResponse } from './types';

const logger = pino({ name: 'llm-google-adapter' });
const API_URL = process.env.GOOGLE_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 20000);

export async function generate(
  model: string,
  prompt: string,
  attachments?: ProviderAttachment[]
): Promise<ProviderResponse> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey || process.env.COPILOT_LLM_OFFLINE === 'true') {
    logger.warn('Google adapter running in offline mode');
    const tokensIn = tokenEstimate(prompt) + tokenEstimateForAttachments(attachments);
    const tokensOut = Math.max(48, Math.round(tokensIn * 0.6));
    return {
      text: '[offline] Gemini adapter mock response. Configure GOOGLE_API_KEY to enable live routing.',
      tokensIn,
      tokensOut,
      costUsd: 0
    };
  }

  const contents: any[] = [{ role: 'user', parts: [{ text: prompt }] }];

  if (attachments?.length) {
    const parts = attachments.map((attachment) => ({
      inlineData: {
        data: attachment.bytesB64,
        mimeType: attachment.mime
      }
    }));
    contents[0].parts.push(...parts);
  }

  const url = `${API_URL}/${model}:generateContent?key=${apiKey}`;
  const response = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.2 } })
    }),
    TIMEOUT_MS,
    'Google generateContent timed out'
  );

  if (!response.ok) {
    const reason = await response.text();
    logger.error({ status: response.status, reason }, 'Google Gemini request failed');
    throw new Error(`Google Gemini request failed: ${response.status} ${reason}`);
  }

  const payload: any = await response.json();
  const candidates = payload?.candidates || [];
  const content = candidates
    .flatMap((candidate: any) => candidate?.content?.parts || [])
    .map((part: any) => part.text)
    .filter(Boolean)
    .join('\n');
  const tokensIn = payload?.usageMetadata?.promptTokenCount ?? tokenEstimate(prompt);
  const tokensOut = payload?.usageMetadata?.candidatesTokenCount ?? tokenEstimate(content);
  const costUsd = calculateCost(tokensIn, tokensOut);

  return {
    text: content,
    tokensIn,
    tokensOut,
    costUsd
  };
}

function calculateCost(tokensIn: number, tokensOut: number): number {
  const inRate = Number(process.env.COST_GOOGLE_IN || 0.000007);
  const outRate = Number(process.env.COST_GOOGLE_OUT || 0.000021);
  const cost = tokensIn * inRate + tokensOut * outRate;
  return Number(cost.toFixed(6));
}
