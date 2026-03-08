import fs from 'fs';
import path from 'path';
import { EvidenceIndex, Report, Metrics, Stamp, Classification } from './types.js';

export class EvidenceWriter {
  private baseDir: string;
  private version: string;

  constructor(baseDir: string, version: string = '1.0.0') {
    this.baseDir = baseDir;
    this.version = version;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  public writeEvidence(
    evidenceId: string,
    classification: Classification,
    summary: string,
    metricsData: Record<string, number | string | boolean>,
    notes: string[] = []
  ): void {
    const evidenceDir = path.join(this.baseDir, evidenceId);
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }

    const report: Report = {
      evidence_id: evidenceId,
      classification,
      summary,
      notes,
    };
    // Ensure determinism by sorting keys if needed, but JS objects generally preserve insertion order for non-integer keys.
    // We rely on consistent input order or just that JSON is mostly stable.
    this.writeJson(path.join(evidenceDir, 'report.json'), report);

    const metrics: Metrics = {
      evidence_id: evidenceId,
      metrics: metricsData,
    };
    this.writeJson(path.join(evidenceDir, 'metrics.json'), metrics);

    const stamp: Stamp = {
      evidence_id: evidenceId,
      generated_at: new Date().toISOString(),
    };
    this.writeJson(path.join(evidenceDir, 'stamp.json'), stamp);

    this.updateIndex(evidenceId, evidenceDir);
  }

  private writeJson(filePath: string, data: any): void {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  }

  private updateIndex(evidenceId: string, evidencePath: string): void {
    const indexFile = path.join(this.baseDir, 'index.json');
    let index: EvidenceIndex = { version: this.version, items: [] };

    if (fs.existsSync(indexFile)) {
      try {
        const content = fs.readFileSync(indexFile, 'utf-8');
        index = JSON.parse(content);
      } catch (e) {
        // Create new if corrupt or empty
        index = { version: this.version, items: [] };
      }
    }

    // Remove existing entry for this ID if any
    index.items = index.items.filter(item => item.evidence_id !== evidenceId);

    // Add new entry
    const relPath = path.relative(this.baseDir, evidencePath);
    index.items.push({ evidence_id: evidenceId, path: relPath });

    // Sort items by ID for deterministic index
    index.items.sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));

    this.writeJson(indexFile, index);
  }
}
