import { Metadata } from './pipeline';

export class RAGMetadataEnricher {
  enrich(source: string, contentType: string, timestamp: string = "1970-01-01T00:00:00Z"): Metadata {
    return {
      source,
      timestamp,
      contentType
    };
  }
}
