"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
exports.getSignalRepository = getSignalRepository;
exports.getNeo4jConnection = getNeo4jConnection;
exports.closeDatabase = closeDatabase;
exports.isDatabaseHealthy = isDatabaseHealthy;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const logger_js_1 = require("../observability/logger.js");
const metrics_js_1 = require("../observability/metrics.js");
const environment_js_1 = require("../../config/environment.js");
class Neo4jConnection {
    driver;
    isConnected = false;
    constructor() {
        this.driver = neo4j_driver_1.default.driver(environment_js_1.config.NEO4J_URI, neo4j_driver_1.default.auth.basic(environment_js_1.config.NEO4J_USER, environment_js_1.config.NEO4J_PASSWORD), {
            maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
            maxConnectionPoolSize: 50,
            connectionAcquisitionTimeout: 60000, // 1 minute
            disableLosslessIntegers: true,
            encrypted: environment_js_1.config.NODE_ENV === 'production' ? 'ENCRYPTION_ON' : 'ENCRYPTION_OFF',
            trust: environment_js_1.config.NODE_ENV === 'production'
                ? 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES'
                : 'TRUST_ALL_CERTIFICATES',
            logging: {
                level: environment_js_1.config.NODE_ENV === 'production' ? 'warn' : 'info',
                logger: (level, message) => logger_js_1.logger.debug(`Neo4j ${level}`, { message }),
            },
        });
    }
    async connect() {
        if (this.isConnected) {
            return;
        }
        try {
            logger_js_1.logger.info('Connecting to Neo4j', {
                uri: environment_js_1.config.NEO4J_URI,
                user: environment_js_1.config.NEO4J_USER,
                database: environment_js_1.config.NEO4J_DATABASE,
            });
            // Verify connectivity
            await this.driver.verifyConnectivity();
            // Create indexes and constraints
            await this.setupSchema();
            this.isConnected = true;
            logger_js_1.logger.info('Neo4j connection established and schema initialized', {
                uri: environment_js_1.config.NEO4J_URI,
                database: environment_js_1.config.NEO4J_DATABASE,
            });
        }
        catch (error) {
            logger_js_1.logger.error('Failed to connect to Neo4j', {
                error: error.message,
                stack: error.stack,
                uri: environment_js_1.config.NEO4J_URI,
            });
            (0, metrics_js_1.incrementCounter)('neo4j_connection_errors_total', {
                error_type: error.name || 'unknown',
            });
            throw error;
        }
    }
    async setupSchema() {
        const session = this.getSession();
        try {
            logger_js_1.logger.info('Setting up Neo4j schema and indexes...');
            // Create constraints
            const constraints = [
                'CREATE CONSTRAINT signal_id_unique IF NOT EXISTS FOR (s:Signal) REQUIRE s.signalId IS UNIQUE',
                'CREATE CONSTRAINT tenant_id_unique IF NOT EXISTS FOR (t:Tenant) REQUIRE t.tenantId IS UNIQUE',
            ];
            for (const constraint of constraints) {
                try {
                    await session.run(constraint);
                    logger_js_1.logger.debug('Created constraint', { constraint });
                }
                catch (error) {
                    if (!error.message.includes('already exists')) {
                        logger_js_1.logger.warn('Failed to create constraint', {
                            constraint,
                            error: error.message,
                        });
                    }
                }
            }
            // Create indexes for performance
            const indexes = [
                'CREATE INDEX signal_tenant_ts IF NOT EXISTS FOR (s:Signal) ON (s.tenantId, s.ts)',
                'CREATE INDEX signal_type IF NOT EXISTS FOR (s:Signal) ON (s.type)',
                'CREATE INDEX signal_source IF NOT EXISTS FOR (s:Signal) ON (s.source)',
                'CREATE INDEX signal_provenance IF NOT EXISTS FOR (s:Signal) ON (s.provenanceId)',
                'CREATE INDEX tenant_tier IF NOT EXISTS FOR (t:Tenant) ON (t.tier)',
            ];
            for (const index of indexes) {
                try {
                    await session.run(index);
                    logger_js_1.logger.debug('Created index', { index });
                }
                catch (error) {
                    if (!error.message.includes('already exists')) {
                        logger_js_1.logger.warn('Failed to create index', {
                            index,
                            error: error.message,
                        });
                    }
                }
            }
            logger_js_1.logger.info('Neo4j schema setup completed');
        }
        finally {
            await session.close();
        }
    }
    getSession(database) {
        if (!this.isConnected) {
            throw new Error('Neo4j not connected. Call connect() first.');
        }
        return this.driver.session({
            database: database || environment_js_1.config.NEO4J_DATABASE,
            defaultAccessMode: neo4j_driver_1.default.session.WRITE,
        });
    }
    async disconnect() {
        if (!this.isConnected) {
            return;
        }
        try {
            await this.driver.close();
            this.isConnected = false;
            logger_js_1.logger.info('Neo4j connection closed');
        }
        catch (error) {
            logger_js_1.logger.error('Error closing Neo4j connection', {
                error: error.message,
                stack: error.stack,
            });
        }
    }
    isHealthy() {
        return this.isConnected;
    }
}
class Neo4jSignalRepository {
    connection;
    constructor(connection) {
        this.connection = connection;
    }
    async upsertSignal(signal) {
        const session = this.connection.getSession();
        const startTime = Date.now();
        try {
            const query = `
        MERGE (t:Tenant {tenantId: $tenantId})
        ON CREATE SET 
          t.createdAt = datetime(),
          t.updatedAt = datetime(),
          t.signalCount = 0
        ON MATCH SET 
          t.updatedAt = datetime(),
          t.signalCount = coalesce(t.signalCount, 0) + 1
        
        WITH t
        MERGE (s:Signal {signalId: $signalId})
        ON CREATE SET 
          s.tenantId = $tenantId,
          s.type = $type,
          s.value = $value,
          s.weight = $weight,
          s.source = $source,
          s.ts = datetime($ts),
          s.createdAt = datetime(),
          s.provenanceId = $provenanceId,
          s.metadata = $metadata
        ON MATCH SET
          s.value = $value,
          s.weight = $weight,
          s.updatedAt = datetime(),
          s.metadata = $metadata
        
        WITH t, s
        MERGE (t)-[r:EMITS]->(s)
        ON CREATE SET r.createdAt = datetime()
        
        RETURN s.signalId as signalId, 
               s.createdAt = s.updatedAt as wasCreated,
               t.tenantId as tenantId
      `;
            const parameters = {
                signalId: signal.signalId,
                tenantId: signal.tenantId,
                type: signal.type,
                value: signal.value,
                weight: signal.weight || 1.0,
                source: signal.source,
                ts: signal.ts.toISOString(),
                provenanceId: signal.provenance.id,
                metadata: signal.metadata || {},
            };
            const result = await session.run(query, parameters);
            if (result.records.length === 0) {
                throw new Error('Signal upsert returned no results');
            }
            const record = result.records[0];
            const wasCreated = record.get('wasCreated');
            const signalId = record.get('signalId');
            // Record metrics
            const duration = Date.now() - startTime;
            (0, metrics_js_1.recordHistogram)('neo4j_query_duration_seconds', duration / 1000, {
                operation: 'upsert_signal',
                tenant_id: signal.tenantId,
            });
            (0, metrics_js_1.incrementCounter)('neo4j_signals_upserted_total', {
                tenant_id: signal.tenantId,
                signal_type: signal.type,
                was_created: wasCreated.toString(),
            });
            logger_js_1.logger.debug('Signal upserted in Neo4j', {
                signalId,
                tenantId: signal.tenantId,
                wasCreated,
                duration,
            });
            return { signalId, wasCreated };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            (0, metrics_js_1.incrementCounter)('neo4j_query_errors_total', {
                operation: 'upsert_signal',
                error_type: error.name || 'unknown',
            });
            logger_js_1.logger.error('Failed to upsert signal in Neo4j', {
                signalId: signal.signalId,
                tenantId: signal.tenantId,
                error: error.message,
                stack: error.stack,
                duration,
            });
            throw error;
        }
        finally {
            await session.close();
        }
    }
    async batchUpsertSignals(signals) {
        const session = this.connection.getSession();
        const startTime = Date.now();
        const results = [];
        let successCount = 0;
        let errorCount = 0;
        try {
            // Process in batches to avoid memory issues
            const batchSize = 100;
            for (let i = 0; i < signals.length; i += batchSize) {
                const batch = signals.slice(i, i + batchSize);
                const tx = session.beginTransaction();
                try {
                    for (const signal of batch) {
                        try {
                            const query = `
                MERGE (t:Tenant {tenantId: $tenantId})
                ON CREATE SET 
                  t.createdAt = datetime(),
                  t.updatedAt = datetime(),
                  t.signalCount = 1
                ON MATCH SET 
                  t.updatedAt = datetime(),
                  t.signalCount = coalesce(t.signalCount, 0) + 1
                
                WITH t
                MERGE (s:Signal {signalId: $signalId})
                ON CREATE SET 
                  s.tenantId = $tenantId,
                  s.type = $type,
                  s.value = $value,
                  s.weight = $weight,
                  s.source = $source,
                  s.ts = datetime($ts),
                  s.createdAt = datetime(),
                  s.provenanceId = $provenanceId,
                  s.metadata = $metadata
                ON MATCH SET
                  s.value = $value,
                  s.weight = $weight,
                  s.updatedAt = datetime()
                
                WITH t, s
                MERGE (t)-[r:EMITS]->(s)
                ON CREATE SET r.createdAt = datetime()
                
                RETURN s.signalId as signalId, s.createdAt = s.updatedAt as wasCreated
              `;
                            const parameters = {
                                signalId: signal.signalId,
                                tenantId: signal.tenantId,
                                type: signal.type,
                                value: signal.value,
                                weight: signal.weight || 1.0,
                                source: signal.source,
                                ts: signal.ts.toISOString(),
                                provenanceId: signal.provenance.id,
                                metadata: signal.metadata || {},
                            };
                            const result = await tx.run(query, parameters);
                            if (result.records.length > 0) {
                                const record = result.records[0];
                                results.push({
                                    signalId: signal.signalId,
                                    status: 'success',
                                    wasCreated: record.get('wasCreated'),
                                });
                                successCount++;
                            }
                        }
                        catch (error) {
                            logger_js_1.logger.error('Error processing signal in batch', {
                                signalId: signal.signalId,
                                error: error.message,
                            });
                            results.push({
                                signalId: signal.signalId,
                                status: 'error',
                                error: error.message,
                            });
                            errorCount++;
                        }
                    }
                    await tx.commit();
                }
                catch (error) {
                    await tx.rollback();
                    throw error;
                }
            }
            const duration = Date.now() - startTime;
            (0, metrics_js_1.recordHistogram)('neo4j_batch_query_duration_seconds', duration / 1000, {
                operation: 'batch_upsert_signals',
                batch_size: signals.length.toString(),
            });
            (0, metrics_js_1.incrementCounter)('neo4j_batch_signals_processed_total', {
                batch_size: signals.length.toString(),
                success_count: successCount.toString(),
                error_count: errorCount.toString(),
            });
            logger_js_1.logger.info('Batch signal upsert completed', {
                totalSignals: signals.length,
                successCount,
                errorCount,
                duration,
            });
            return { successCount, errorCount, details: results };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            (0, metrics_js_1.incrementCounter)('neo4j_batch_query_errors_total', {
                operation: 'batch_upsert_signals',
                error_type: error.name || 'unknown',
            });
            logger_js_1.logger.error('Failed to batch upsert signals in Neo4j', {
                batchSize: signals.length,
                error: error.message,
                stack: error.stack,
                duration,
            });
            throw error;
        }
        finally {
            await session.close();
        }
    }
    async computeCoherenceScore(tenantId, windowHours = 24) {
        const session = this.connection.getSession();
        const startTime = Date.now();
        try {
            const query = `
        MATCH (t:Tenant {tenantId: $tenantId})-[:EMITS]->(s:Signal)
        WHERE s.ts >= datetime() - duration('PT' + $windowHours + 'H')
        
        WITH t, s, datetime() - duration('PT' + $windowHours + 'H') as windowStart, datetime() as windowEnd
        
        WITH t, 
             collect({v: s.value, w: coalesce(s.weight, 1.0)}) AS items,
             count(s) as signalCount,
             windowStart,
             windowEnd
        
        WITH t, 
             reduce(sumV = 0.0, i IN items | sumV + i.v * i.w) AS weightedSum,
             reduce(sumW = 0.0, i IN items | sumW + i.w) AS totalWeight,
             signalCount,
             windowStart,
             windowEnd
        
        WITH t,
             CASE 
               WHEN totalWeight = 0 THEN 0.0 
               ELSE weightedSum / totalWeight 
             END AS score,
             signalCount,
             windowStart,
             windowEnd
        
        RETURN t.tenantId AS tenantId,
               score,
               CASE 
                 WHEN score >= 0.75 THEN 'HEALTHY'
                 WHEN score >= 0.5 THEN 'WARN'
                 ELSE 'CRITICAL'
               END AS status,
               datetime() AS updatedAt,
               signalCount,
               windowStart,
               windowEnd
      `;
            const result = await session.run(query, {
                tenantId,
                windowHours: windowHours.toString(),
            });
            if (result.records.length === 0) {
                // No signals found for tenant
                return null;
            }
            const record = result.records[0];
            const coherenceScore = {
                tenantId: record.get('tenantId'),
                score: Number(record.get('score')),
                status: record.get('status'),
                updatedAt: new Date(record.get('updatedAt').toString()),
                signalCount: record.get('signalCount').toNumber(),
                windowStart: new Date(record.get('windowStart').toString()),
                windowEnd: new Date(record.get('windowEnd').toString()),
            };
            const duration = Date.now() - startTime;
            (0, metrics_js_1.recordHistogram)('neo4j_query_duration_seconds', duration / 1000, {
                operation: 'compute_coherence_score',
                tenant_id: tenantId,
            });
            logger_js_1.logger.debug('Coherence score computed', {
                tenantId,
                score: coherenceScore.score,
                status: coherenceScore.status,
                signalCount: coherenceScore.signalCount,
                duration,
            });
            return coherenceScore;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            (0, metrics_js_1.incrementCounter)('neo4j_query_errors_total', {
                operation: 'compute_coherence_score',
                error_type: error.name || 'unknown',
            });
            logger_js_1.logger.error('Failed to compute coherence score', {
                tenantId,
                windowHours,
                error: error.message,
                stack: error.stack,
                duration,
            });
            throw error;
        }
        finally {
            await session.close();
        }
    }
    async getTenantSignals(tenantId, limit = 1000, offset = 0) {
        const session = this.connection.getSession();
        const startTime = Date.now();
        try {
            const query = `
        MATCH (t:Tenant {tenantId: $tenantId})-[:EMITS]->(s:Signal)
        RETURN s.signalId as signalId,
               s.tenantId as tenantId,
               s.type as type,
               s.value as value,
               s.weight as weight,
               s.source as source,
               s.ts as ts,
               s.metadata as metadata,
               s.provenanceId as provenanceId
        ORDER BY s.ts DESC
        SKIP $offset
        LIMIT $limit
      `;
            const result = await session.run(query, { tenantId, limit, offset });
            const signals = result.records.map((record) => ({
                signalId: record.get('signalId'),
                tenantId: record.get('tenantId'),
                type: record.get('type'),
                value: record.get('value'),
                weight: record.get('weight'),
                source: record.get('source'),
                ts: new Date(record.get('ts').toString()),
                metadata: record.get('metadata') || {},
                provenance: { id: record.get('provenanceId') },
            }));
            const duration = Date.now() - startTime;
            (0, metrics_js_1.recordHistogram)('neo4j_query_duration_seconds', duration / 1000, {
                operation: 'get_tenant_signals',
                tenant_id: tenantId,
            });
            return signals;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            (0, metrics_js_1.incrementCounter)('neo4j_query_errors_total', {
                operation: 'get_tenant_signals',
                error_type: error.name || 'unknown',
            });
            logger_js_1.logger.error('Failed to get tenant signals', {
                tenantId,
                limit,
                offset,
                error: error.message,
                duration,
            });
            throw error;
        }
        finally {
            await session.close();
        }
    }
}
// Global connection instance
let neo4jConnection = null;
let signalRepository = null;
async function initializeDatabase() {
    try {
        neo4jConnection = new Neo4jConnection();
        await neo4jConnection.connect();
        signalRepository = new Neo4jSignalRepository(neo4jConnection);
        logger_js_1.logger.info('Neo4j database initialized successfully');
    }
    catch (error) {
        logger_js_1.logger.error('Failed to initialize Neo4j database', {
            error: error.message,
            stack: error.stack,
        });
        throw error;
    }
}
function getSignalRepository() {
    if (!signalRepository) {
        throw new Error('Signal repository not initialized. Call initializeDatabase() first.');
    }
    return signalRepository;
}
function getNeo4jConnection() {
    if (!neo4jConnection) {
        throw new Error('Neo4j connection not initialized. Call initializeDatabase() first.');
    }
    return neo4jConnection;
}
async function closeDatabase() {
    if (neo4jConnection) {
        await neo4jConnection.disconnect();
        neo4jConnection = null;
        signalRepository = null;
    }
}
// Health check
function isDatabaseHealthy() {
    return neo4jConnection?.isHealthy() || false;
}
