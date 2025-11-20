import { ExtractionResult } from '@intelgraph/metadata-extractor';

export interface Attribution {
  entity: string;
  role: 'author' | 'editor' | 'sender' | 'recipient' | 'device_owner' | 'software';
  confidence: number;
  artifacts: string[];
  evidence: any;
}

/**
 * Analyzer for attributing artifacts to entities
 */
export class AttributionAnalyzer {
  /**
   * Analyze extraction results and identify attributions
   */
  async analyze(results: ExtractionResult[]): Promise<Attribution[]> {
    const attributions = new Map<string, Attribution>();

    for (const result of results) {
      // Extract author attributions
      if (result.attribution?.author) {
        const key = `author:${result.attribution.author}`;
        if (!attributions.has(key)) {
          attributions.set(key, {
            entity: result.attribution.author,
            role: 'author',
            confidence: result.base.confidence,
            artifacts: [],
            evidence: {},
          });
        }
        attributions.get(key)!.artifacts.push(result.id);
      }

      // Extract editor attributions
      if (result.attribution?.lastModifiedBy) {
        const key = `editor:${result.attribution.lastModifiedBy}`;
        if (!attributions.has(key)) {
          attributions.set(key, {
            entity: result.attribution.lastModifiedBy,
            role: 'editor',
            confidence: result.base.confidence,
            artifacts: [],
            evidence: {},
          });
        }
        attributions.get(key)!.artifacts.push(result.id);
      }

      // Extract software attributions
      if (result.attribution?.softwareName) {
        const key = `software:${result.attribution.softwareName}`;
        if (!attributions.has(key)) {
          attributions.set(key, {
            entity: result.attribution.softwareName,
            role: 'software',
            confidence: result.base.confidence,
            artifacts: [],
            evidence: { version: result.attribution.softwareVersion },
          });
        }
        attributions.get(key)!.artifacts.push(result.id);
      }

      // Extract device owner attributions
      if (result.device?.manufacturer || result.device?.model) {
        const entity = [result.device.manufacturer, result.device.model]
          .filter(Boolean)
          .join(' ');
        const key = `device:${entity}`;
        if (!attributions.has(key)) {
          attributions.set(key, {
            entity,
            role: 'device_owner',
            confidence: result.base.confidence * 0.8, // Lower confidence for device
            artifacts: [],
            evidence: result.device,
          });
        }
        attributions.get(key)!.artifacts.push(result.id);
      }

      // Extract communication attributions
      const comm = (result as any).communication;
      if (comm?.email?.from) {
        const entity = comm.email.from.address;
        const key = `sender:${entity}`;
        if (!attributions.has(key)) {
          attributions.set(key, {
            entity,
            role: 'sender',
            confidence: result.base.confidence,
            artifacts: [],
            evidence: comm.email.from,
          });
        }
        attributions.get(key)!.artifacts.push(result.id);
      }
    }

    return Array.from(attributions.values()).sort((a, b) => b.artifacts.length - a.artifacts.length);
  }
}
