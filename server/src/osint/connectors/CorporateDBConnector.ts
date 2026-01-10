
import { OSINTSourceConnector, OSINTQuery } from './types.js';
import { OSINTEnrichmentResult, CorporateRecord } from '../types.js';

export class CorporateDBConnector implements OSINTSourceConnector {
  id = 'corporate-db-mock';
  name = 'Mock Corporate Registry';

  async search(query: OSINTQuery): Promise<OSINTEnrichmentResult[]> {
    const results: OSINTEnrichmentResult[] = [];

    if (query.companyName || (query.domain && !query.name)) { // assume query is for a company if domain provided without person name
        const name = query.companyName || (query.domain ? query.domain.split('.')[0] : 'Unknown Corp');

        results.push({
            source: 'corporate_registry',
            confidence: 0.95,
            data: {
                companyName: name,
                registrationNumber: `REG-${Math.floor(Math.random() * 1000000)}`,
                jurisdiction: 'Delaware, USA',
                incorporationDate: '2015-05-12',
                status: 'active',
                address: '123 Innovation Way, Tech City',
                officers: [
                    { name: 'Alice CEO', role: 'CEO' },
                    { name: 'Bob CTO', role: 'CTO' }
                ]
            } as CorporateRecord
        });
    }

    return results;
  }
}
