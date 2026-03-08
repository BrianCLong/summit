"use strict";
/**
 * Neo4j Graph Storage for Threat Intelligence
 * Stores STIX objects and relationships for graph-based analysis
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jGraphStore = void 0;
exports.createNeo4jGraphStore = createNeo4jGraphStore;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'neo4j-graph-store' });
class Neo4jGraphStore {
    driver;
    database;
    initialized = false;
    constructor(config = {}) {
        const uri = config.uri || process.env.NEO4J_URI || 'bolt://localhost:7687';
        const username = config.username || process.env.NEO4J_USER || 'neo4j';
        const password = config.password || process.env.NEO4J_PASSWORD || 'devpassword';
        this.database = config.database || process.env.NEO4J_DATABASE || 'neo4j';
        this.driver = neo4j_driver_1.default.driver(uri, neo4j_driver_1.default.auth.basic(username, password), {
            maxConnectionPoolSize: config.maxConnectionPoolSize || 50,
            connectionTimeout: 5000,
        });
    }
    /**
     * Initialize database schema and constraints
     */
    async initialize() {
        if (this.initialized)
            return;
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
                }
                catch (error) {
                    // Ignore constraint already exists errors
                    if (!error.message.includes('already exists')) {
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
                }
                catch (error) {
                    if (!error.message.includes('already exists')) {
                        throw error;
                    }
                }
            }
            this.initialized = true;
            logger.info('Neo4jGraphStore initialized successfully');
        }
        finally {
            await session.close();
        }
    }
    /**
     * Store a STIX object as a graph node
     */
    async storeObject(object, metadata) {
        await this.ensureInitialized();
        const session = this.driver.session({ database: this.database });
        try {
            const labels = this.getLabelsForType(object.type);
            const properties = this.objectToProperties(object, metadata);
            await session.executeWrite(async (tx) => {
                await tx.run(`
          MERGE (n:StixObject {stix_id: $stixId})
          SET n += $properties
          SET n:${labels.join(':')}
          `, {
                    stixId: object.id,
                    properties,
                });
            });
            logger.debug({ stixId: object.id, type: object.type }, 'Stored object in graph');
        }
        finally {
            await session.close();
        }
    }
    /**
     * Store a STIX relationship
     */
    async storeRelationship(relationship, metadata) {
        await this.ensureInitialized();
        const session = this.driver.session({ database: this.database });
        try {
            const relType = this.sanitizeRelationshipType(relationship.relationship_type);
            await session.executeWrite(async (tx) => {
                // Ensure source and target nodes exist (as minimal stubs if not already present)
                await tx.run(`
          MERGE (source:StixObject {stix_id: $sourceId})
          ON CREATE SET source.type = $sourceType, source.created_stub = true
          MERGE (target:StixObject {stix_id: $targetId})
          ON CREATE SET target.type = $targetType, target.created_stub = true
          `, {
                    sourceId: relationship.source_ref,
                    sourceType: relationship.source_ref.split('--')[0],
                    targetId: relationship.target_ref,
                    targetType: relationship.target_ref.split('--')[0],
                });
                // Create the relationship
                await tx.run(`
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
          `, {
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
                });
            });
            logger.debug({ relId: relationship.id, type: relationship.relationship_type }, 'Stored relationship in graph');
        }
        finally {
            await session.close();
        }
    }
    /**
     * Store a sighting
     */
    async storeSighting(sighting, metadata) {
        await this.ensureInitialized();
        const session = this.driver.session({ database: this.database });
        try {
            await session.executeWrite(async (tx) => {
                // Create sighting relationship
                await tx.run(`
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
          `, {
                    sightingId: sighting.id,
                    sightingOfRef: sighting.sighting_of_ref,
                    observedType: sighting.sighting_of_ref.split('--')[0],
                    firstSeen: sighting.first_seen || null,
                    lastSeen: sighting.last_seen || null,
                    count: sighting.count || 1,
                    description: sighting.description || null,
                    feedId: metadata.feedId,
                    ingestedAt: metadata.ingestedAt,
                });
                // Link to where sighted (locations/identities)
                if (sighting.where_sighted_refs) {
                    for (const ref of sighting.where_sighted_refs) {
                        await tx.run(`
              MATCH (sighting:Sighting {stix_id: $sightingId})
              MERGE (location:StixObject {stix_id: $locationRef})
              ON CREATE SET location.type = $locationType, location.created_stub = true
              MERGE (sighting)-[:SIGHTED_AT]->(location)
              `, {
                            sightingId: sighting.id,
                            locationRef: ref,
                            locationType: ref.split('--')[0],
                        });
                    }
                }
            });
            logger.debug({ sightingId: sighting.id }, 'Stored sighting in graph');
        }
        finally {
            await session.close();
        }
    }
    /**
     * Store a batch of STIX objects and relationships
     */
    async storeBatch(objects) {
        await this.ensureInitialized();
        const result = { stored: 0, errors: [] };
        const session = this.driver.session({ database: this.database });
        try {
            await session.executeWrite(async (tx) => {
                for (const { object, metadata } of objects) {
                    try {
                        if (object.type === 'relationship') {
                            await this.storeRelationshipInTx(tx, object, metadata);
                        }
                        else if (object.type === 'sighting') {
                            await this.storeSightingInTx(tx, object, metadata);
                        }
                        else {
                            await this.storeObjectInTx(tx, object, metadata);
                        }
                        result.stored++;
                    }
                    catch (error) {
                        result.errors.push({
                            id: object.id,
                            error: error.message,
                        });
                    }
                }
            });
        }
        finally {
            await session.close();
        }
        logger.info({ stored: result.stored, errors: result.errors.length }, 'Batch store to graph completed');
        return result;
    }
    /**
     * Get a threat actor with all related entities
     */
    async getThreatActorGraph(actorId) {
        await this.ensureInitialized();
        const session = this.driver.session({ database: this.database });
        try {
            const result = await session.run(`
        MATCH (actor:ThreatActor {stix_id: $actorId})
        OPTIONAL MATCH (actor)-[:ATTRIBUTED_TO|USES|TARGETS|EXPLOITS|INDICATES|LOCATED_AT|COMPROMISES*1..2]-(related)
        RETURN actor,
               collect(DISTINCT related) as related,
               [(actor)-[r]-() | {type: type(r), source: startNode(r).stix_id, target: endNode(r).stix_id}] as rels
        `, { actorId });
            if (result.records.length === 0) {
                return null;
            }
            const record = result.records[0];
            const actorNode = record.get('actor').properties;
            const relatedNodes = record.get('related');
            const relationships = record.get('rels');
            const graph = {
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
                const props = node.properties;
                switch (props.type) {
                    case 'campaign':
                        graph.campaigns.push(props);
                        break;
                    case 'malware':
                        graph.malware.push(props);
                        break;
                    case 'tool':
                        graph.tools.push(props);
                        break;
                    case 'attack-pattern':
                        graph.attackPatterns.push(props);
                        break;
                    case 'infrastructure':
                        graph.infrastructure.push(props);
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
        }
        finally {
            await session.close();
        }
    }
    /**
     * Find paths between two entities
     */
    async findPaths(sourceId, targetId, maxHops = 4) {
        await this.ensureInitialized();
        const session = this.driver.session({ database: this.database });
        try {
            const result = await session.run(`
        MATCH path = shortestPath(
          (source:StixObject {stix_id: $sourceId})-[*1..${maxHops}]-(target:StixObject {stix_id: $targetId})
        )
        RETURN path
        LIMIT 10
        `, { sourceId, targetId });
            return result.records.map((record) => {
                const path = record.get('path');
                return {
                    nodes: path.segments.flatMap((seg) => [
                        this.nodeToGraphNode(seg.start),
                        this.nodeToGraphNode(seg.end),
                    ]).filter((n, i, arr) => arr.findIndex((x) => x.id === n.id) === i),
                    relationships: path.segments.map((seg) => this.relationshipToGraphRel(seg.relationship)),
                    length: path.length,
                };
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Search for related entities
     */
    async searchRelated(startId, relationshipTypes, targetTypes, maxDepth = 2) {
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
            const result = await session.run(`
        MATCH (start:StixObject {stix_id: $startId})-[${relFilter}*1..${maxDepth}]-(related:StixObject)
        WHERE related.stix_id <> $startId ${typeFilter}
        RETURN DISTINCT related
        LIMIT 100
        `, { startId, targetTypes });
            return result.records.map((record) => this.nodeToGraphNode(record.get('related')));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get graph statistics
     */
    async getStats() {
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
                totalNodes: nodesResult.records[0]?.get('count')?.toNumber() || 0,
                totalRelationships: relsResult.records[0]?.get('count')?.toNumber() || 0,
                nodesByType: Object.fromEntries(nodeTypesResult.records.map((r) => [
                    r.get('type'),
                    r.get('count').toNumber(),
                ])),
                relationshipsByType: Object.fromEntries(relTypesResult.records.map((r) => [
                    r.get('type'),
                    r.get('count').toNumber(),
                ])),
            };
        }
        finally {
            await session.close();
        }
    }
    /**
     * Delete objects by feed
     */
    async deleteByFeed(feedId) {
        await this.ensureInitialized();
        const session = this.driver.session({ database: this.database });
        try {
            const result = await session.executeWrite(async (tx) => {
                const deleteResult = await tx.run(`
          MATCH (n:StixObject {feed_id: $feedId})
          DETACH DELETE n
          RETURN count(n) as deleted
          `, { feedId });
                return deleteResult.records[0]?.get('deleted')?.toNumber() || 0;
            });
            return result;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Close the driver connection
     */
    async close() {
        await this.driver.close();
        logger.info('Neo4jGraphStore connection closed');
    }
    // =========================================================================
    // Private Helpers
    // =========================================================================
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }
    getLabelsForType(type) {
        const labels = ['StixObject'];
        const labelMap = {
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
    sanitizeRelationshipType(type) {
        return type.toUpperCase().replace(/-/g, '_');
    }
    objectToProperties(object, metadata) {
        const base = {
            stix_id: object.id,
            type: object.type,
            created: object.created,
            modified: object.modified,
            confidence: object.confidence,
            labels: object.labels,
            feed_id: metadata.feedId,
            feed_name: metadata.feedName,
            ingested_at: metadata.ingestedAt,
        };
        // Add type-specific properties
        const specific = {};
        const obj = object;
        if ('name' in obj)
            specific.name = obj.name;
        if ('description' in obj)
            specific.description = obj.description;
        if ('aliases' in obj)
            specific.aliases = obj.aliases;
        if ('first_seen' in obj)
            specific.first_seen = obj.first_seen;
        if ('last_seen' in obj)
            specific.last_seen = obj.last_seen;
        if ('pattern' in obj)
            specific.pattern = obj.pattern;
        if ('pattern_type' in obj)
            specific.pattern_type = obj.pattern_type;
        if ('valid_from' in obj)
            specific.valid_from = obj.valid_from;
        if ('valid_until' in obj)
            specific.valid_until = obj.valid_until;
        if ('sophistication' in obj)
            specific.sophistication = obj.sophistication;
        if ('resource_level' in obj)
            specific.resource_level = obj.resource_level;
        if ('primary_motivation' in obj)
            specific.primary_motivation = obj.primary_motivation;
        if ('goals' in obj)
            specific.goals = obj.goals;
        if ('is_family' in obj)
            specific.is_family = obj.is_family;
        if ('malware_types' in obj)
            specific.malware_types = obj.malware_types;
        if ('tool_types' in obj)
            specific.tool_types = obj.tool_types;
        return { ...base, ...specific };
    }
    async storeObjectInTx(tx, object, metadata) {
        const labels = this.getLabelsForType(object.type);
        const properties = this.objectToProperties(object, metadata);
        await tx.run(`
      MERGE (n:StixObject {stix_id: $stixId})
      SET n += $properties, n.created_stub = null
      SET n:${labels.join(':')}
      `, {
            stixId: object.id,
            properties,
        });
    }
    async storeRelationshipInTx(tx, relationship, metadata) {
        const relType = this.sanitizeRelationshipType(relationship.relationship_type);
        await tx.run(`
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
      `, {
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
        });
    }
    async storeSightingInTx(tx, sighting, metadata) {
        await tx.run(`
      MERGE (observed:StixObject {stix_id: $sightingOfRef})
      ON CREATE SET observed.type = $observedType, observed.created_stub = true
      MERGE (s:Sighting:StixObject {stix_id: $sightingId})
      SET s.first_seen = $firstSeen,
          s.last_seen = $lastSeen,
          s.count = $count,
          s.feed_id = $feedId,
          s.ingested_at = $ingestedAt
      MERGE (s)-[:SIGHTING_OF]->(observed)
      `, {
            sightingId: sighting.id,
            sightingOfRef: sighting.sighting_of_ref,
            observedType: sighting.sighting_of_ref.split('--')[0],
            firstSeen: sighting.first_seen || null,
            lastSeen: sighting.last_seen || null,
            count: sighting.count || 1,
            feedId: metadata.feedId,
            ingestedAt: metadata.ingestedAt,
        });
    }
    nodeToGraphNode(node) {
        const props = node.properties;
        return {
            id: props.stix_id,
            type: props.type,
            name: props.name,
            labels: node.labels,
            properties: props,
        };
    }
    relationshipToGraphRel(rel) {
        const props = rel.properties;
        return {
            id: props.stix_id || `rel-${rel.identity.toString()}`,
            type: rel.type,
            sourceId: rel.start?.properties?.stix_id || '',
            targetId: rel.end?.properties?.stix_id || '',
            properties: props,
        };
    }
}
exports.Neo4jGraphStore = Neo4jGraphStore;
/**
 * Factory function to create Neo4jGraphStore
 */
function createNeo4jGraphStore(config) {
    return new Neo4jGraphStore(config);
}
