// @ts-nocheck
import pino from 'pino';
import { DisclosurePackager, EvidenceItem } from './DisclosurePackager.js';
import {
  assertPublishReadyCitations,
  normalizeCitationModel,
} from '../graphrag/citation-gate.js';

const log = pino({ name: 'ReportServiceV2' });

export interface ReportSection {
  title: string;
  content: string;
  type: 'text' | 'table' | 'citation';
}

export interface ReportRequest {
  title: string;
  sections: ReportSection[];
  citations: { evidenceId: string, text: string }[];
  coi?: string[];
  ch?: string[]; // Competing Hypotheses
}

export class ReportServiceV2 {
  private packager = new DisclosurePackager();

  public async createReport(req: ReportRequest): Promise<any> {
    // 1. Enforce "Citations or Block"
    this.validateCitations(req);

    // 2. Auto-insert CH/COI
    const finalSections = [...req.sections];

    if (req.ch && req.ch.length > 0) {
      finalSections.push({
        title: 'Analysis of Competing Hypotheses',
        type: 'table',
        content: JSON.stringify(req.ch) // Simplified
      });
    }

    if (req.coi && req.coi.length > 0) {
      finalSections.push({
        title: 'Conflicts of Interest / Disclosure',
        type: 'text',
        content: req.coi.join('\n')
      });
    }

    // 3. Generate Manifest
    // Mock evidence retrieval based on citations
    const evidenceItems: EvidenceItem[] = req.citations.map((c) => ({
      id: c.evidenceId,
      content: c.text, // In reality, fetch from DB
      source: 'Internal DB',
      timestamp: new Date().toISOString(),
    }));

    const manifest = this.packager.createManifest(evidenceItems, 'https://compliance.intelgraph.io/reply');

    const report = {
      title: req.title,
      sections: finalSections,
      generatedAt: new Date().toISOString()
    };

    // 4. Persistence (Simulation)
    await this.persistReport(report, manifest);

    return { report, manifest };
  }

  private validateCitations(req: ReportRequest): void {
    const normalized = (req.citations || []).map((c) =>
      normalizeCitationModel({ evidenceId: c.evidenceId, snippet: c.text }),
    );

    assertPublishReadyCitations({ citations: normalized });
  }

  private async persistReport(report: any, manifest: any): Promise<void> {
    // TODO: Integrate with PostgreSQL 'reports' and 'provenance_manifests' tables
    // const pool = getPostgresPool();
    // await pool.query('INSERT INTO reports ...');

    log.info({ reportTitle: report.title, manifestRoot: manifest.rootHash },
      'PERSISTENCE: Report and Manifest saved to database (Simulated)');
  }
}
