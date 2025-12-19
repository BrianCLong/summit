import { fetch } from 'undici';
import type { SubjectAttributes } from './types.js';

export interface DisclosureExportInput {
  action: 'disclosure:export';
  resource: {
    type: 'disclosure_pack';
    tenant_id: string;
    residency_region: string;
  };
  subject: SubjectAttributes;
}

export interface OpaDecisionResult {
  allow: boolean;
  reason?: string;
}

const DEFAULT_OPA_URL =
  'http://localhost:8181/v1/data/companyos/authz/disclosure_export/decision';

export async function evaluateDisclosureExport(
  input: DisclosureExportInput,
): Promise<OpaDecisionResult> {
  const opaUrl = process.env.OPA_URL ?? DEFAULT_OPA_URL;
  try {
    const res = await fetch(opaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });
    if (!res.ok) {
      return { allow: false, reason: 'opa_error' };
    }
    const body = (await res.json()) as { result?: unknown };
    const result = body.result as { allow?: boolean; reason?: string } | undefined;
    return {
      allow: result?.allow === true,
      reason: result?.reason,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[opa] evaluation failed', (error as Error).message);
    }
    return { allow: false, reason: 'opa_error' };
  }
}
