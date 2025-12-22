import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { EvidenceRegistry } from './evidenceRegistry.js';
import {
  CustodyEvent,
  ExportJobResult,
  ExportManifest,
  ExportScope,
} from './types.js';

export interface EDiscoveryExportOptions {
  outputDir: string;
  evidenceRegistry: EvidenceRegistry;
}

export class EDiscoveryExportService {
  private readonly outputDir: string;
  private readonly evidenceRegistry: EvidenceRegistry;

  constructor(options: EDiscoveryExportOptions) {
    this.outputDir = options.outputDir;
    this.evidenceRegistry = options.evidenceRegistry;
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  async exportDataset(
    scope: ExportScope,
    records: unknown[],
  ): Promise<ExportJobResult> {
    const payloadPath = await this.writePayload(scope, records);
    const checksum = await this.hashFile(payloadPath);
    const manifest: ExportManifest = {
      manifestId: crypto.randomUUID(),
      holdId: scope.holdId,
      datasetId: scope.datasetId,
      createdAt: new Date(),
      recordCount: records.length,
      payloadPath,
      checksum,
      scope,
      verifier: 'sha256',
    };

    const artifact = await this.evidenceRegistry.registerArtifact({
      holdId: scope.holdId,
      datasetId: scope.datasetId,
      system: 'ediscovery-export',
      location: payloadPath,
      notes: scope.description,
      tags: ['ediscovery', 'export'],
      payload: await fsp.readFile(payloadPath),
    });

    const custodyEvent: CustodyEvent = {
      artifactId: artifact.id,
      eventType: 'exported',
      actor: 'ediscovery-service',
      channel: 'filesystem',
      occurredAt: new Date(),
      notes: 'Export manifest finalized',
      checksum,
    };

    await this.evidenceRegistry.recordCustodyEvent(custodyEvent);

    return { manifest, custodyEvent, evidenceArtifact: artifact };
  }

  private async writePayload(scope: ExportScope, records: unknown[]): Promise<string> {
    const filename = `${scope.datasetId}-${scope.holdId}-${Date.now()}.jsonl`;
    const payloadPath = path.join(this.outputDir, filename);
    const serialized = records
      .map((record) => JSON.stringify({ ...record, holdId: scope.holdId }))
      .join('\n');
    await fsp.writeFile(payloadPath, serialized, 'utf8');
    return payloadPath;
  }

  private async hashFile(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    const data = await fsp.readFile(filePath);
    hash.update(data);
    return hash.digest('hex');
  }
}

