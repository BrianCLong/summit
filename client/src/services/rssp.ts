import { apiBase } from './api';

type HeadersInitLoose = Record<string, string>;

const REGULATOR_HEADERS: HeadersInitLoose = {
  'X-Tenant-Id': 'regulator-oversight',
  'X-Purpose': 'regulatory-audit',
  'X-Legal-Basis': 'GDPR Art.6(1)(c)',
  'X-Sensitivity': 'confidential',
  'X-RSSP-Role': 'regulator',
};

function buildHeaders(extra: HeadersInitLoose = {}, includeJson = true): HeadersInitLoose {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
  const headers: HeadersInitLoose = {
    Accept: 'application/json',
    ...REGULATOR_HEADERS,
    ...extra,
  };
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `RSSP request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export interface RSSPAttestationSummary {
  id: string;
  type: string;
  title: string;
  summary: string;
  issuedAt: string;
  jurisdiction: string[];
  retentionPolicy: string;
  payloadHash: string;
  exportHash: string;
  verification: {
    algorithm: string;
    signature: string;
  };
}

export interface RSSPAttestationDetail extends RSSPAttestationSummary {
  payload: Record<string, unknown>;
  verification: {
    algorithm: string;
    signature: string;
    message: string;
  };
  exportPackBytes: number;
}

export interface RSSPVerificationResponse {
  attestationId: string;
  result: {
    ok: boolean;
    checklist: {
      payloadHashMatches: boolean;
      exportHashMatches: boolean;
      signatureValid: boolean;
    };
  };
}

export async function fetchPublicKey(): Promise<string> {
  const response = await fetch(`${apiBase()}/api/rssp/public-key`, {
    headers: buildHeaders({}, false),
  });
  const data = await handleJson<{ publicKey: string }>(response);
  return data.publicKey;
}

export async function fetchAttestations(): Promise<RSSPAttestationSummary[]> {
  const response = await fetch(`${apiBase()}/api/rssp/attestations`, {
    headers: buildHeaders({}, false),
  });
  const data = await handleJson<{ attestations: RSSPAttestationSummary[] }>(response);
  return data.attestations;
}

export async function fetchAttestationDetail(id: string): Promise<RSSPAttestationDetail> {
  const response = await fetch(`${apiBase()}/api/rssp/attestations/${encodeURIComponent(id)}`, {
    headers: buildHeaders({}, false),
  });
  return handleJson<RSSPAttestationDetail>(response);
}

export async function fetchServerVerification(id: string): Promise<RSSPVerificationResponse> {
  const response = await fetch(`${apiBase()}/api/rssp/attestations/${encodeURIComponent(id)}/verify`, {
    method: 'POST',
    headers: buildHeaders(),
  });
  return handleJson<RSSPVerificationResponse>(response);
}

export async function fetchExportPack(id: string): Promise<Uint8Array> {
  const response = await fetch(`${apiBase()}/api/rssp/attestations/${encodeURIComponent(id)}/export`, {
    headers: buildHeaders({ Accept: 'application/octet-stream' }, false),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to download export pack (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
