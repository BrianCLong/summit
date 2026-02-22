
import { OSINTProfile, OSINTEnrichmentResult, SocialMediaProfile, CorporateRecord, PublicRecord } from './types';
import { OSINTSourceConnector, OSINTQuery } from './connectors/types';
import { SocialMediaConnector } from './connectors/SocialMediaConnector';
import { CorporateDBConnector } from './connectors/CorporateDBConnector';
import { PublicRecordConnector } from './connectors/PublicRecordConnector';

/**
 * Extended enrichment result that includes raw results for claim extraction.
 */
export interface EnrichmentOutput extends Partial<OSINTProfile> {
  results: OSINTEnrichmentResult[];
}

export class OSINTEnrichmentService {
  private connectors: OSINTSourceConnector[];

  constructor() {
    this.connectors = [
      new SocialMediaConnector(),
      new CorporateDBConnector(),
      new PublicRecordConnector()
    ];
  }

  async enrich(query: OSINTQuery): Promise<EnrichmentOutput> {
    const promises = this.connectors.map(c => c.search(query));
    const resultsSettled = await Promise.allSettled(promises);

    const results = resultsSettled
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value)
        .flat();

    if (resultsSettled.some(r => r.status === 'rejected')) {
        // Log errors in real implementation
        // console.error('Some connectors failed', resultsSettled.filter(r => r.status === 'rejected'));
    }

    // Aggregate results into a partial profile
    const profile: Partial<OSINTProfile> = {
      socialProfiles: [],
      corporateRecords: [],
      publicRecords: [],
      properties: {},
      externalRefs: [],
      labels: ['osint-enriched']
    };

    for (const res of results) {
      if (res.data) {
        // Simple type checking based on properties
        if ('platform' in res.data) {
          profile.socialProfiles!.push(res.data as SocialMediaProfile);
        } else if ('incorporationDate' in res.data) {
          profile.corporateRecords!.push(res.data as CorporateRecord);
        } else if ('recordType' in res.data) {
          profile.publicRecords!.push(res.data as PublicRecord);
        }
      }
    }

    // Calculate a confidence score based on number of sources found
    const sourceCount = new Set(results.map(r => r.source)).size;
    profile.confidenceScore = Math.min(0.5 + (sourceCount * 0.1), 1.0); // Base 0.5 + 0.1 per unique source

    return {
      ...profile,
      results, // Include raw results for claim extraction (Turn #5)
    };
  }
}
