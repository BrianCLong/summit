import axios from 'axios';

export interface OpaResult {
  allow: boolean;
  reason?: string;
  violations?: string[];
}

export class PolicyEvaluationError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'PolicyEvaluationError';
  }
}

export class OpaClient {
  private endpoint: string;

  constructor() {
    this.endpoint = process.env.OPA_ENDPOINT || 'http://localhost:8181';
  }

  async evaluate(policy: string, input: unknown): Promise<OpaResult> {
    const url = `${this.endpoint}/v1/data/${policy.replace(/\./g, '/')}`;

    let lastError: unknown;
    for (let i = 0; i < 3; i++) {
      try {
        const response = await axios.post(url, { input });
        return response.data.result as OpaResult;
      } catch (error: unknown) {
        lastError = error;
        const axiosError = error as { code?: string };
        if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ETIMEDOUT') {
          continue;
        }
        throw new PolicyEvaluationError('Failed to evaluate policy', error);
      }
    }
    throw new PolicyEvaluationError('Persistent failure calling OPA', lastError);
  }
}
