
import { OSINTEnrichmentResult } from '../types.js';

export interface OSINTQuery {
  name?: string;
  email?: string;
  username?: string;
  companyName?: string;
  domain?: string;
}

export interface OSINTSourceConnector {
  id: string;
  name: string;
  search(query: OSINTQuery): Promise<OSINTEnrichmentResult[]>;
}
