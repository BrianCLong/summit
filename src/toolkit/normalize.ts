import { readFileSync } from 'node:fs';

export type ToolkitRecord = {
  tool_id: string;
  name: string;
  source: 'bellingcat';
  homepage: string;
  toolkit_page?: string;
  categories: string[];
  availability: {
    type: 'web' | 'desktop' | 'cli' | 'api' | 'dataset';
    auth_required?: boolean;
    cost?: 'free' | 'freemium' | 'paid' | 'unknown';
  };
  risk: {
    data_sensitivity: 'low' | 'medium' | 'high';
    tos_risk: 'low' | 'medium' | 'high';
    pii_risk: 'low' | 'medium' | 'high';
  };
  limitations?: string[];
  evidence: { claim_ids: string[] };
};

export function normalizeToolkitRecords(records: ToolkitRecord[]): ToolkitRecord[] {
  return [...records]
    .map((record) => ({
      ...record,
      categories: [...record.categories].sort((a, b) => a.localeCompare(b)),
      limitations: record.limitations ? [...record.limitations].sort((a, b) => a.localeCompare(b)) : undefined,
      evidence: { claim_ids: [...record.evidence.claim_ids].sort((a, b) => a.localeCompare(b)) },
    }))
    .sort((a, b) => a.tool_id.localeCompare(b.tool_id));
}

export function loadToolkitJson(path: string): ToolkitRecord[] {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as { records: ToolkitRecord[] };
  return normalizeToolkitRecords(parsed.records ?? []);
}
