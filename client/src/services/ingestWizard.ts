import type {
  AnalyzeResult,
  BuildSpecPayload,
  DryRunPayload,
  DryRunResponse,
  LicenseCheckPayload,
  LicenseResponse,
  TransformSpec,
  WizardMetadata,
} from '../features/ingest-wizard/types';

const BASE_PATH = '/api/ingest/wizard';

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_PATH}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? `Request to ${path} failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function analyzeSample(payload: { sample: string | Record<string, unknown>[]; format: 'csv' | 'json'; entityId?: string }): Promise<AnalyzeResult> {
  return request<AnalyzeResult>('/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function buildTransformSpec(payload: BuildSpecPayload): Promise<TransformSpec> {
  return request<TransformSpec>('/transform-spec', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function dryRunTransform(payload: DryRunPayload): Promise<DryRunResponse> {
  return request<DryRunResponse>('/dry-run', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function checkLicense(payload: LicenseCheckPayload): Promise<LicenseResponse> {
  return request<LicenseResponse>('/license/check', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchLicenses(): Promise<LicenseResponse> {
  return request<LicenseResponse>('/licenses', { method: 'GET' });
}

export function fetchMetadata(): Promise<WizardMetadata> {
  return request<WizardMetadata>('/metadata', { method: 'GET' });
}
