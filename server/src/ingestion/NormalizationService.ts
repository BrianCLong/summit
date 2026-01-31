import { Entity, Edge, Document, ConnectorContext } from '../data-model/types';

export class NormalizationService {

  async normalize(records: any[], ctx: ConnectorContext): Promise<{
    entities: Entity[];
    edges: Edge[];
    documents: Document[];
  }> {
    const entities: Entity[] = [];
    const edges: Edge[] = [];
    const documents: Document[] = [];

    // Simple default normalization:
    // If record has 'text', treat as Document.
    // If record has 'id' and 'type', treat as Entity.

    for (const record of records) {
      if (record.text) {
        documents.push({
          id: record.id || `doc-${Math.random().toString(36).substr(2, 9)}`,
          tenantId: ctx.tenantId,
          text: record.text,
          title: record.title || 'Untitled',
          source: { system: 'pipeline', id: ctx.pipelineKey },
          metadata: record.metadata || {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          entityIds: []
        });
      } else if (record.type && record.id) {
        // Assume simple entity structure
        entities.push({
          id: record.id,
          tenantId: ctx.tenantId,
          kind: record.kind || 'custom',
          externalRefs: [],
          labels: record.labels || [],
          properties: record,
          sourceIds: [ctx.pipelineKey],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    return { entities, edges, documents };
  }
}
