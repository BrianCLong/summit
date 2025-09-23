import crypto from 'crypto';
import { BaseConnector, RawItem } from './BaseConnector';

export class TaxiiConnector extends BaseConnector {
  constructor(sourceId: string, public discoveryUrl: string, private apiRoot: string, private collectionId: string, private auth?: { username?:string; token?:string }) {
    super(sourceId, discoveryUrl);
  }
  kind() { return 'TAXII'; }
  *buildRequests() { yield { url: `${this.apiRoot}/collections/${this.collectionId}/objects` }; }
  parse(json: string): RawItem[] {
    const data = JSON.parse(json || '{}');
    const objects = data.objects || [];
    return objects.map((o:any) => ({
      id: crypto.createHash('sha256').update(String(o.id||JSON.stringify(o))).digest('hex'),
      title: o.name || o.type,
      url: undefined,
      publishedAt: o.modified || o.created,
      language: 'en',
      raw: o,
      body: o.description || undefined
    }));
  }
}

