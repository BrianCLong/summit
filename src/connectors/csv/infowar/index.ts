export interface InfoWarIncident {
  incident_id: string;
  title: string;
  date: string;
  description: string;
  actors: string[];
  platforms: string[];
  evidence_ids: string[];
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface CSVIngestOptions {
  filePath: string;
  delimiter?: string;
}

/**
 * Stub for CSV incident ledger ingestion.
 * This defines the expected interface for processing InfoWar incident data.
 */
export class InfoWarCSVConnector {
  async ingest(options: CSVIngestOptions): Promise<InfoWarIncident[]> {
    // Stub implementation: return empty array or process synthetic fixtures in tests
    console.log(`Stub ingesting CSV from ${options.filePath}`);
    return [];
  }
}
