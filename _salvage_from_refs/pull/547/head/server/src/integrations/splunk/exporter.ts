import axios from 'axios';

export interface SplunkEvent {
  message: string;
  features?: Record<string, unknown>;
  [key: string]: any;
}

const ENABLE_PII_EXPORT = process.env.ENABLE_PII_EXPORT === 'true';

export async function exportEvent(event: SplunkEvent): Promise<void> {
  const url = process.env.SPLUNK_HEC_URL;
  if (!url) return;
  const payload = { ...event };
  if (!ENABLE_PII_EXPORT && payload.features) {
    payload.features = '[redacted]';
  }
  await axios.post(url, payload);
}
