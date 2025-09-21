import crypto from 'crypto';
import { BaseConnector, RawItem } from './BaseConnector';

export class MispConnector extends BaseConnector {
  constructor(sourceId: string, public apiUrl: string, private apiKey: string) {
    super(sourceId, apiUrl);
  }
  kind() { return 'MISP'; }
  *buildRequests() { yield { url: `${this.apiUrl}/events/restSearch` }; }
  parse(json: string): RawItem[] {
    let data: any = {};
    try { data = JSON.parse(json); } catch { data = {}; }
    const events = data.response || data || [];
    return events.map((e:any) => ({
      id: crypto.createHash('sha256').update(String(e?.Event?.uuid || e?.uuid || JSON.stringify(e))).digest('hex'),
      title: e?.Event?.info || 'MISP Event',
      url: undefined,
      publishedAt: e?.Event?.date || e?.date,
      language: 'en',
      raw: e,
      body: e?.Event?.analysis || undefined
    }));
  }
}

