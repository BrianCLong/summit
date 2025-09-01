import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform, Readable } from 'stream';
import csv from 'csv-parser';
import { stringify } from 'csv-stringify';
import { getNeo4jDriver } from '../db/neo4j';
import pino from 'pino';
const logger = pino();
export class MVP0ImportExportService {
    constructor() {
        this.neo4jDriver = getNeo4jDriver();
    }
    /**
     * Import entities from CSV with streaming for 100k+ rows
     * Performance target: Process 100k rows in under 60 seconds
     */
    async importEntitiesFromCSV(filePath, tenantId, userId, batchSize = 1000) {
        const stats = {
            totalRows: 0,
            successfulRows: 0,
            failedRows: 0,
            startTime: Date.now(),
            errors: []
        };
        const session = this.neo4jDriver.session();
        let batch = [];
        try {
            // Create a transform stream for batch processing
            const batchProcessor = new Transform({
                objectMode: true,
                transform(chunk, encoding, callback) {
                    batch.push(chunk);
                    stats.totalRows++;
                    if (batch.length >= batchSize) {
                        this.push(batch);
                        batch = [];
                    }
                    callback();
                },
                flush(callback) {
                    if (batch.length > 0) {
                        this.push(batch);
                    }
                    callback();
                }
            });
            // Process batches with Neo4j UNWIND for optimal performance
            const neo4jProcessor = new Transform({
                objectMode: true,
                async transform(batch, encoding, callback) {
                    try {
                        const query = `
              UNWIND $entities AS entity
              CREATE (e:Entity {
                id: apoc.create.uuid(),
                type: entity.type,
                label: entity.label,
                description: entity.description,
                properties: entity.properties,
                investigationId: entity.investigationId,
                tenantId: entity.tenantId,
                source: entity.source,
                confidence: coalesce(entity.confidence, 1.0),
                verified: false,
                createdBy: $userId,
                createdAt: datetime(),
                updatedAt: datetime()
              })
              RETURN count(e) as created
            `;
                        const entitiesData = batch.map(row => {
                            let properties = {};
                            try {
                                properties = row.properties ? JSON.parse(row.properties) : {};
                            }
                            catch (e) {
                                stats.errors.push({
                                    row: stats.totalRows,
                                    error: `Invalid JSON in properties: ${e.message}`
                                });
                            }
                            return {
                                ...row,
                                properties,
                                confidence: row.confidence ? parseFloat(row.confidence.toString()) : 1.0
                            };
                        });
                        const result = await session.run(query, {
                            entities: entitiesData,
                            userId
                        });
                        const created = result.records[0].get('created').toNumber();
                        stats.successfulRows += created;
                        if (created < batch.length) {
                            stats.failedRows += (batch.length - created);
                        }
                        logger.info(`Processed batch: ${created}/${batch.length} entities created`);
                    }
                    catch (error) {
                        logger.error('Batch processing error:', error);
                        stats.failedRows += batch.length;
                        stats.errors.push({
                            row: stats.totalRows,
                            error: error.message
                        });
                    }
                    callback();
                }
            });
            // Stream pipeline for maximum performance
            await pipeline(createReadStream(filePath), csv({
                mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/\s+/g, '_')
            }), batchProcessor, neo4jProcessor);
            stats.endTime = Date.now();
            stats.duration = stats.endTime - stats.startTime;
            stats.rowsPerSecond = Math.round((stats.totalRows / stats.duration) * 1000);
            logger.info(`Import completed: ${stats.successfulRows}/${stats.totalRows} rows in ${stats.duration}ms (${stats.rowsPerSecond} rows/sec)`);
            return stats;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Import relationships from CSV with streaming
     */
    async importRelationshipsFromCSV(filePath, tenantId, userId, batchSize = 1000) {
        const stats = {
            totalRows: 0,
            successfulRows: 0,
            failedRows: 0,
            startTime: Date.now(),
            errors: []
        };
        const session = this.neo4jDriver.session();
        let batch = [];
        try {
            const batchProcessor = new Transform({
                objectMode: true,
                transform(chunk, encoding, callback) {
                    batch.push(chunk);
                    stats.totalRows++;
                    if (batch.length >= batchSize) {
                        this.push(batch);
                        batch = [];
                    }
                    callback();
                },
                flush(callback) {
                    if (batch.length > 0) {
                        this.push(batch);
                    }
                    callback();
                }
            });
            const neo4jProcessor = new Transform({
                objectMode: true,
                async transform(batch, encoding, callback) {
                    try {
                        // Create relationships with entity matching
                        const query = `
              UNWIND $relationships AS rel
              MATCH (source:Entity {label: rel.sourceEntityLabel, tenantId: rel.tenantId, investigationId: rel.investigationId})
              MATCH (target:Entity {label: rel.targetEntityLabel, tenantId: rel.tenantId, investigationId: rel.investigationId})
              CREATE (source)-[r:RELATIONSHIP {
                id: apoc.create.uuid(),
                type: rel.type,
                label: rel.label,
                properties: rel.properties,
                weight: coalesce(rel.weight, 1.0),
                confidence: coalesce(rel.confidence, 1.0),
                verified: false,
                createdBy: $userId,
                createdAt: datetime(),
                updatedAt: datetime()
              }]->(target)
              RETURN count(r) as created
            `;
                        const relationshipsData = batch.map(row => {
                            let properties = {};
                            try {
                                properties = row.properties ? JSON.parse(row.properties) : {};
                            }
                            catch (e) {
                                stats.errors.push({
                                    row: stats.totalRows,
                                    error: `Invalid JSON in properties: ${e.message}`
                                });
                            }
                            return {
                                ...row,
                                properties,
                                weight: row.weight ? parseFloat(row.weight.toString()) : 1.0,
                                confidence: row.confidence ? parseFloat(row.confidence.toString()) : 1.0
                            };
                        });
                        const result = await session.run(query, {
                            relationships: relationshipsData,
                            userId
                        });
                        const created = result.records[0].get('created').toNumber();
                        stats.successfulRows += created;
                        if (created < batch.length) {
                            stats.failedRows += (batch.length - created);
                        }
                        logger.info(`Processed relationship batch: ${created}/${batch.length} relationships created`);
                    }
                    catch (error) {
                        logger.error('Relationship batch processing error:', error);
                        stats.failedRows += batch.length;
                        stats.errors.push({
                            row: stats.totalRows,
                            error: error.message
                        });
                    }
                    callback();
                }
            });
            await pipeline(createReadStream(filePath), csv({
                mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/\s+/g, '_')
            }), batchProcessor, neo4jProcessor);
            stats.endTime = Date.now();
            stats.duration = stats.endTime - stats.startTime;
            stats.rowsPerSecond = Math.round((stats.totalRows / stats.duration) * 1000);
            logger.info(`Relationship import completed: ${stats.successfulRows}/${stats.totalRows} rows in ${stats.duration}ms (${stats.rowsPerSecond} rows/sec)`);
            return stats;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Export entities to CSV with streaming for large datasets
     */
    async exportEntitiesToCSV(investigationId, tenantId, filePath, batchSize = 5000) {
        const startTime = Date.now();
        const session = this.neo4jDriver.session();
        let totalCount = 0;
        try {
            // Create CSV writer
            const writeStream = createWriteStream(filePath);
            const csvWriter = stringify({
                header: true,
                columns: [
                    'id', 'type', 'label', 'description', 'properties',
                    'confidence', 'source', 'verified', 'createdAt', 'updatedAt'
                ]
            });
            csvWriter.pipe(writeStream);
            // Stream query with batching for memory efficiency
            const query = `
        MATCH (e:Entity)
        WHERE e.investigationId = $investigationId 
        AND e.tenantId = $tenantId
        RETURN e
        ORDER BY e.createdAt
        SKIP $skip
        LIMIT $limit
      `;
            let skip = 0;
            let hasMore = true;
            while (hasMore) {
                const result = await session.run(query, {
                    investigationId,
                    tenantId,
                    skip,
                    limit: batchSize
                });
                if (result.records.length === 0) {
                    hasMore = false;
                    break;
                }
                for (const record of result.records) {
                    const entity = record.get('e').properties;
                    csvWriter.write({
                        id: entity.id,
                        type: entity.type,
                        label: entity.label,
                        description: entity.description || '',
                        properties: JSON.stringify(entity.properties || {}),
                        confidence: entity.confidence || 1.0,
                        source: entity.source || '',
                        verified: entity.verified || false,
                        createdAt: entity.createdAt?.toString() || '',
                        updatedAt: entity.updatedAt?.toString() || ''
                    });
                    totalCount++;
                }
                skip += batchSize;
                if (result.records.length < batchSize) {
                    hasMore = false;
                }
                logger.info(`Exported ${totalCount} entities so far...`);
            }
            csvWriter.end();
            await new Promise(resolve => writeStream.on('finish', resolve));
            const duration = Date.now() - startTime;
            logger.info(`Export completed: ${totalCount} entities exported in ${duration}ms`);
            return { count: totalCount, duration, filePath };
        }
        finally {
            await session.close();
        }
    }
    /**
     * Export to JSON with streaming for API responses
     */
    async exportToJSONStream(investigationId, tenantId, batchSize = 1000) {
        const session = this.neo4jDriver.session();
        return new Readable({
            objectMode: true,
            async read() {
                try {
                    // Query both entities and relationships
                    const query = `
            MATCH (e:Entity {investigationId: $investigationId, tenantId: $tenantId})
            OPTIONAL MATCH (e)-[r:RELATIONSHIP]-(e2:Entity {investigationId: $investigationId, tenantId: $tenantId})
            RETURN {
              entities: collect(distinct e),
              relationships: collect(distinct r)
            } as data
          `;
                    const result = await session.run(query, { investigationId, tenantId });
                    if (result.records.length > 0) {
                        const data = result.records[0].get('data');
                        this.push(JSON.stringify(data));
                    }
                    this.push(null); // End stream
                }
                catch (error) {
                    this.destroy(error);
                }
                finally {
                    await session.close();
                }
            }
        });
    }
    /**
     * Performance test: Generate and import 100k test entities
     */
    async performanceTest100k(tenantId, userId) {
        const testFilePath = '/tmp/test_entities_100k.csv';
        // Generate 100k test entities
        const writeStream = createWriteStream(testFilePath);
        const csvWriter = stringify({
            header: true,
            columns: ['type', 'label', 'description', 'properties', 'investigation_id', 'tenant_id', 'source', 'confidence']
        });
        csvWriter.pipe(writeStream);
        const entityTypes = ['PERSON', 'ORGANIZATION', 'LOCATION', 'DOCUMENT', 'EMAIL'];
        const testInvestigationId = 'perf-test-investigation';
        logger.info('Generating 100k test entities...');
        for (let i = 0; i < 100000; i++) {
            const type = entityTypes[i % entityTypes.length];
            csvWriter.write({
                type,
                label: `${type}_${i}`,
                description: `Test entity ${i} for performance testing`,
                properties: JSON.stringify({
                    testId: i,
                    batch: Math.floor(i / 1000),
                    category: `test_category_${i % 10}`
                }),
                investigation_id: testInvestigationId,
                tenant_id: tenantId,
                source: 'performance_test',
                confidence: (0.5 + (i % 50) / 100).toFixed(2)
            });
            if (i % 10000 === 0) {
                logger.info(`Generated ${i} entities...`);
            }
        }
        csvWriter.end();
        await new Promise(resolve => writeStream.on('finish', resolve));
        logger.info('Starting 100k entity import test...');
        // Import the generated entities
        const stats = await this.importEntitiesFromCSV(testFilePath, tenantId, userId, 2000); // Larger batches for performance
        logger.info(`100k Performance Test Results:
      - Total Rows: ${stats.totalRows}
      - Successful: ${stats.successfulRows}
      - Failed: ${stats.failedRows}
      - Duration: ${stats.duration}ms (${(stats.duration / 1000).toFixed(2)}s)
      - Throughput: ${stats.rowsPerSecond} rows/sec
      - Target: 60s for 100k rows ${stats.duration < 60000 ? '✅ PASSED' : '❌ FAILED'}
    `);
        return stats;
    }
}
export default MVP0ImportExportService;
//# sourceMappingURL=MVP0ImportExportService.js.map