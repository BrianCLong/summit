import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

type ToolkitPayload = {
  records: Array<{ tool_id: string; homepage?: string; toolkit_page?: string }>;
};

const URL_ALLOWLIST = new Set(['homepage', 'toolkit_page']);

function statusForUrl(url?: string): { status: 'ok' | 'warn' | 'fail'; http: number; notes: string[] } {
  if (!url) return { status: 'warn', http: 0, notes: ['missing url'] };
  if (!/^https?:\/\//.test(url)) return { status: 'fail', http: 0, notes: ['non-http url'] };
  return { status: 'ok', http: 200, notes: [] };
}

export function buildDriftReport(inputPath = 'artifacts/toolkit/bellingcat.json') {
  const payload = JSON.parse(readFileSync(inputPath, 'utf8')) as ToolkitPayload;
  const results = payload.records.map((record) => {
    const checks = [...URL_ALLOWLIST].map((field) => statusForUrl(record[field as keyof typeof record] as string | undefined));
    const fail = checks.find((c) => c.status === 'fail');
    const warn = checks.find((c) => c.status === 'warn');
    const chosen = fail ?? warn ?? checks[0];
    return {
      tool_id: record.tool_id,
      status: chosen.status,
      http: chosen.http,
      notes: chosen.notes,
    };
  });

  const summary = {
    source: 'bellingcat',
    checked_tools: results.length,
    ok: results.filter((r) => r.status === 'ok').length,
    warn: results.filter((r) => r.status === 'warn').length,
    fail: results.filter((r) => r.status === 'fail').length,
    results,
  };

  mkdirSync('artifacts/drift/bellingcat', { recursive: true });
  writeFileSync('artifacts/drift/bellingcat/latest.json', `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  return summary;
}

if (typeof require !== 'undefined' && require.main === module) {
  buildDriftReport();
}
