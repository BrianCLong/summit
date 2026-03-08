export interface ConnectorConfig {
  parameters: any;
  batchSize?: number;
}

export interface IngestRecord {
  id: string;
  type: string;
  properties: Record<string, any>;
  provenance: {
    source: string;
    ingested_at: string;
    bucket?: string;
    key?: string;
    row_hash?: string;
    rowNumber?: number;
    originalRow?: any;
  };
}

// Global declaration for csv-parser if missing types
declare module 'csv-parser' {
    import { Transform } from 'stream';
    function csv(options?: any): Transform;
    export = csv;
}
