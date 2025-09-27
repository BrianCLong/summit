import fs from 'node:fs';

interface Event {
  host: string;
  action: string;
  entity: string;
  pii?: Record<string, unknown>;
}

const EXPORT_PII = process.env.EXPORT_PII === 'true';

export function exportEvent(event: Event): string {
  const payload = { ...event } as any;
  if (!EXPORT_PII) {
    delete payload.pii;
  }
  const line = JSON.stringify(payload);
  // Placeholder for sending to Splunk; here we append to file
  fs.appendFileSync('splunk-export.log', line + '\n');
  return line;
}
