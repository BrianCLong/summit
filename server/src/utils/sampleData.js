"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSampleData = createSampleData;
const neo4j_js_1 = require("../db/neo4j.js");
const postgres_js_1 = require("../db/postgres.js");
const crypto_1 = require("crypto");
const logger_js_1 = require("./logger.js");
/**
 * Creates sample data in Neo4j and PostgreSQL for development purposes.
 *
 * This function populates the databases with:
 * - Entities (Person, Organization, Event, Location, Asset) in Neo4j.
 * - Relationships (WORKS_FOR, INVOLVED_IN) between entities in Neo4j.
 * - Users (Admin, Analyst) in PostgreSQL.
 * - Investigations in PostgreSQL.
 *
 * It is idempotent-ish (uses MERGE/ON CONFLICT) but intended for clean or dev environments.
 *
 * @returns A Promise that resolves when the data creation is complete.
 */
async function createSampleData() {
    logger_js_1.logger.info('Creating sample data for development...');
    try {
        await createSampleEntities();
        await createSampleRelationships();
        await createSampleUsers();
        await createSampleInvestigations();
        logger_js_1.logger.info('Sample data created successfully');
    }
    catch (error) {
        logger_js_1.logger.error({ error }, 'Failed to create sample data');
    }
}
async function createSampleEntities() {
    const driver = (0, neo4j_js_1.getNeo4jDriver)();
    const session = driver.session();
    try {
        const entities = [
            {
                id: (0, crypto_1.randomUUID)(),
                type: 'PERSON',
                props: {
                    name: 'John Smith',
                    email: 'john.smith@example.com',
                    phone: '+1-555-0101',
                    location: 'New York, NY',
                    tenantId: 'tenant_1',
                },
            },
            {
                id: (0, crypto_1.randomUUID)(),
                type: 'ORGANIZATION',
                props: {
                    name: 'Tech Corp Industries',
                    industry: 'Technology',
                    headquarters: 'San Francisco, CA',
                    website: 'https://techcorp.example.com',
                    tenantId: 'tenant_1',
                },
            },
            {
                id: (0, crypto_1.randomUUID)(),
                type: 'EVENT',
                props: {
                    name: 'Data Breach Incident',
                    date: '2024-08-01',
                    severity: 'HIGH',
                    status: 'INVESTIGATING',
                    tenantId: 'tenant_1',
                },
            },
            {
                id: (0, crypto_1.randomUUID)(),
                type: 'LOCATION',
                props: {
                    name: 'Corporate Headquarters',
                    address: '100 Market Street, San Francisco, CA 94105',
                    latitude: 37.7749,
                    longitude: -122.4194,
                    tenantId: 'tenant_1',
                },
            },
            {
                id: (0, crypto_1.randomUUID)(),
                type: 'ASSET',
                props: {
                    name: 'Database Server DB-01',
                    type: 'SERVER',
                    ip_address: '192.168.1.100',
                    status: 'ACTIVE',
                    tenantId: 'tenant_1',
                },
            },
        ];
        for (const entity of entities) {
            try {
                await session.run(`
          MERGE (e:Entity:${entity.type} {id: $id})
          SET e.type = $type,
              e += $props,
              e.createdAt = datetime(),
              e.updatedAt = datetime()
        `, {
                    id: entity.id,
                    type: entity.type,
                    props: entity.props,
                });
            }
            catch (err) {
                logger_js_1.logger.error({ err, entity }, 'Failed to create sample entity');
                throw err;
            }
        }
        logger_js_1.logger.info(`Created ${entities.length} sample entities`);
    }
    finally {
        await session.close();
    }
}
async function createSampleRelationships() {
    const driver = (0, neo4j_js_1.getNeo4jDriver)();
    const session = driver.session();
    try {
        // Get some entities to create relationships between
        const entitiesResult = await session.run('MATCH (e:Entity) RETURN e LIMIT 5');
        const entities = entitiesResult.records.map((r) => r.get('e'));
        if (entities.length >= 2) {
            const relationships = [
                {
                    id: (0, crypto_1.randomUUID)(),
                    from: String(entities[0].properties.id),
                    to: String(entities[1].properties.id),
                    type: 'WORKS_FOR',
                    props: {
                        position: 'Senior Developer',
                        start_date: '2023-01-15',
                        tenantId: 'tenant_1',
                    },
                },
                {
                    id: (0, crypto_1.randomUUID)(),
                    from: String(entities[1].properties.id),
                    to: String(entities[2].properties.id),
                    type: 'INVOLVED_IN',
                    props: {
                        role: 'Primary Suspect',
                        confidence: 0.85,
                        tenantId: 'tenant_1',
                    },
                },
            ];
            for (const rel of relationships) {
                try {
                    await session.run(`
            MATCH (from:Entity {id: $from}), (to:Entity {id: $to})
            MERGE (from)-[r:${rel.type} {id: $id}]->(to)
            SET r += $props,
                r.createdAt = datetime()
          `, {
                        id: rel.id,
                        from: rel.from,
                        to: rel.to,
                        props: rel.props,
                    });
                }
                catch (err) {
                    logger_js_1.logger.error({ err, rel }, 'Failed to create sample relationship');
                    throw err;
                }
            }
            logger_js_1.logger.info(`Created ${relationships.length} sample relationships`);
        }
    }
    finally {
        await session.close();
    }
}
async function createSampleUsers() {
    const pool = (0, postgres_js_1.getPostgresPool)();
    try {
        const users = [
            {
                id: (0, crypto_1.randomUUID)(),
                email: 'admin@intelgraph.com',
                username: 'admin',
                role: 'ADMIN',
            },
            {
                id: (0, crypto_1.randomUUID)(),
                email: 'analyst@intelgraph.com',
                username: 'analyst',
                role: 'ANALYST',
            },
        ];
        for (const user of users) {
            await pool.query(`
        INSERT INTO users (id, email, username, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (email) DO NOTHING
      `, [user.id, user.email, user.username, user.role]);
        }
        logger_js_1.logger.info(`Created ${users.length} sample users`);
    }
    catch (error) {
        logger_js_1.logger.debug('Users table may not exist yet, skipping user creation');
    }
}
async function createSampleInvestigations() {
    const pool = (0, postgres_js_1.getPostgresPool)();
    try {
        const investigations = [
            {
                id: (0, crypto_1.randomUUID)(),
                name: 'Corporate Espionage Investigation',
                description: 'Investigating potential data theft and corporate espionage activities',
                status: 'ACTIVE',
            },
            {
                id: (0, crypto_1.randomUUID)(),
                name: 'Cybersecurity Incident Response',
                description: 'Response to recent data breach and security incident',
                status: 'IN_PROGRESS',
            },
        ];
        for (const investigation of investigations) {
            await pool.query(`
        INSERT INTO investigations (id, name, description, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, [
                investigation.id,
                investigation.name,
                investigation.description,
                investigation.status,
            ]);
        }
        logger_js_1.logger.info(`Created ${investigations.length} sample investigations`);
    }
    catch (error) {
        logger_js_1.logger.debug('Investigations table may not exist yet, skipping investigation creation');
    }
}
