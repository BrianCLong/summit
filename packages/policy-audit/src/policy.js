const DEFAULT_URL = process.env.POLICY_API_URL || 'http://127.0.0.1:8181';

function ensureFetch() {
  if (typeof fetch !== 'function') {
    throw new Error('global fetch API is not available');
  }
}

class PolicyHttpClient {
  constructor(opts = {}) {
    this.baseUrl = sanitizeBaseUrl(opts.baseUrl || DEFAULT_URL);
    this.timeoutMs = opts.timeoutMs || 5000;
  }

  async evaluate({ subject, resource, action, context }) {
    ensureFetch();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/v1/data/policy/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { subject, resource, action, context } }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const text = await safeText(response);
        throw new Error(`OPA HTTP ${response.status}: ${text || response.statusText}`);
      }
      const payload = await response.json();
      if (!payload || typeof payload.result !== 'object') {
        throw new Error('OPA response missing result');
      }
      const { allow = false, reason = 'unknown' } = payload.result;
      return { allow: Boolean(allow), reason };
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw new Error(`OPA request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

async function evaluate(subject, resource, action, context, opts) {
  const client = opts instanceof PolicyHttpClient ? opts : new PolicyHttpClient(opts);
  return client.evaluate({ subject, resource, action, context });
}

function sanitizeBaseUrl(url) {
  return url.replace(/\/$/, '');
}

async function safeText(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

module.exports = { PolicyHttpClient, evaluate };
