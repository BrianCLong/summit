import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs';
import { ContextDisambiguator } from './resolution';
import { ImplicitRelationshipExtractor } from './relationships';
import { TransformerInferenceService } from './transformers';

export interface RawDocument {
  id?: string;
  source: 'http' | 'kafka' | 'file';
  payload: Record<string, unknown>;
  receivedAt?: string;
}

export interface ProcessedDocument {
  id: string;
  normalized: Record<string, unknown>;
  context: string;
  annotations: Record<string, unknown>;
  relationships: Array<{
    subject: string;
    object: string;
    predicate: string;
    confidence: number;
    provenance: string;
  }>;
}

class KafkaMessageParser {
  parseMessage(raw: Buffer): Record<string, unknown> {
    try {
      return JSON.parse(raw.toString());
    } catch (error) {
      return { text: raw.toString(), error: (error as Error).message };
    }
  }
}

function normalizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const trimmed: Record<string, unknown> = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (typeof value === 'string') {
      trimmed[key] = value.trim();
    } else {
      trimmed[key] = value;
    }
  });
  return trimmed;
}

export class TextIngestionPipeline {
  private kafka: KafkaMessageParser;
  private inference: TransformerInferenceService;
  private disambiguator: ContextDisambiguator;
  private relationshipExtractor: ImplicitRelationshipExtractor;

  constructor(options: { modelName?: string } = {}) {
    this.kafka = new KafkaMessageParser();
    this.inference = new TransformerInferenceService({ modelName: options.modelName });
    this.disambiguator = new ContextDisambiguator();
    this.relationshipExtractor = new ImplicitRelationshipExtractor();
  }

  async ingestHttp(payload: Record<string, unknown>): Promise<RawDocument> {
    return {
      id: uuid(),
      source: 'http',
      payload: normalizePayload(payload),
      receivedAt: new Date().toISOString(),
    };
  }

  async ingestKafka(raw: Buffer): Promise<RawDocument> {
    const parsed = this.kafka.parseMessage(raw);
    return {
      id: uuid(),
      source: 'kafka',
      payload: normalizePayload(parsed),
      receivedAt: new Date().toISOString(),
    };
  }

  async ingestFile(filePath: string): Promise<RawDocument[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return rows.map((line) => ({
      id: uuid(),
      source: 'file',
      payload: { text: line },
      receivedAt: new Date().toISOString(),
    }));
  }

  async process(doc: RawDocument): Promise<ProcessedDocument> {
    const normalized = normalizePayload(doc.payload);
    const context = this.inference.toContextString(normalized);
    const coref = await this.disambiguator.resolve(context);
    const relationships = this.relationshipExtractor.extract(context, coref);

    const annotations = await this.inference.annotate({ context, coref });

    return {
      id: doc.id || uuid(),
      normalized,
      context,
      annotations,
      relationships,
    };
  }

  async batchProcess(docs: RawDocument[]): Promise<ProcessedDocument[]> {
    const seen = new Set<string>();
    const uniqueDocs = docs.filter((doc) => {
      const key = JSON.stringify(doc.payload);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return Promise.all(uniqueDocs.map((doc) => this.process(doc)));
  }
}

export const defaultTestSetPath = path.join(__dirname, '..', '..', 'data', 'domain-test-set.json');

export function loadDomainTestSet(filePath: string = defaultTestSetPath): Array<Record<string, unknown>> {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}
