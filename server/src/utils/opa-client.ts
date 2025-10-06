import fetch, { type Response } from 'node-fetch';
import pino from 'pino';

const logger = pino({ name: 'opa-client' });

export interface OPAEvaluationResult {
  allow: boolean;
  reason?: string;
  metadata?: Record<string, unknown>;
}

interface EvaluateOptions {
  timeoutMs?: number;
  failOpenForUnclassified?: boolean;
}

const DEFAULT_TIMEOUT_MS = Number(process.env.OPA_TIMEOUT_MS || 2500);
const OPA_URL = process.env.OPA_URL || 'http://opa:8181';

export async function opaEvaluate(
  policyPath: string,
  input: Record<string, unknown>,
  options: EvaluateOptions = {}
): Promise<OPAEvaluationResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const abortTimeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${OPA_URL}/v1/data/${policyPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input }),
      signal: controller.signal
    });

    if (!response.ok) {
      const reason = await safeReason(response);
      throw new Error(`OPA responded with status ${response.status}: ${reason}`);
    }

    const payload: any = await response.json();
    const result = payload?.result ?? {};

    if (typeof result.allow === 'boolean') {
      return {
        allow: result.allow,
        reason: result.reason,
        metadata: result.metadata
      };
    }

    if (typeof payload.allow === 'boolean') {
      return {
        allow: payload.allow,
        reason: payload.reason,
        metadata: payload.metadata
      };
    }

    return { allow: false, reason: 'OPA response missing allow flag' };
  } catch (error) {
    const classification = (input?.classification || input?.accessLevel || '') as string;
    const failOpen = (classification || '').toUpperCase() === 'U' && (options.failOpenForUnclassified ?? true);
    logger.warn({ error, policyPath, classification }, 'OPA evaluation failed');
    if (failOpen) {
      return { allow: true, reason: 'fail-open-u' };
    }
    throw error instanceof Error ? error : new Error('OPA evaluation error');
  } finally {
    clearTimeout(abortTimeout);
  }
}

async function safeReason(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 200);
  } catch (err) {
    logger.debug({ err }, 'Failed to read OPA error body');
    return 'unknown';
  }
}
