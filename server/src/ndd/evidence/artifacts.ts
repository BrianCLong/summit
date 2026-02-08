import fs from 'fs/promises';
import path from 'path';

export interface EvidenceConfig {
  datasetId: string;
  pipelineVersion: string;
  runId: string;
  outputDir: string;
}

export interface StampData {
  code_sha: string;
  data_sha: string;
  model_sha: string;
  seed: number;
  pipeline_version: string;
  start_time: string;
  end_time: string;
  determinism_ok: boolean;
  [key: string]: any;
}

export class EvidenceWriter {
  private config: EvidenceConfig;

  constructor(config: EvidenceConfig) {
    this.config = config;
  }

  generateEvidenceId(artifactType: string, dateStr?: string): string {
    const date = dateStr || new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `EVID-NDD-${date}-${this.config.datasetId}-${this.config.pipelineVersion}-${this.config.runId}-${artifactType}`;
  }

  async writeArtifact(artifactType: string, data: any): Promise<string> {
    const filename = `${artifactType}.json`;
    const filepath = path.join(this.config.outputDir, filename);

    // Deep sort keys for deterministic output
    const deterministicData = this.deepSort(data);
    const content = JSON.stringify(deterministicData, null, 2);

    await fs.mkdir(this.config.outputDir, { recursive: true });
    await fs.writeFile(filepath, content, 'utf-8');

    return filepath;
  }

  async writeStamp(stampData: StampData): Promise<string> {
    return this.writeArtifact('stamp', stampData);
  }

  async writeReport(reportData: any): Promise<string> {
    return this.writeArtifact('report', reportData);
  }

  private deepSort(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      // For arrays, we don't sort the array itself (order matters in lists usually),
      // but we recursively sort the items within it.
      return obj.map((item) => this.deepSort(item));
    }
    const sortedObj: any = {};
    Object.keys(obj).sort().forEach((key) => {
      sortedObj[key] = this.deepSort(obj[key]);
    });
    return sortedObj;
  }
}
