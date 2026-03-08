import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs';
import { ContextDisambiguator } from './resolution';
import { ImplicitRelationshipExtractor } from './relationships';
import { TransformerInferenceService } from './transformers';
import { GraphUpdater } from './graph_updater';

export interface RawDocument {
  id?: string;
  source: 'http' | 'kafka' | 'file';
  payload: Record<string, unknown>;
  receivedAt?: string;
  tenantId?: string; // Tenant Context
  language?: string;
}

export interface ProcessedDocument {
  id: string;
  normalized: Record<string, unknown>;
  context: string;
  annotations: Record<string, unknown>;
  entities: Array<{ canonicalName: string; aliases: string[]; type: string; confidence: number }>;
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
    } catch (error: any) {
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
  private graphUpdater: GraphUpdater;

  constructor(options: { modelName?: string } = {}) {
    this.kafka = new KafkaMessageParser();
    this.inference = new TransformerInferenceService({ modelName: options.modelName });
    this.disambiguator = new ContextDisambiguator();
    this.relationshipExtractor = new ImplicitRelationshipExtractor();
    this.graphUpdater = new GraphUpdater();
  }

  async ingestHttp(payload: Record<string, unknown>, tenantId: string = 'default', language: string = 'en'): Promise<RawDocument> {
    return {
      id: uuid(),
      source: 'http',
      payload: normalizePayload(payload),
      receivedAt: new Date().toISOString(),
      tenantId,
      language
    };
  }

  async ingestKafka(raw: Buffer, tenantId: string = 'default'): Promise<RawDocument> {
    const parsed = this.kafka.parseMessage(raw);
    return {
      id: uuid(),
      source: 'kafka',
      payload: normalizePayload(parsed),
      receivedAt: new Date().toISOString(),
      tenantId
    };
  }

  async ingestFile(filePath: string, tenantId: string = 'default'): Promise<RawDocument[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = content
      .split('\n')
      .map((line: string) => line.trim())
      .filter(Boolean);
    return rows.map((line: string) => ({
      id: uuid(),
      source: 'file',
      payload: { text: line },
      receivedAt: new Date().toISOString(),
      tenantId
    }));
  }

  async process(doc: RawDocument): Promise<ProcessedDocument> {
    const normalized = normalizePayload(doc.payload);
    const context = this.inference.toContextString(normalized);

    // 1. NER & Initial Parsing (Python Script via TransformerInferenceService)
    const annotations = await this.inference.annotate({ context, coref: {}, language: doc.language }); // coref passed empty initially

    const entities = (annotations.entities as Array<{ text: string; label: string; confidence: number }>) || [];
    const structuredRelationships = (annotations.relationships as Array<{ subject: string; object: string; predicate: string; confidence?: number; provenance?: string }>) || [];

    // 2. Clustering & Resolution
    const clusteredEntities = this.disambiguator.clusterEntities(entities);

    // 3. Disambiguation (using clusters)
    // Pass known entities if any found in annotation to help resolution
    const coref = await this.disambiguator.resolve(context, clusteredEntities);

    // 4. Enhanced Relationship Extraction (Merging Structured + Implicit)
    const relationships = this.relationshipExtractor.extract(context, coref, structuredRelationships);

    // 5. Update Knowledge Graph
    if (doc.tenantId) {
       // Ensure graphUpdater is ready/available (mock safe)
       if (this.graphUpdater && typeof this.graphUpdater.updateGraph === 'function') {
         await this.graphUpdater.updateGraph(doc.tenantId, clusteredEntities, relationships, doc.id || 'unknown');
       }
    }

    return {
      id: doc.id || uuid(),
      normalized,
      context,
      annotations,
      entities: clusteredEntities,
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
