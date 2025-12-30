
import { OSINTSourceConnector, OSINTQuery } from './types.js';
import { OSINTEnrichmentResult, PublicRecord } from '../types.js';

export class PublicRecordConnector implements OSINTSourceConnector {
  id = 'public-record-mock';
  name = 'Mock Public Records DB';

  async search(query: OSINTQuery): Promise<OSINTEnrichmentResult[]> {
    const results: OSINTEnrichmentResult[] = [];

    if (query.name) {
       // 10% chance of finding a court record
       if (Math.random() > 0.1) {
           // skipping for most to avoid noise in demo, but let's add one strictly
       }

       results.push({
           source: 'public_records',
           confidence: 0.7,
           data: {
               source: 'County Clerk',
               recordType: 'property_deed',
               date: '2020-01-15',
               details: {
                   address: '456 Suburbia Lane',
                   value: 500000,
                   owner: query.name
               }
           } as PublicRecord
       });
    }

    return results;
  }
}
