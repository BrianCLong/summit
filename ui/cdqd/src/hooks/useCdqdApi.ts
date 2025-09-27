import type { AnomalyResponse, ConfigResponse, ReplayResult, SuppressionInput } from '../types';

const DEFAULT_BASE = import.meta.env.VITE_CDQD_API ?? '';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }
  return response.json() as Promise<T>;
}

export function useCdqdApi(baseUrl: string = DEFAULT_BASE) {
  const resolveUrl = (path: string) => `${baseUrl}${path}`;

  return {
    async listAnomalies(): Promise<AnomalyResponse> {
      const response = await fetch(resolveUrl('/api/v1/anomalies'));
      return handleResponse<AnomalyResponse>(response);
    },
    async fetchConfig(): Promise<ConfigResponse> {
      const response = await fetch(resolveUrl('/api/v1/config'));
      return handleResponse<ConfigResponse>(response);
    },
    async replay(): Promise<ReplayResult> {
      const response = await fetch(resolveUrl('/api/v1/replay'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      return handleResponse<ReplayResult>(response);
    },
    async createSuppression(input: SuppressionInput): Promise<void> {
      const response = await fetch(resolveUrl('/api/v1/suppressions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      await handleResponse<void>(response);
    }
  };
}

