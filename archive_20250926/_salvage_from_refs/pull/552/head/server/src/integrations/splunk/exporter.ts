const SENSITIVE = process.env.ENABLE_SENSITIVE_EXPORTS === 'true';

export function exportEvent(eventType: string, payload: Record<string, any>) {
  const data = { event: eventType, ...payload };
  if (!SENSITIVE) {
    for (const key of Object.keys(data)) {
      if (key.toLowerCase().includes('embedding') || key.toLowerCase().includes('hash')) {
        delete (data as any)[key];
      }
    }
  }
  // In real life send to Splunk HEC
  if (process.env.SPLUNK_DEBUG === 'true') {
    console.log('splunk', JSON.stringify(data));
  }
  return data;
}
