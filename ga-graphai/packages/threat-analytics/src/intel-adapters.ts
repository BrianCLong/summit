import type { ThreatIntelClient, ThreatIntelIndicator } from './types';

interface StixObject {
  id: string;
  type: string;
  pattern?: string;
  confidence?: number;
  valid_until?: string;
  labels?: string[];
}

function parsePattern(pattern: string): { type: ThreatIntelIndicator['type']; value: string } | undefined {
  const normalized = pattern.toLowerCase();
  if (normalized.includes('ipv4-addr')) {
    const match = /\'([0-9.]+)\'/.exec(pattern);
    if (match) {
      return { type: 'ip', value: match[1] };
    }
  }
  if (normalized.includes('domain-name')) {
    const match = /\'([^']+)\'/.exec(pattern);
    if (match) {
      return { type: 'domain', value: match[1] };
    }
  }
  if (normalized.includes('file:hashes')) {
    const match = /\'([0-9a-f]{16,})\'/.exec(pattern);
    if (match) {
      return { type: 'hash', value: match[1] };
    }
  }
  return undefined;
}

export class StixBundleAdapter implements ThreatIntelClient {
  readonly name = 'stix-adapter';

  constructor(private readonly fetchBundle: () => Promise<{ objects: StixObject[] }>) {}

  async fetchIndicators(): Promise<ThreatIntelIndicator[]> {
    const bundle = await this.fetchBundle();
    const indicators: ThreatIntelIndicator[] = [];
    for (const object of bundle.objects ?? []) {
      if (object.type !== 'indicator' || !object.pattern) {
        continue;
      }
      const parsed = parsePattern(object.pattern);
      if (!parsed) {
        continue;
      }
      indicators.push({
        id: object.id,
        value: parsed.value,
        type: parsed.type,
        confidence: object.confidence ?? 50,
        source: 'STIX',
        validUntil: object.valid_until,
        tags: object.labels,
      });
    }
    return indicators;
  }
}

export class TaxiiCollectionClient implements ThreatIntelClient {
  readonly name: string;

  constructor(
    name: string,
    private readonly fetchCollection: () => Promise<ThreatIntelIndicator[]>,
  ) {
    this.name = name;
  }

  async fetchIndicators(): Promise<ThreatIntelIndicator[]> {
    const indicators = await this.fetchCollection();
    return indicators.map((indicator) => ({ ...indicator, source: 'TAXII' as const }));
  }
}

export class MispClient implements ThreatIntelClient {
  readonly name = 'misp-client';

  constructor(private readonly fetchFeed: () => Promise<ThreatIntelIndicator[]>) {}

  async fetchIndicators(): Promise<ThreatIntelIndicator[]> {
    const indicators = await this.fetchFeed();
    return indicators.map((indicator) => ({ ...indicator, source: 'MISP' as const }));
  }
}
