/**
 * Neo4j Graph Storage for Threat Intelligence
 * Stores STIX objects and relationships for graph-based analysis
 */

import neo4j, { Driver, Session, ManagedTransaction, Integer, Node, Relationship as Neo4jRelationship, Path, PathSegment } from 'neo4j-driver';
import pino from 'pino';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Transaction = ManagedTransaction;
import type {
  StixObject,
  StixId,
  StixDomainObject,
  Relationship,
  Sighting,
  ThreatActor,
  Campaign,
  IntrusionSet,
  Malware,
  AttackPattern,
  Indicator,
  Infrastructure,
  Tool,
  Vulnerability,
  IngestionMetadata,
} from '../types/stix-2.1.js';

const logger = pino({ name: 'neo4j-graph-store' });

export interface Neo4jGraphStoreConfig {
  uri?: string;
  username?: string;
  password?: string;
  database?: string;
  maxConnectionPoolSize?: number;
}

export interface GraphNode {
  id: StixId;
  type: string;
  name?: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface GraphRelationship {
  id: string;
  type: string;
  sourceId: StixId;
  targetId: StixId;
  properties: Record<string, unknown>;
}

export interface ThreatActorGraph {
  actor: ThreatActor;
  campaigns: Campaign[];
  malware: Malware[];
  tools: Tool[];
  attackPatterns: AttackPattern[];
  targets: Array<{ type: string; name: string; id: StixId }>;
  infrastructure: Infrastructure[];
  relationships: GraphRelationship[];
}

export interface PathResult {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  length: number;
}

export class Neo4jGraphStore {
  private readonly driver: Driver;
  private readonly database: string;
  private initialized = false;

  constructor(config: Neo4jGraphStoreConfig = {}) {
    const uri = config.uri || process.env.NEO4J_URI || 'bolt://localhost:7687';
    const username = config.username || process.env.NEO4J_USER || 'neo4j';
    const password = config.password || process.env.NEO4J_PASSWORD || 'devpassword';
    this.database = config.database || process.env.NEO4J_DATABASE || 'neo4j';

    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
      maxConnectionPoolSize: config.maxConnectionPoolSize || 50,
      connectionTimeout: 5000,
    });
  }

  /**
   * Initialize database schema and constraints
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const session = this.driver.session({ database: this.database });
    try {
      // Create constraints for STIX objects
      const constraints = [
        'CREATE CONSTRAINT stix_object_id IF NOT EXISTS FOR (n:StixObject) REQUIRE n.stix_id IS UNIQUE',
        'CREATE CONSTRAINT threat_actor_id IF NOT EXISTS FOR (n:ThreatActor) REQUIRE n.stix_id IS UNIQUE',
        'CREATE CONSTRAINT campaign_id IF NOT EXISTS FOR (n:Campaign) REQUIRE n.stix_id IS UNIQUE',
        'CREATE CONSTRAINT intrusion_set_id IF NOT EXISTS FOR (n:IntrusionSet) REQUIRE n.stix_id IS UNIQUE',
        'CREATE CONSTRAINT malware_id IF NOT EXISTS FOR (n:Malware) REQUIRE n.stix_id IS UNIQUE',
        'CREATE CONSTRAINT tool_id IF NOT EXISTS FOR (n:Tool) REQUIRE n.stix_id IS UNIQUE',
        'CREATE CONSTRAINT attack_pattern_id IF NOT EXISTS FOR (n:AttackPattern) REQUIRE n.stix_id IS UNIQUE',
        'CREATE CONSTRAINT indicator_id IF NOT EXISTS FOR (n:Indicator) REQUIRE n.stix_id IS UNIQUE',
        'CREATE CONSTRAINT infrastructure_id IF NOT EXISTS FOR (n:Infrastructure) REQUIRE n.stix_id IS UNIQUE',
        'CREATE CONSTRAINT vulnerability_id IF NOT EXISTS FOR (n:Vulnerability) REQUIRE n.stix_id IS UNIQUE',
        'CREATE CONSTRAINT identity_id IF NOT EXISTS FOR (n:Identity) REQUIRE n.stix_id IS UNIQUE',
        'CREATE CONSTRAINT location_id IF NOT EXISTS FOR (n:Location) REQUIRE n.stix_id IS UNIQUE',
      ];

      for (const constraint of constraints) {
        try {
          await session.run(constraint);
        } catch (error) {
          // Ignore constraint already exists errors
          if (!(error as Error).message.includes('already exists')) {
            throw error;
          }
        }
      }

      // Create indexes for search optimization
      const indexes = [
        'CREATE INDEX stix_object_type IF NOT EXISTS FOR (n:StixObject) ON (n.type)',
        'CREATE INDEX stix_object_name IF NOT EXISTS FOR (n:StixObject) ON (n.name)',
        'CREATE INDEX stix_object_feed IF NOT EXISTS FOR (n:StixObject) ON (n.feed_id)',
        'CREATE INDEX stix_object_ingested IF NOT EXISTS FOR (n:StixObject) ON (n.ingested_at)',
        'CREATE FULLTEXT INDEX stix_fulltext IF NOT EXISTS FOR (n:StixObject) ON EACH [n.name, n.description]',
      ];

      for (const index of indexes) {
        try {
          await session.run(index);
        } catch (error) {
          if (!(error as Error).message.includes('already exists')) {
            throw error;
          }
        }
      }

      this.initialized = true;
      logger.info('Neo4jGraphStore initialized successfully');
    } finally {
      await session.close();
    }
  }

  /**
   * Store a STIX object as a graph node
   */
  async storeObject(object: StixObject, metadata: IngestionMetadata): Promise<void> {
    await this.ensureInitialized();

    const session = this.driver.session({ database: this.database });
    try {
      const labels = this.getLabelsForType(object.type);
      const properties = this.objectToProperties(object, metadata);

      await session.executeWrite(async (tx) => {
        await tx.run(
          `
          MERGE (n:StixObject {stix_id: $stixId})
          SET n += $properties
          SET n:${labels.join(':')}
          `,
          {
            stixId: object.id,
            properties,
          }
        );
      });

      logger.debug({ stixId: object.id, type: object.type }, 'Stored object in graph');
    } finally {
      await session.close();
    }
  }

  /**
   * Store a STIX relationship
   */
  async storeRelationship(relationship: Relationship, metadata: IngestionMetadata): Promise<void> {
    await this.ensureInitialized();

    const session = this.driver.session({ database: this.database });
    try {
      const relType = this.sanitizeRelationshipType(relationship.relationship_type);

      await session.executeWrite(async (tx) => {
        // Ensure source and target nodes exist (as minimal stubs if not already present)
        await tx.run(
          `
          MERGE (source:StixObject {stix_id: $sourceId})
          ON CREATE SET source.type = $sourceType, source.created_stub = true
          MERGE (target:StixObject {stix_id: $targetId})
          ON CREATE SET target.type = $targetType, target.created_stub = true
          `,
          {
            sourceId: relationship.source_ref,
            sourceType: relationship.source_ref.split('--')[0],
            targetId: relationship.target_ref,
            targetType: relationship.target_ref.split('--')[0],
          }
        );

        // Create the relationship
        await tx.run(
          `
          MATCH (source:StixObject {stix_id: $sourceId})
          MATCH (target:StixObject {stix_id: $targetId})
          MERGE (source)-[r:${relType} {stix_id: $relId}]->(target)
          SET r.relationship_type = $relationshipType,
              r.description = $description,
              r.confidence = $confidence,
              r.start_time = $startTime,
              r.stop_time = $stopTime,
              r.feed_id = $feedId,
              r.ingested_at = $ingestedAt
          `,
          {
            sourceId: relationship.source_ref,
            targetId: relationship.target_ref,
            relId: relationship.id,
            relationshipType: relationship.relationship_type,
            description: relationship.description || null,
            confidence: relationship.confidence || null,
            startTime: relationship.start_time || null,
            stopTime: relationship.stop_time || null,
            feedId: metadata.feedId,
            ingestedAt: metadata.ingestedAt,
          }
        );
      });

      logger.debug(
        { relId: relationship.id, type: relationship.relationship_type },
        'Stored relationship in graph'
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Store a sighting
   */
  async storeSighting(sighting: Sighting, metadata: IngestionMetadata): Promise<void> {
    await this.ensureInitialized();

    const session = this.driver.session({ database: this.database });
    try {
      await session.executeWrite(async (tx) => {
        // Create sighting relationship
        await tx.run(
          `
          MERGE (observed:StixObject {stix_id: $sightingOfRef})
          ON CREATE SET observed.type = $observedType, observed.created_stub = true
          WITH observed
          MERGE (sighting:Sighting:StixObject {stix_id: $sightingId})
          SET sighting.first_seen = $firstSeen,
              sighting.last_seen = $lastSeen,
              sighting.count = $count,
              sighting.description = $description,
              sighting.feed_id = $feedId,
              sighting.ingested_at = $ingestedAt
          MERGE (sighting)-[:SIGHTING_OF]->(observed)
          `,
          {
            sightingId: sighting.id,
            sightingOfRef: sighting.sighting_of_ref,
            observedType: sighting.sighting_of_ref.split('--')[0],
            firstSeen: sighting.first_seen || null,
            lastSeen: sighting.last_seen || null,
            count: sighting.count || 1,
            description: sighting.description || null,
            feedId: metadata.feedId,
            ingestedAt: metadata.ingestedAt,
          }
        );

        // Link to where sighted (locations/identities)
        if (sighting.where_sighted_refs) {
          for (const ref of sighting.where_sighted_refs) {
            await tx.run(
              `
              MATCH (sighting:Sighting {stix_id: $sightingId})
              MERGE (location:StixObject {stix_id: $locationRef})
              ON CREATE SET location.type = $locationType, location.created_stub = true
              MERGE (sighting)-[:SIGHTED_AT]->(location)
              `,
              {
                sightingId: sighting.id,
                locationRef: ref,
                locationType: ref.split('--')[0],
              }
            );
          }
        }
      });

      logger.debug({ sightingId: sighting.id }, 'Stored sighting in graph');
    } finally {
      await session.close();
    }
  }

  /**
   * Store a batch of STIX objects and relationships
   */
  async storeBatch(
    objects: Array<{ object: StixObject; metadata: IngestionMetadata }>
  ): Promise<{ stored: number; errors: Array<{ id: string; error: string }> }> {
    await this.ensureInitialized();

    const result = { stored: 0, errors: [] as Array<{ id: string; error: string }> };
    const session = this.driver.session({ database: this.database });

    try {
      await session.executeWrite(async (tx) => {
        for (const { object, metadata } of objects) {
          try {
            if (object.type === 'relationship') {
              await this.storeRelationshipInTx(tx, object as Relationship, metadata);
            } else if (object.type === 'sighting') {
              await this.storeSightingInTx(tx, object as Sighting, metadata);
            } else {
              await this.storeObjectInTx(tx, object, metadata);
            }
            result.stored++;
          } catch (error) {
            result.errors.push({
              id: object.id,
              error: (error as Error).message,
            });
          }
        }
      });
    } finally {
      await session.close();
    }

    logger.info(
      { stored: result.stored, errors: result.errors.length },
      'Batch store to graph completed'
    );

    return result;
  }

  /**
   * Get a threat actor with all related entities
   */
  async getThreatActorGraph(actorId: StixId): Promise<ThreatActorGraph | null> {
    await this.ensureInitialized();

    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.run(
        `
        MATCH (actor:ThreatActor {stix_id: $actorId})
        OPTIONAL MATCH (actor)-[:ATTRIBUTED_TO|USES|TARGETS|EXPLOITS|INDICATES|LOCATED_AT|COMPROMISES*1..2]-(related)
        RETURN actor,
               collect(DISTINCT related) as related,
               [(actor)-[r]-() | {type: type(r), source: startNode(r).stix_id, target: endNode(r).stix_id}] as rels
        `,
        { actorId }
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const actorNode = record.get('actor').properties as unknown as ThreatActor;
      const relatedNodes = record.get('related') as Node[];
      const relationships = record.get('rels') as Array<{
        type: string;
        source: StixId;
        target: StixId;
      }>;

      const graph: ThreatActorGraph = {
        actor: actorNode,
        campaigns: [],
        malware: [],
        tools: [],
        attackPatterns: [],
        targets: [],
        infrastructure: [],
        relationships: relationships.map((r, i) => ({
          id: `rel-${i}`,
          type: r.type,
          sourceId: r.source,
          targetId: r.target,
          properties: {},
        })),
      };

      for (const node of relatedNodes) {
        const props = node.properties as { type: string; name?: string; stix_id: StixId };
        switch (props.type) {
          case 'campaign':
            graph.campaigns.push(props as unknown as Campaign);
            break;
          case 'malware':
            graph.malware.push(props as unknown as Malware);
            break;
          case 'tool':
            graph.tools.push(props as unknown as Tool);
            break;
          case 'attack-pattern':
            graph.attackPatterns.push(props as unknown as AttackPattern);
            break;
          case 'infrastructure':
            graph.infrastructure.push(props as unknown as Infrastructure);
            break;
          case 'identity':
          case 'location':
            graph.targets.push({
              type: props.type,
              name: props.name || 'Unknown',
              id: props.stix_id,
            });
            break;
        }
      }

      return graph;
    } finally {
      await session.close();
    }
  }

  /**
   * Find paths between two entities
   */
  async findPaths(
    sourceId: StixId,
    targetId: StixId,
    maxHops = 4
  ): Promise<PathResult[]> {
    await this.ensureInitialized();

    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.run(
        `
        MATCH path = shortestPath(
          (source:StixObject {stix_id: $sourceId})-[*1..${maxHops}]-(target:StixObject {stix_id: $targetId})
        )
        RETURN path
        LIMIT 10
        `,
        { sourceId, targetId }
      );

      return result.records.map((record) => {
        const path = record.get('path') as Path;
        return {
          nodes: path.segments.flatMap((seg: PathSegment) => [
            this.nodeToGraphNode(seg.start),
            this.nodeToGraphNode(seg.end),
          ]).filter((n: GraphNode, i: number, arr: GraphNode[]) => arr.findIndex((x: GraphNode) => x.id === n.id) === i),
          relationships: path.segments.map((seg: PathSegment) =>
            this.relationshipToGraphRel(seg.relationship)
          ),
          length: path.length,
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Search for related entities
   */
  async searchRelated(
    startId: StixId,
    relationshipTypes?: string[],
    targetTypes?: string[],
    maxDepth = 2
  ): Promise<GraphNode[]> {
    await this.ensureInitialized();

    const session = this.driver.session({ database: this.database });
    try {
      let relFilter = '';
      if (relationshipTypes && relationshipTypes.length > 0) {
        const sanitized = relationshipTypes.map((t) => this.sanitizeRelationshipType(t));
        relFilter = `:${sanitized.join('|')}`;
      }

      let typeFilter = '';
      if (targetTypes && targetTypes.length > 0) {
        typeFilter = `AND related.type IN $targetTypes`;
      }

      const result = await session.run(
        `
        MATCH (start:StixObject {stix_id: $startId})-[${relFilter}*1..${maxDepth}]-(related:StixObject)
        WHERE related.stix_id <> $startId ${typeFilter}
        RETURN DISTINCT related
        LIMIT 100
        `,
        { startId, targetTypes }
      );

      return result.records.map((record) =>
        this.nodeToGraphNode(record.get('related') as Node)
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Get graph statistics
   */
  async getStats(): Promise<{
    totalNodes: number;
    totalRelationships: number;
    nodesByType: Record<string, number>;
    relationshipsByType: Record<string, number>;
  }> {
    await this.ensureInitialized();

    const session = this.driver.session({ database: this.database });
    try {
      const [nodesResult, relsResult, nodeTypesResult, relTypesResult] = await Promise.all([
        session.run('MATCH (n:StixObject) RETURN count(n) as count'),
        session.run('MATCH ()-[r]->() RETURN count(r) as count'),
        session.run('MATCH (n:StixObject) RETURN n.type as type, count(n) as count'),
        session.run('MATCH ()-[r]->() RETURN type(r) as type, count(r) as count'),
      ]);

      return {
        totalNodes: (nodesResult.records[0]?.get('count') as Integer)?.toNumber() || 0,
        totalRelationships: (relsResult.records[0]?.get('count') as Integer)?.toNumber() || 0,
        nodesByType: Object.fromEntries(
          nodeTypesResult.records.map((r) => [
            r.get('type') as string,
            (r.get('count') as Integer).toNumber(),
          ])
        ),
        relationshipsByType: Object.fromEntries(
          relTypesResult.records.map((r) => [
            r.get('type') as string,
            (r.get('count') as Integer).toNumber(),
          ])
        ),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Delete objects by feed
   */
  async deleteByFeed(feedId: string): Promise<number> {
    await this.ensureInitialized();

    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.executeWrite(async (tx) => {
        const deleteResult = await tx.run(
          `
          MATCH (n:StixObject {feed_id: $feedId})
          DETACH DELETE n
          RETURN count(n) as deleted
          `,
          { feedId }
        );
        return (deleteResult.records[0]?.get('deleted') as Integer)?.toNumber() || 0;
      });

      return result;
    } finally {
      await session.close();
    }
  }

  /**
   * Close the driver connection
   */
  async close(): Promise<void> {
    await this.driver.close();
    logger.info('Neo4jGraphStore connection closed');
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private getLabelsForType(type: string): string[] {
    const labels = ['StixObject'];
    const labelMap: Record<string, string> = {
      'threat-actor': 'ThreatActor',
      'campaign': 'Campaign',
      'intrusion-set': 'IntrusionSet',
      'malware': 'Malware',
      'tool': 'Tool',
      'attack-pattern': 'AttackPattern',
      'indicator': 'Indicator',
      'infrastructure': 'Infrastructure',
      'vulnerability': 'Vulnerability',
      'identity': 'Identity',
      'location': 'Location',
      'course-of-action': 'CourseOfAction',
      'report': 'Report',
      'note': 'Note',
      'opinion': 'Opinion',
      'observed-data': 'ObservedData',
      'grouping': 'Grouping',
    };

    if (labelMap[type]) {
      labels.push(labelMap[type]);
    }

    return labels;
  }

  private sanitizeRelationshipType(type: string): string {
    return type.toUpperCase().replace(/-/g, '_');
  }

  private objectToProperties(
    object: StixObject,
    metadata: IngestionMetadata
  ): Record<string, unknown> {
    const base = {
      stix_id: object.id,
      type: object.type,
      created: (object as { created?: string }).created,
      modified: (object as { modified?: string }).modified,
      confidence: (object as { confidence?: number }).confidence,
      labels: (object as { labels?: string[] }).labels,
      feed_id: metadata.feedId,
      feed_name: metadata.feedName,
      ingested_at: metadata.ingestedAt,
    };

    // Add type-specific properties
    const specific: Record<string, unknown> = {};
    const obj = object as unknown as Record<string, unknown>;

    if ('name' in obj) specific.name = obj.name;
    if ('description' in obj) specific.description = obj.description;
    if ('aliases' in obj) specific.aliases = obj.aliases;
    if ('first_seen' in obj) specific.first_seen = obj.first_seen;
    if ('last_seen' in obj) specific.last_seen = obj.last_seen;
    if ('pattern' in obj) specific.pattern = obj.pattern;
    if ('pattern_type' in obj) specific.pattern_type = obj.pattern_type;
    if ('valid_from' in obj) specific.valid_from = obj.valid_from;
    if ('valid_until' in obj) specific.valid_until = obj.valid_until;
    if ('sophistication' in obj) specific.sophistication = obj.sophistication;
    if ('resource_level' in obj) specific.resource_level = obj.resource_level;
    if ('primary_motivation' in obj) specific.primary_motivation = obj.primary_motivation;
    if ('goals' in obj) specific.goals = obj.goals;
    if ('is_family' in obj) specific.is_family = obj.is_family;
    if ('malware_types' in obj) specific.malware_types = obj.malware_types;
    if ('tool_types' in obj) specific.tool_types = obj.tool_types;

    return { ...base, ...specific };
  }

  private async storeObjectInTx(
    tx: Transaction,
    object: StixObject,
    metadata: IngestionMetadata
  ): Promise<void> {
    const labels = this.getLabelsForType(object.type);
    const properties = this.objectToProperties(object, metadata);

    await tx.run(
      `
      MERGE (n:StixObject {stix_id: $stixId})
      SET n += $properties, n.created_stub = null
      SET n:${labels.join(':')}
      `,
      {
        stixId: object.id,
        properties,
      }
    );
  }

  private async storeRelationshipInTx(
    tx: Transaction,
    relationship: Relationship,
    metadata: IngestionMetadata
  ): Promise<void> {
    const relType = this.sanitizeRelationshipType(relationship.relationship_type);

    await tx.run(
      `
      MERGE (source:StixObject {stix_id: $sourceId})
      ON CREATE SET source.type = $sourceType, source.created_stub = true
      MERGE (target:StixObject {stix_id: $targetId})
      ON CREATE SET target.type = $targetType, target.created_stub = true
      MERGE (source)-[r:${relType} {stix_id: $relId}]->(target)
      SET r.relationship_type = $relationshipType,
          r.description = $description,
          r.confidence = $confidence,
          r.feed_id = $feedId,
          r.ingested_at = $ingestedAt
      `,
      {
        sourceId: relationship.source_ref,
        sourceType: relationship.source_ref.split('--')[0],
        targetId: relationship.target_ref,
        targetType: relationship.target_ref.split('--')[0],
        relId: relationship.id,
        relationshipType: relationship.relationship_type,
        description: relationship.description || null,
        confidence: relationship.confidence || null,
        feedId: metadata.feedId,
        ingestedAt: metadata.ingestedAt,
      }
    );
  }

  private async storeSightingInTx(
    tx: Transaction,
    sighting: Sighting,
    metadata: IngestionMetadata
  ): Promise<void> {
    await tx.run(
      `
      MERGE (observed:StixObject {stix_id: $sightingOfRef})
      ON CREATE SET observed.type = $observedType, observed.created_stub = true
      MERGE (s:Sighting:StixObject {stix_id: $sightingId})
      SET s.first_seen = $firstSeen,
          s.last_seen = $lastSeen,
          s.count = $count,
          s.feed_id = $feedId,
          s.ingested_at = $ingestedAt
      MERGE (s)-[:SIGHTING_OF]->(observed)
      `,
      {
        sightingId: sighting.id,
        sightingOfRef: sighting.sighting_of_ref,
        observedType: sighting.sighting_of_ref.split('--')[0],
        firstSeen: sighting.first_seen || null,
        lastSeen: sighting.last_seen || null,
        count: sighting.count || 1,
        feedId: metadata.feedId,
        ingestedAt: metadata.ingestedAt,
      }
    );
  }

  private nodeToGraphNode(node: Node): GraphNode {
    const props = node.properties as Record<string, unknown>;
    return {
      id: props.stix_id as StixId,
      type: props.type as string,
      name: props.name as string | undefined,
      labels: node.labels,
      properties: props,
    };
  }

  private relationshipToGraphRel(rel: Neo4jRelationship): GraphRelationship {
    const props = rel.properties as Record<string, unknown>;
    return {
      id: props.stix_id as string || `rel-${rel.identity.toString()}`,
      type: rel.type,
      sourceId: (rel as unknown as { start: { properties: { stix_id: StixId } } }).start?.properties?.stix_id || '' as StixId,
      targetId: (rel as unknown as { end: { properties: { stix_id: StixId } } }).end?.properties?.stix_id || '' as StixId,
      properties: props,
    };
  }
}

/**
 * Factory function to create Neo4jGraphStore
 */
export function createNeo4jGraphStore(config?: Neo4jGraphStoreConfig): Neo4jGraphStore {
  return new Neo4jGraphStore(config);
}
