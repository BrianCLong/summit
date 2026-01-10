
import { IngestionEvent } from '../../connectors/types.js';

export interface EnrichmentResult {
  enrichedData: Record<string, any>;
  metadata: Record<string, any>;
}

export interface EnricherConfig {
  id: string;
  type: string;
  config: Record<string, any>;
}

export abstract class BaseEnricher {
  protected config: EnricherConfig;

  constructor(config: EnricherConfig) {
    this.config = config;
  }

  abstract enrich(event: IngestionEvent): Promise<EnrichmentResult>;
}
