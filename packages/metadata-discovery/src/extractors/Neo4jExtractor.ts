/**
 * Neo4j Metadata Extractor
 * Extracts schema and metadata from Neo4j graph databases
 */

import { DiscoveredAsset, ExtractionResult, ExtractionStatistics } from '../types/discovery.js';

export interface Neo4jConnection {
  run(query: string, params?: any): Promise<Neo4jResult>;
  close(): Promise<void>;
}

export interface Neo4jResult {
  records: Array<{
    get(key: string): any;
    toObject(): any;
  }>;
}

export class Neo4jExtractor {
  constructor(private connection: Neo4jConnection) {}

  /**
   * Extract metadata from Neo4j database
   */
  async extract(): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      const assets: DiscoveredAsset[] = [];

      // Extract node labels (equivalent to tables)
      const nodeAssets = await this.extractNodeLabels();
      assets.push(...nodeAssets);

      // Extract relationship types
      const relationshipAssets = await this.extractRelationshipTypes();
      assets.push(...relationshipAssets);

      // Extract graph relationships
      const relationships = await this.extractGraphRelationships();

      const statistics: ExtractionStatistics = {
        totalAssets: assets.length,
        assetsWithSchema: assets.filter((a) => a.schema !== null).length,
        assetsWithSamples: assets.filter((a) => a.sampleData.length > 0).length,
        relationshipsInferred: relationships.length,
        processingTimeMs: Date.now() - startTime,
      };

      return {
        sourceId: 'neo4j',
        assets,
        relationships,
        statistics,
      };
    } catch (error) {
      throw new Error(`Neo4j extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract node label metadata
   */
  private async extractNodeLabels(): Promise<DiscoveredAsset[]> {
    // Get all node labels
    const labelQuery = 'CALL db.labels()';
    const labelResult = await this.connection.run(labelQuery);

    const assets: DiscoveredAsset[] = [];

    for (const record of labelResult.records) {
      const label = record.get('label');

      // Get node count
      const countQuery = `MATCH (n:${label}) RETURN count(n) as count`;
      const countResult = await this.connection.run(countQuery);
      const nodeCount = countResult.records[0]?.get('count')?.toNumber() || 0;

      // Get properties for this label
      const propsQuery = `
        MATCH (n:${label})
        WITH n LIMIT 100
        UNWIND keys(n) AS key
        RETURN DISTINCT key,
               count(*) as occurrences,
               collect(DISTINCT type(n[key]))[0..5] as types
        ORDER BY key
      `;
      const propsResult = await this.connection.run(propsQuery);

      const properties = propsResult.records.map((record) => ({
        name: record.get('key'),
        types: record.get('types'),
        occurrenceRate: record.get('occurrences') / Math.min(nodeCount, 100),
        nullable: record.get('occurrences') < Math.min(nodeCount, 100),
      }));

      // Get sample nodes
      const sampleQuery = `MATCH (n:${label}) RETURN n LIMIT 10`;
      const sampleResult = await this.connection.run(sampleQuery);
      const sampleData = sampleResult.records.map((record) => {
        const node = record.get('n');
        return node.properties || {};
      });

      assets.push({
        name: `neo4j.node.${label}`,
        type: 'NODE_LABEL',
        schema: {
          label,
          properties,
        },
        properties: {
          label,
          nodeCount,
        },
        statistics: {
          nodeCount,
        },
        sampleData,
      });
    }

    return assets;
  }

  /**
   * Extract relationship type metadata
   */
  private async extractRelationshipTypes(): Promise<DiscoveredAsset[]> {
    // Get all relationship types
    const typeQuery = 'CALL db.relationshipTypes()';
    const typeResult = await this.connection.run(typeQuery);

    const assets: DiscoveredAsset[] = [];

    for (const record of typeResult.records) {
      const relType = record.get('relationshipType');

      // Get relationship count
      const countQuery = `MATCH ()-[r:${relType}]->() RETURN count(r) as count`;
      const countResult = await this.connection.run(countQuery);
      const relCount = countResult.records[0]?.get('count')?.toNumber() || 0;

      // Get properties for this relationship type
      const propsQuery = `
        MATCH ()-[r:${relType}]->()
        WITH r LIMIT 100
        UNWIND keys(r) AS key
        RETURN DISTINCT key,
               count(*) as occurrences,
               collect(DISTINCT type(r[key]))[0..5] as types
        ORDER BY key
      `;
      const propsResult = await this.connection.run(propsQuery);

      const properties = propsResult.records.map((record) => ({
        name: record.get('key'),
        types: record.get('types'),
        occurrenceRate: record.get('occurrences') / Math.min(relCount, 100),
        nullable: record.get('occurrences') < Math.min(relCount, 100),
      }));

      // Get sample relationships
      const sampleQuery = `
        MATCH (a)-[r:${relType}]->(b)
        RETURN type(r) as type, properties(r) as props,
               labels(a)[0] as fromLabel, labels(b)[0] as toLabel
        LIMIT 10
      `;
      const sampleResult = await this.connection.run(sampleQuery);
      const sampleData = sampleResult.records.map((record) => record.toObject());

      assets.push({
        name: `neo4j.relationship.${relType}`,
        type: 'RELATIONSHIP_TYPE',
        schema: {
          relationshipType: relType,
          properties,
        },
        properties: {
          relationshipType: relType,
          relationshipCount: relCount,
        },
        statistics: {
          relationshipCount: relCount,
        },
        sampleData,
      });
    }

    return assets;
  }

  /**
   * Extract graph relationships between node labels
   */
  private async extractGraphRelationships(): Promise<any[]> {
    const query = `
      MATCH (a)-[r]->(b)
      WITH labels(a)[0] as fromLabel, type(r) as relType, labels(b)[0] as toLabel, count(*) as count
      RETURN fromLabel, relType, toLabel, count
      ORDER BY count DESC
    `;

    const result = await this.connection.run(query);

    return result.records.map((record) => ({
      fromAsset: `neo4j.node.${record.get('fromLabel')}`,
      toAsset: `neo4j.node.${record.get('toLabel')}`,
      type: 'GRAPH_RELATIONSHIP',
      confidence: 1.0,
      metadata: {
        relationshipType: record.get('relType'),
        count: record.get('count'),
      },
    }));
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.connection.close();
  }
}
