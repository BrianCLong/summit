import { Enricher } from './enricher';

export class GeoIPEnricher implements Enricher {
  name = 'geoip';

  async enrich(data: Record<string, any>): Promise<Record<string, any>> {
    if (data.ip_address) {
      // Mock enrichment
      data.location = {
        city: 'Mock City',
        country: 'Mock Country',
      };
    }
    return data;
  }
}
