export type DisclosureArtifact =
  | 'audit-trail'
  | 'sbom'
  | 'attestations'
  | 'policy-reports';

export interface DisclosureJob {
  id: string;
  tenantId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  downloadUrl?: string;
  sha256?: string;
  warnings: string[];
  artifactStats: Record<string, number>;
  error?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function createDisclosureExport(payload: {
  tenantId: string;
  startTime: string;
  endTime: string;
  artifacts: DisclosureArtifact[];
  callbackUrl?: string;
}): Promise<DisclosureJob> {
  const response = await fetch(`${API_BASE}/disclosures/export`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': payload.tenantId,
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const body = await handleResponse<{ job: DisclosureJob }>(response);
  return body.job;
}

export async function getDisclosureJob(
  tenantId: string,
  jobId: string,
): Promise<DisclosureJob> {
  const response = await fetch(`${API_BASE}/disclosures/export/${jobId}`, {
    headers: {
      'x-tenant-id': tenantId,
    },
    credentials: 'include',
  });
  const body = await handleResponse<{ job: DisclosureJob }>(response);
  return body.job;
}

export async function listDisclosureJobs(
  tenantId: string,
): Promise<DisclosureJob[]> {
  const response = await fetch(`${API_BASE}/disclosures/export`, {
    headers: {
      'x-tenant-id': tenantId,
    },
    credentials: 'include',
  });
  const body = await handleResponse<{ jobs: DisclosureJob[] }>(response);
  return body.jobs;
}

export async function sendDisclosureAnalyticsEvent(
  event: 'view' | 'start',
  tenantId: string,
  context?: Record<string, unknown>,
) {
  try {
    const payload = JSON.stringify({ event, tenantId, context });
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(`${API_BASE}/disclosures/analytics`, blob);
      return;
    }

    await fetch(`${API_BASE}/disclosures/analytics`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-tenant-id': tenantId,
      },
      credentials: 'include',
      body: payload,
    });
  } catch (error) {
    console.warn('Disclosure analytics event failed', error);
  }
}
