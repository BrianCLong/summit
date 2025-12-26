import * as fs from 'fs';
import * as path from 'path';

export interface EvidenceRecord {
  experimentId: string;
  timestamp: string;
  metric: string;
  value: any;
  context?: Record<string, any>;
}

export class EvidenceRecorder {
  private evidenceDir: string;

  constructor(evidenceDir: string = path.join(process.cwd(), 'research', 'evidence')) {
    this.evidenceDir = evidenceDir;
    if (!fs.existsSync(this.evidenceDir)) {
      fs.mkdirSync(this.evidenceDir, { recursive: true });
    }
  }

  record(experimentId: string, metric: string, value: any, context?: Record<string, any>): void {
    const record: EvidenceRecord = {
      experimentId,
      timestamp: new Date().toISOString(),
      metric,
      value,
      context
    };

    // Use high-resolution time to avoid collision in fast tests
    const hrTime = process.hrtime();
    const uniqueSuffix = `${hrTime[0] * 1e9 + hrTime[1]}`;
    const filename = `${experimentId}-${new Date().getTime()}-${uniqueSuffix}.json`;
    const filepath = path.join(this.evidenceDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(record, null, 2));
  }

  // Helper to read back evidence for an experiment
  getEvidence(experimentId: string): EvidenceRecord[] {
    if (!fs.existsSync(this.evidenceDir)) {
      return [];
    }

    const files = fs.readdirSync(this.evidenceDir);
    const records: EvidenceRecord[] = [];

    for (const file of files) {
      if (file.startsWith(experimentId)) {
        const content = fs.readFileSync(path.join(this.evidenceDir, file), 'utf-8');
        try {
          records.push(JSON.parse(content));
        } catch (e) {
          console.error(`Failed to parse evidence file ${file}`, e);
        }
      }
    }
    return records;
  }
}
