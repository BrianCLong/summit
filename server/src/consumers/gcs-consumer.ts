import { GCSConnector } from '../connectors/gcs';
import { PiiCategory, PiiTaggedField } from '../lib/pii/types';
import { ProvenanceMetadata } from '../lib/provenance/types';

export class GCSConsumer {
  private gcs: GCSConnector;

  constructor(gcs: GCSConnector) {
    this.gcs = gcs;
  }

  async processObject(objectName: string): Promise<void> {
    const metadata = await this.gcs.getObjectMetadata(objectName);

    if (!metadata.metadata) {
      console.log(`No metadata found for object: ${objectName}`);
      return;
    }

    const pii = this.parsePii(metadata.metadata.pii);
    const provenance = this.parseProvenance(metadata.metadata.provenance);

    if (this.hasHighlySensitivePii(pii)) {
      console.log(
        `Object ${objectName} contains highly sensitive PII. Skipping processing.`
      );
      return;
    }

    if (!this.isTrustedSource(provenance)) {
      console.log(
        `Object ${objectName} is from an untrusted source. Skipping processing.`
      );
      return;
    }

    const data = await this.gcs.downloadObject(objectName);
    console.log(`Processing object: ${objectName}, size: ${data.length}`);
    // ... process the data
  }

  private parsePii(piiString?: string): PiiTaggedField[] {
    if (!piiString) {
      return [];
    }
    try {
      return JSON.parse(piiString);
    } catch (error) {
      console.error('Failed to parse PII metadata:', error);
      return [];
    }
  }

  private parseProvenance(provenanceString?: string): ProvenanceMetadata | undefined {
    if (!provenanceString) {
      return undefined;
    }
    try {
      return JSON.parse(provenanceString);
    } catch (error) {
      console.error('Failed to parse provenance metadata:', error);
      return undefined;
    }
  }

  private hasHighlySensitivePii(pii: PiiTaggedField[]): boolean {
    for (const field of pii) {
      for (const key in field) {
        if (field[key].category === PiiCategory.HighlySensitive) {
          return true;
        }
      }
    }
    return false;
  }

  private isTrustedSource(provenance?: ProvenanceMetadata): boolean {
    if (!provenance) {
      return false;
    }
    return provenance.trustLevel > 0.8;
  }
}
