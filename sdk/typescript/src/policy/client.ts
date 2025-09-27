export interface PolicyEntity {
  [key: string]: unknown;
}

export interface EvaluateParams {
  subject: PolicyEntity;
  resource: PolicyEntity;
  action: string;
  context: PolicyEntity;
}

export interface PolicyDecision {
  allow: boolean;
  reason: string;
}

export interface PolicyClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE = process.env.POLICY_API_URL ?? 'http://127.0.0.1:8181';
const DEFAULT_TIMEOUT = 5000;

export class PolicyClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: PolicyClientOptions = {}) {
    this.baseUrl = sanitizeBaseUrl(options.baseUrl ?? DEFAULT_BASE);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  }

  async evaluate(params: EvaluateParams): Promise<PolicyDecision> {
    assertFetch();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/v1/data/policy/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: params }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const text = await safeText(response);
        throw new Error(`OPA HTTP ${response.status}: ${text || response.statusText}`);
      }
      const payload = await response.json();
      const result = payload?.result as PolicyDecision | undefined;
      if (!result || typeof result.allow === 'undefined' || typeof result.reason !== 'string') {
        throw new Error('OPA response missing result');
      }
      return { allow: Boolean(result.allow), reason: result.reason };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`OPA request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

function sanitizeBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function assertFetch(): void {
  if (typeof fetch !== 'function') {
    throw new Error('global fetch is not available');
  }
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
