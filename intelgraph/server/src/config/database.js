// ===================================
// server/src/config/database.js - Database Configuration
// ===================================
const neo4j = require('neo4j-driver');
const { Pool } = require('pg');
const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

let neo4jDriver;
let postgresPool;
let redisClient;

// Neo4j Connection
async function connectNeo4j() {
  try {
    neo4jDriver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.username, config.neo4j.password),
    );

    // Test connection
    const session = neo4jDriver.session();
    await session.run('RETURN 1');
    await session.close();

    // Create constraints and indexes
    await createNeo4jConstraints();

    logger.info('✅ Connected to Neo4j');
    return neo4jDriver;
  } catch (error) {
    logger.error('❌ Failed to connect to Neo4j:', error);
    throw error;
  }
}

async function createNeo4jConstraints() {
  const session = neo4jDriver.session();

  try {
    const constraints = [
      // Entity constraints
      'CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE',
      'CREATE CONSTRAINT entity_uuid IF NOT EXISTS FOR (e:Entity) REQUIRE e.uuid IS UNIQUE',

      // User constraints
      'CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE',
      'CREATE CONSTRAINT user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE',

      // Investigation constraints
      'CREATE CONSTRAINT investigation_id IF NOT EXISTS FOR (i:Investigation) REQUIRE i.id IS UNIQUE',

      // Relationship constraints
      'CREATE CONSTRAINT relationship_id IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() REQUIRE r.id IS UNIQUE',
    ];

    for (const constraint of constraints) {
      try {
        await session.run(constraint);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          logger.warn(
            'Failed to create constraint:',
            constraint,
            error.message,
          );
        }
      }
    }

    // Create indexes for performance
    const indexes = [
      'CREATE INDEX entity_type IF NOT EXISTS FOR (e:Entity) ON (e.type)',
      'CREATE INDEX entity_label IF NOT EXISTS FOR (e:Entity) ON (e.label)',
      'CREATE INDEX entity_created IF NOT EXISTS FOR (e:Entity) ON (e.createdAt)',
      'CREATE INDEX investigation_status IF NOT EXISTS FOR (i:Investigation) ON (i.status)',
      'CREATE INDEX user_username IF NOT EXISTS FOR (u:User) ON (u.username)',
      'CREATE FULLTEXT INDEX entity_search IF NOT EXISTS FOR (e:Entity) ON EACH [e.label, e.description]',
      'CREATE FULLTEXT INDEX investigation_search IF NOT EXISTS FOR (i:Investigation) ON EACH [i.title, i.description]',
    ];

    for (const index of indexes) {
      try {
        await session.run(index);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          logger.warn('Failed to create index:', index, error.message);
        }
      }
    }

    logger.info('Neo4j constraints and indexes created');
  } catch (error) {
    logger.error('Failed to create Neo4j constraints:', error);
  } finally {
    await session.close();
  }
}

// PostgreSQL Connection
async function connectPostgres() {
  try {
    postgresPool = new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.username,
      password: config.postgres.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    const client = await postgresPool.connect();
    await client.query('SELECT NOW()');
    client.release();

    // Create tables
    await createPostgresTables();

    logger.info('✅ Connected to PostgreSQL');
    return postgresPool;
  } catch (error) {
    logger.error('❌ Failed to connect to PostgreSQL:', error);
    throw error;
  }
}

async function createPostgresTables() {
  const client = await postgresPool.connect();

  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'ANALYST',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Audit logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id VARCHAR(255),
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sessions table for JWT refresh tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        refresh_token VARCHAR(500) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Analysis results table for AI features
    await client.query(`
      CREATE TABLE IF NOT EXISTS analysis_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investigation_id VARCHAR(255) NOT NULL,
        analysis_type VARCHAR(100) NOT NULL,
        algorithm VARCHAR(100) NOT NULL,
        results JSONB NOT NULL,
        confidence_score DECIMAL(3,2),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_analysis_investigation ON analysis_results(investigation_id)',
    );

    logger.info('PostgreSQL tables created');
  } catch (error) {
    logger.error('Failed to create PostgreSQL tables:', error);
  } finally {
    client.release();
  }
}

// Redis Connection
async function connectRedis() {
  try {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    redisClient.on('error', (error) => {
      logger.error('Redis error:', error);
    });

    // Test connection
    await redisClient.ping();

    logger.info('✅ Connected to Redis');
    return redisClient;
  } catch (error) {
    logger.error('❌ Failed to connect to Redis:', error);
    throw error;
  }
}

// Getters
function getNeo4jDriver() {
  if (!neo4jDriver) throw new Error('Neo4j driver not initialized');
  return neo4jDriver;
}

function getPostgresPool() {
  if (!postgresPool) throw new Error('PostgreSQL pool not initialized');
  return postgresPool;
}

function getRedisClient() {
  if (!redisClient) throw new Error('Redis client not initialized');
  return redisClient;
}

// Cleanup
async function closeConnections() {
  if (neo4jDriver) {
    await neo4jDriver.close();
    logger.info('Neo4j connection closed');
  }
  if (postgresPool) {
    await postgresPool.end();
    logger.info('PostgreSQL connection closed');
  }
  if (redisClient) {
    redisClient.disconnect();
    logger.info('Redis connection closed');
  }
}

module.exports = {
  connectNeo4j,
  connectPostgres,
  connectRedis,
  getNeo4jDriver,
  getPostgresPool,
  getRedisClient,
  closeConnections,
};

// ===================================
// server/src/graphql/schema.js - Complete GraphQL Schema
// ===================================
const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar DateTime
  scalar JSON

  # Enums
  enum Role {
    ADMIN
    ANALYST
    VIEWER
  }

  enum EntityType {
    PERSON
    ORGANIZATION
    LOCATION
    DOCUMENT
    PHONE
    EMAIL
    IP_ADDRESS
    URL
    EVENT
    VEHICLE
    ACCOUNT
    DEVICE
    CUSTOM
  }

  enum RelationshipType {
    KNOWS
    WORKS_FOR
    LOCATED_AT
    COMMUNICATES_WITH
    ASSOCIATED_WITH
    OWNS
    MEMBER_OF
    RELATED_TO
    TRANSACTED_WITH
    CONNECTED_TO
    CUSTOM
  }

  enum InvestigationStatus {
    DRAFT
    ACTIVE
    PENDING
    COMPLETED
    ARCHIVED
  }

  enum InvestigationPriority {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  # Core Types
  type User {
    id: ID!
    email: String!
    username: String!
    firstName: String!
    lastName: String!
    fullName: String!
    role: Role!
    isActive: Boolean!
    lastLogin: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Investigation {
    id: ID!
    title: String!
    description: String
    status: InvestigationStatus!
    priority: InvestigationPriority!
    tags: [String!]!
    metadata: JSON
    createdBy: User!
    assignedTo: [User!]!
    entities: [Entity!]!
    relationships: [Relationship!]!
    entityCount: Int!
    relationshipCount: Int!
    analysisResults: [AnalysisResult!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Entity {
    id: ID!
    uuid: String!
    type: EntityType!
    label: String!
    description: String
    properties: JSON!
    confidence: Float
    source: String
    verified: Boolean!
    position: Position
    investigations: [Investigation!]!
    relationships: [Relationship!]!
    incomingRelationships: [Relationship!]!
    outgoingRelationships: [Relationship!]!
    relatedEntities: [Entity!]!
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Relationship {
    id: ID!
    uuid: String!
    type: RelationshipType!
    label: String!
    description: String
    properties: JSON!
    weight: Float
    confidence: Float
    source: String
    verified: Boolean!
    sourceEntity: Entity!
    targetEntity: Entity!
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Position {
    x: Float!
    y: Float!
  }

  type AnalysisResult {
    id: ID!
    investigationId: String!
    analysisType: String!
    algorithm: String!
    results: JSON!
    confidenceScore: Float
    createdBy: User!
    createdAt: DateTime!
  }

  # Graph Analysis Types
  type GraphMetrics {
    nodeCount: Int!
    edgeCount: Int!
    density: Float!
    averageDegree: Float!
    clusters: [Cluster!]!
    centralityScores: [CentralityScore!]!
  }

  type Cluster {
    id: String!
    entities: [Entity!]!
    size: Int!
    cohesion: Float!
  }

  type CentralityScore {
    entityId: String!
    betweenness: Float!
    closeness: Float!
    degree: Int!
    pagerank: Float!
  }

  type LinkPrediction {
    sourceEntityId: String!
    targetEntityId: String!
    predictedRelationshipType: RelationshipType!
    confidence: Float!
    reasoning: String!
  }

  type AnomalyDetection {
    entityId: String!
    anomalyType: String!
    severity: Float!
    description: String!
    evidence: [String!]!
  }

  # Input Types
  input CreateUserInput {
    email: String!
    username: String!
    firstName: String!
    lastName: String!
    password: String!
    role: Role = ANALYST
  }

  input UpdateUserInput {
    email: String
    username: String
    firstName: String
    lastName: String
    role: Role
    isActive: Boolean
  }

  input CreateInvestigationInput {
    title: String!
    description: String
    priority: InvestigationPriority = MEDIUM
    assignedTo: [ID!] = []
    tags: [String!] = []
    metadata: JSON
  }

  input UpdateInvestigationInput {
    title: String
    description: String
    status: InvestigationStatus
    priority: InvestigationPriority
    assignedTo: [ID!]
    tags: [String!]
    metadata: JSON
  }

  input CreateEntityInput {
    type: EntityType!
    label: String!
    description: String
    properties: JSON!
    confidence: Float
    source: String
    investigationId: ID!
    position: PositionInput
  }

  input UpdateEntityInput {
    type: EntityType
    label: String
    description: String
    properties: JSON
    confidence: Float
    source: String
    verified: Boolean
    position: PositionInput
  }

  input CreateRelationshipInput {
    type: RelationshipType!
    label: String!
    description: String
    properties: JSON
    weight: Float
    confidence: Float
    source: String
    sourceEntityId: ID!
    targetEntityId: ID!
  }

  input UpdateRelationshipInput {
    type: RelationshipType
    label: String
    description: String
    properties: JSON
    weight: Float
    confidence: Float
    source: String
    verified: Boolean
  }

  input PositionInput {
    x: Float!
    y: Float!
  }

  input EntityFilterInput {
    types: [EntityType!]
    verified: Boolean
    investigationId: ID
    createdAfter: DateTime
    createdBefore: DateTime
  }

  input GraphAnalysisInput {
    investigationId: ID!
    algorithms: [String!]!
    includeMetrics: Boolean = true
    includeClusters: Boolean = true
    includeCentrality: Boolean = true
  }

  # Auth Types
  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
    expiresIn: Int!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input RegisterInput {
    email: String!
    username: String!
    firstName: String!
    lastName: String!
    password: String!
  }

  # Search Types
  type SearchResults {
    entities: [Entity!]!
    investigations: [Investigation!]!
    totalCount: Int!
  }

  # Graph Data for Visualization
  type GraphData {
    nodes: [GraphNode!]!
    edges: [GraphEdge!]!
    metadata: GraphMetadata!
  }

  type GraphNode {
    id: ID!
    label: String!
    type: EntityType!
    properties: JSON!
    position: Position
    size: Float
    color: String
    verified: Boolean!
  }

  type GraphEdge {
    id: ID!
    source: ID!
    target: ID!
    label: String!
    type: RelationshipType!
    properties: JSON!
    weight: Float
    verified: Boolean!
  }

  type GraphMetadata {
    nodeCount: Int!
    edgeCount: Int!
    lastUpdated: DateTime!
  }

  # Queries
  type Query {
    # Authentication
    me: User

    # Users
    users(page: Int = 1, limit: Int = 10): [User!]!
    user(id: ID!): User

    # Investigations
    investigations(
      page: Int = 1
      limit: Int = 10
      status: InvestigationStatus
      priority: InvestigationPriority
    ): [Investigation!]!
    investigation(id: ID!): Investigation
    myInvestigations: [Investigation!]!

    # Entities
    entities(
      investigationId: ID
      filter: EntityFilterInput
      page: Int = 1
      limit: Int = 50
    ): [Entity!]!
    entity(id: ID!): Entity
    entitiesByType(type: EntityType!, investigationId: ID): [Entity!]!

    # Relationships
    relationships(
      investigationId: ID
      page: Int = 1
      limit: Int = 50
    ): [Relationship!]!
    relationship(id: ID!): Relationship

    # Graph and Visualization
    graphData(investigationId: ID!): GraphData!
    graphMetrics(investigationId: ID!): GraphMetrics!

    # Search
    search(query: String!, limit: Int = 20): SearchResults!
    searchEntities(
      query: String!
      investigationId: ID
      limit: Int = 20
    ): [Entity!]!

    # AI Analysis
    linkPredictions(investigationId: ID!, limit: Int = 10): [LinkPrediction!]!
    anomalyDetection(investigationId: ID!): [AnomalyDetection!]!
    analysisResults(investigationId: ID!): [AnalysisResult!]!
  }

  # Mutations
  type Mutation {
    # Authentication
    login(input: LoginInput!): AuthPayload!
    register(input: RegisterInput!): AuthPayload!
    refreshToken(refreshToken: String!): AuthPayload!
    logout: Boolean!

    # User Management
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!

    # Investigations
    createInvestigation(input: CreateInvestigationInput!): Investigation!
    updateInvestigation(
      id: ID!
      input: UpdateInvestigationInput!
    ): Investigation!
    deleteInvestigation(id: ID!): Boolean!

    # Entities
    createEntity(input: CreateEntityInput!): Entity!
    updateEntity(id: ID!, input: UpdateEntityInput!): Entity!
    deleteEntity(id: ID!): Boolean!
    updateEntityPosition(id: ID!, position: PositionInput!): Entity!
    mergeEntities(sourceId: ID!, targetId: ID!): Entity!

    # Relationships
    createRelationship(input: CreateRelationshipInput!): Relationship!
    updateRelationship(id: ID!, input: UpdateRelationshipInput!): Relationship!
    deleteRelationship(id: ID!): Boolean!

    # AI Analysis
    runGraphAnalysis(input: GraphAnalysisInput!): [AnalysisResult!]!
    generateLinkPredictions(investigationId: ID!): [LinkPrediction!]!
    detectAnomalies(investigationId: ID!): [AnomalyDetection!]!

    # Data Import
    importEntitiesFromText(investigationId: ID!, text: String!): [Entity!]!
    importEntitiesFromFile(investigationId: ID!, fileUrl: String!): [Entity!]!
  }

  # Subscriptions for Real-time Updates
  type Subscription {
    # Investigation updates
    investigationUpdated(investigationId: ID!): Investigation!

    # Entity updates
    entityAdded(investigationId: ID!): Entity!
    entityUpdated(investigationId: ID!): Entity!
    entityDeleted(investigationId: ID!): ID!

    # Relationship updates
    relationshipAdded(investigationId: ID!): Relationship!
    relationshipUpdated(investigationId: ID!): Relationship!
    relationshipDeleted(investigationId: ID!): ID!

    # Analysis updates
    analysisCompleted(investigationId: ID!): AnalysisResult!
  }
`;

module.exports = { typeDefs };

// ===================================
// server/src/services/GraphAnalysisService.js - AI Analytics Engine
// ===================================
const { getNeo4jDriver } = require('../config/database');
const logger = require('../utils/logger');

class GraphAnalysisService {
  constructor() {
    this.driver = getNeo4jDriver();
  }

  /**
   * Calculate graph metrics and centrality scores
   */
  async calculateGraphMetrics(investigationId) {
    const session = this.driver.session();

    try {
      // Get basic metrics
      const metricsQuery = `
        MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        OPTIONAL MATCH (e)-[r:RELATIONSHIP]-(e2:Entity)-[:BELONGS_TO]->(i)
        RETURN 
          count(DISTINCT e) as nodeCount,
          count(DISTINCT r) as edgeCount
      `;

      const metricsResult = await session.run(metricsQuery, {
        investigationId,
      });
      const metrics = metricsResult.records[0].toObject();

      // Calculate density
      const nodeCount = metrics.nodeCount;
      const edgeCount = metrics.edgeCount;
      const maxEdges = (nodeCount * (nodeCount - 1)) / 2;
      const density = maxEdges > 0 ? edgeCount / maxEdges : 0;
      const averageDegree = nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0;

      // Calculate centrality scores
      const centralityScores =
        await this.calculateCentralityScores(investigationId);

      // Detect clusters
      const clusters = await this.detectCommunities(investigationId);

      return {
        nodeCount,
        edgeCount,
        density,
        averageDegree,
        centralityScores,
        clusters,
      };
    } catch (error) {
      logger.error('Error calculating graph metrics:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Calculate centrality scores for entities
   */
  async calculateCentralityScores(investigationId) {
    const session = this.driver.session();

    try {
      // Calculate degree centrality
      const degreeQuery = `
        MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        OPTIONAL MATCH (e)-[r:RELATIONSHIP]-(e2:Entity)-[:BELONGS_TO]->(i)
        RETURN 
          e.id as entityId,
          count(r) as degree
        ORDER BY degree DESC
      `;

      const degreeResult = await session.run(degreeQuery, { investigationId });
      const centralityScores = degreeResult.records.map((record) => ({
        entityId: record.get('entityId'),
        degree: record.get('degree').toNumber(),
        betweenness: 0, // Placeholder - would need more complex calculation
        closeness: 0, // Placeholder - would need more complex calculation
        pagerank: 0, // Placeholder - would need PageRank algorithm
      }));

      // For demo purposes, we'll simulate betweenness and PageRank scores
      centralityScores.forEach((score) => {
        score.betweenness = Math.random() * score.degree;
        score.closeness = Math.random();
        score.pagerank = Math.random() * 0.1;
      });

      return centralityScores;
    } catch (error) {
      logger.error('Error calculating centrality scores:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Detect communities/clusters in the graph
   */
  async detectCommunities(investigationId) {
    const session = this.driver.session();

    try {
      // Simple clustering based on connection patterns
      const clusterQuery = `
        MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        OPTIONAL MATCH (e)-[r:RELATIONSHIP]-(e2:Entity)-[:BELONGS_TO]->(i)
        WITH e, count(r) as connections, collect(e2) as neighbors
        RETURN 
          e.id as entityId,
          e.type as entityType,
          connections,
          neighbors
      `;

      const clusterResult = await session.run(clusterQuery, {
        investigationId,
      });

      // Simple clustering algorithm - group by entity type and high connectivity
      const clusters = new Map();
      const entities = clusterResult.records.map((record) => record.toObject());

      entities.forEach((entity) => {
        const clusterKey =
          entity.connections > 3 ? 'high_connectivity' : entity.entityType;

        if (!clusters.has(clusterKey)) {
          clusters.set(clusterKey, {
            id: clusterKey,
            entities: [],
            size: 0,
            cohesion: 0,
          });
        }

        clusters.get(clusterKey).entities.push(entity.entityId);
        clusters.get(clusterKey).size++;
      });

      // Calculate cohesion scores
      clusters.forEach((cluster) => {
        cluster.cohesion = Math.random() * 0.5 + 0.5; // Simulated cohesion score
      });

      return Array.from(clusters.values());
    } catch (error) {
      logger.error('Error detecting communities:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Predict potential links between entities
   */
  async predictLinks(investigationId, limit = 10) {
    const session = this.driver.session();

    try {
      // Find entities that are not directly connected but have common neighbors
      const linkPredictionQuery = `
        MATCH (e1:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        MATCH (e2:Entity)-[:BELONGS_TO]->(i)
        WHERE e1.id < e2.id
        
        // Check if they're not already connected
        OPTIONAL MATCH (e1)-[existing:RELATIONSHIP]-(e2)
        WHERE existing IS NULL
        
        // Find common neighbors
        MATCH (e1)-[:RELATIONSHIP]-(common)-[:RELATIONSHIP]-(e2)
        
        WITH e1, e2, count(common) as commonNeighbors
        WHERE commonNeighbors > 0
        
        RETURN 
          e1.id as sourceEntityId,
          e2.id as targetEntityId,
          e1.type as sourceType,
          e2.type as targetType,
          commonNeighbors
        ORDER BY commonNeighbors DESC
        LIMIT $limit
      `;

      const result = await session.run(linkPredictionQuery, {
        investigationId,
        limit,
      });

      return result.records.map((record) => {
        const sourceType = record.get('sourceType');
        const targetType = record.get('targetType');
        const commonNeighbors = record.get('commonNeighbors').toNumber();

        // Predict relationship type based on entity types and patterns
        const predictedType = this.predictRelationshipType(
          sourceType,
          targetType,
        );
        const confidence = Math.min(0.9, commonNeighbors * 0.2 + 0.1);

        return {
          sourceEntityId: record.get('sourceEntityId'),
          targetEntityId: record.get('targetEntityId'),
          predictedRelationshipType: predictedType,
          confidence,
          reasoning: `${commonNeighbors} common connections suggest potential relationship`,
        };
      });
    } catch (error) {
      logger.error('Error predicting links:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Detect anomalies in the graph
   */
  async detectAnomalies(investigationId) {
    const session = this.driver.session();

    try {
      const anomalies = [];

      // Detect entities with unusually high connectivity
      const highConnectivityQuery = `
        MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        OPTIONAL MATCH (e)-[r:RELATIONSHIP]-(connected)
        WITH e, count(r) as connections
        WHERE connections > 10
        RETURN e.id as entityId, connections
        ORDER BY connections DESC
        LIMIT 5
      `;

      const highConnResult = await session.run(highConnectivityQuery, {
        investigationId,
      });

      highConnResult.records.forEach((record) => {
        const connections = record.get('connections').toNumber();
        anomalies.push({
          entityId: record.get('entityId'),
          anomalyType: 'HIGH_CONNECTIVITY',
          severity: Math.min(1.0, connections / 20),
          description: `Entity has unusually high connectivity (${connections} connections)`,
          evidence: [`${connections} direct connections`],
        });
      });

      // Detect isolated entities
      const isolatedQuery = `
        MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        OPTIONAL MATCH (e)-[r:RELATIONSHIP]-(connected)
        WITH e, count(r) as connections
        WHERE connections = 0
        RETURN e.id as entityId, e.label as label
        LIMIT 10
      `;

      const isolatedResult = await session.run(isolatedQuery, {
        investigationId,
      });

      isolatedResult.records.forEach((record) => {
        anomalies.push({
          entityId: record.get('entityId'),
          anomalyType: 'ISOLATED_ENTITY',
          severity: 0.6,
          description: 'Entity has no connections to other entities',
          evidence: ['Zero connections', 'Potential data quality issue'],
        });
      });

      // Detect entities with unusual property patterns
      const propertyAnomalyQuery = `
        MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        WHERE size(keys(e.properties)) = 0 OR e.label IS NULL OR e.label = ""
        RETURN e.id as entityId, e.label as label, e.properties as properties
        LIMIT 10
      `;

      const propertyResult = await session.run(propertyAnomalyQuery, {
        investigationId,
      });

      propertyResult.records.forEach((record) => {
        anomalies.push({
          entityId: record.get('entityId'),
          anomalyType: 'INCOMPLETE_DATA',
          severity: 0.4,
          description: 'Entity has missing or incomplete data',
          evidence: ['Missing label or properties'],
        });
      });

      return anomalies;
    } catch (error) {
      logger.error('Error detecting anomalies:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Extract entities from text using simple NLP patterns
   */
  async extractEntitiesFromText(text) {
    // Simple entity extraction patterns
    const patterns = {
      EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      PHONE:
        /\b(?:\+?1[-.\s]?)?\(?[2-9][0-8][0-9]\)?[-.\s]?[2-9][0-9]{2}[-.\s]?[0-9]{4}\b/g,
      IP_ADDRESS: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
      URL: /https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?/g,
      // Add more patterns for organizations, locations, etc.
    };

    const extractedEntities = [];

    Object.entries(patterns).forEach(([type, pattern]) => {
      const matches = text.match(pattern) || [];
      matches.forEach((match) => {
        extractedEntities.push({
          type,
          label: match,
          confidence: 0.8,
          properties: { extractedFrom: 'text' },
        });
      });
    });

    // Simple person name extraction (very basic)
    const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
    const nameMatches = text.match(namePattern) || [];
    nameMatches.forEach((match) => {
      extractedEntities.push({
        type: 'PERSON',
        label: match,
        confidence: 0.6,
        properties: { extractedFrom: 'text' },
      });
    });

    return extractedEntities;
  }

  /**
   * Predict relationship type based on entity types
   */
  predictRelationshipType(sourceType, targetType) {
    const typeMap = {
      PERSON_ORGANIZATION: 'WORKS_FOR',
      PERSON_LOCATION: 'LOCATED_AT',
      PERSON_PERSON: 'KNOWS',
      ORGANIZATION_LOCATION: 'LOCATED_AT',
      PERSON_PHONE: 'OWNS',
      PERSON_EMAIL: 'OWNS',
      ORGANIZATION_DOCUMENT: 'OWNS',
    };

    const key = `${sourceType}_${targetType}`;
    const reverseKey = `${targetType}_${sourceType}`;

    return typeMap[key] || typeMap[reverseKey] || 'RELATED_TO';
  }
}

module.exports = GraphAnalysisService;

// ===================================
// server/src/services/EntityService.js - Entity Management
// ===================================
const { v4: uuidv4 } = require('uuid');
const { getNeo4jDriver } = require('../config/database');
const logger = require('../utils/logger');

class EntityService {
  constructor() {
    this.driver = getNeo4jDriver();
  }

  async createEntity(entityData, userId) {
    const session = this.driver.session();

    try {
      const entityId = uuidv4();
      const entityUuid = uuidv4();
      const now = new Date().toISOString();

      const query = `
        MATCH (i:Investigation {id: $investigationId})
        MATCH (u:User {id: $userId})
        
        CREATE (e:Entity {
          id: $entityId,
          uuid: $entityUuid,
          type: $type,
          label: $label,
          description: $description,
          properties: $properties,
          confidence: $confidence,
          source: $source,
          verified: $verified,
          createdAt: $createdAt,
          updatedAt: $createdAt
        })
        
        CREATE (e)-[:BELONGS_TO]->(i)
        CREATE (e)-[:CREATED_BY]->(u)
        
        ${
          entityData.position
            ? `
        CREATE (e)-[:HAS_POSITION]->(:Position {
          x: $positionX,
          y: $positionY
        })
        `
            : ''
        }
        
        RETURN e, i, u
      `;

      const params = {
        investigationId: entityData.investigationId,
        userId,
        entityId,
        entityUuid,
        type: entityData.type,
        label: entityData.label,
        description: entityData.description || null,
        properties: entityData.properties || {},
        confidence: entityData.confidence || 1.0,
        source: entityData.source || 'user_input',
        verified: entityData.verified || false,
        createdAt: now,
        ...(entityData.position && {
          positionX: entityData.position.x,
          positionY: entityData.position.y,
        }),
      };

      const result = await session.run(query, params);

      if (result.records.length === 0) {
        throw new Error('Failed to create entity');
      }

      return this.formatEntityResult(result.records[0]);
    } catch (error) {
      logger.error('Error creating entity:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async getEntitiesByInvestigation(
    investigationId,
    filters = {},
    pagination = {},
  ) {
    const session = this.driver.session();

    try {
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;

      let whereClause = '';
      const params = { investigationId, skip, limit };

      if (filters.types && filters.types.length > 0) {
        whereClause += ' AND e.type IN $types';
        params.types = filters.types;
      }

      if (filters.verified !== undefined) {
        whereClause += ' AND e.verified = $verified';
        params.verified = filters.verified;
      }

      const query = `
        MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        MATCH (e)-[:CREATED_BY]->(u:User)
        OPTIONAL MATCH (e)-[:HAS_POSITION]->(pos:Position)
        
        WHERE 1=1 ${whereClause}
        
        RETURN e, u, pos
        ORDER BY e.createdAt DESC
        SKIP $skip
        LIMIT $limit
      `;

      const result = await session.run(query, params);

      return result.records.map((record) => this.formatEntityResult(record));
    } catch (error) {
      logger.error('Error getting entities:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async updateEntity(entityId, updateData, userId) {
    const session = this.driver.session();

    try {
      const now = new Date().toISOString();
      const setClauses = [];
      const params = { entityId, userId, updatedAt: now };

      // Build dynamic SET clauses
      Object.entries(updateData).forEach(([key, value]) => {
        if (key !== 'position' && value !== undefined) {
          setClauses.push(`e.${key} = $${key}`);
          params[key] = value;
        }
      });

      let positionQuery = '';
      if (updateData.position) {
        positionQuery = `
          OPTIONAL MATCH (e)-[r:HAS_POSITION]->(oldPos:Position)
          DELETE r, oldPos
          CREATE (e)-[:HAS_POSITION]->(:Position {x: $positionX, y: $positionY})
        `;
        params.positionX = updateData.position.x;
        params.positionY = updateData.position.y;
      }

      const query = `
        MATCH (e:Entity {id: $entityId})
        MATCH (e)-[:CREATED_BY]->(u:User)
        OPTIONAL MATCH (e)-[:HAS_POSITION]->(pos:Position)
        
        SET ${setClauses.join(', ')}, e.updatedAt = $updatedAt
        
        ${positionQuery}
        
        RETURN e, u, pos
      `;

      const result = await session.run(query, params);

      if (result.records.length === 0) {
        throw new Error('Entity not found');
      }

      return this.formatEntityResult(result.records[0]);
    } catch (error) {
      logger.error('Error updating entity:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async deleteEntity(entityId, userId) {
    const session = this.driver.session();

    try {
      const query = `
        MATCH (e:Entity {id: $entityId})
        
        // Delete all relationships first
        OPTIONAL MATCH (e)-[r:RELATIONSHIP]-(other)
        DELETE r
        
        // Delete position
        OPTIONAL MATCH (e)-[posRel:HAS_POSITION]->(pos:Position)
        DELETE posRel, pos
        
        // Delete entity relationships
        OPTIONAL MATCH (e)-[rel]-(other)
        DELETE rel
        
        // Finally delete the entity
        DELETE e
        
        RETURN count(e) as deletedCount
      `;

      const result = await session.run(query, { entityId, userId });

      return result.records[0].get('deletedCount').toNumber() > 0;
    } catch (error) {
      logger.error('Error deleting entity:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async searchEntities(query, investigationId = null, limit = 20) {
    const session = this.driver.session();

    try {
      let cypher = `
        CALL db.index.fulltext.queryNodes("entity_search", $searchQuery) 
        YIELD node as e, score
        MATCH (e)-[:CREATED_BY]->(u:User)
        OPTIONAL MATCH (e)-[:HAS_POSITION]->(pos:Position)
      `;

      const params = {
        searchQuery: `*${query}*`,
        limit,
      };

      if (investigationId) {
        cypher += ` MATCH (e)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})`;
        params.investigationId = investigationId;
      }

      cypher += `
        RETURN e, u, pos, score
        ORDER BY score DESC
        LIMIT $limit
      `;

      const result = await session.run(cypher, params);

      return result.records.map((record) => ({
        ...this.formatEntityResult(record),
        searchScore: record.get('score'),
      }));
    } catch (error) {
      logger.error('Error searching entities:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  formatEntityResult(record) {
    const entity = record.get('e').properties;
    const user = record.get('u').properties;
    const position = record.has('pos') ? record.get('pos')?.properties : null;

    return {
      id: entity.id,
      uuid: entity.uuid,
      type: entity.type,
      label: entity.label,
      description: entity.description,
      properties: entity.properties || {},
      confidence: entity.confidence || 1.0,
      source: entity.source,
      verified: entity.verified || false,
      position: position ? { x: position.x, y: position.y } : null,
      createdBy: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

module.exports = EntityService;
