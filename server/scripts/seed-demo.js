#!/usr/bin/env ts-node
"use strict";
/**
 * IntelGraph Demo Seeder
 *
 * Seeds deterministic demo data for Golden Path E2E testing
 * Usage: npm run seed:demo
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const database_js_1 = require("../src/config/database.js");
class DemoSeeder {
    neo4j;
    postgres;
    data;
    constructor() {
        this.neo4j = (0, database_js_1.getNeo4jDriver)();
        this.postgres = (0, database_js_1.getPostgresPool)();
        // Load demo data
        const dataPath = (0, path_1.join)(process.cwd(), 'seeds', 'demo-v1.json');
        this.data = JSON.parse((0, fs_1.readFileSync)(dataPath, 'utf8'));
    }
    async seed() {
        console.log('🌱 Starting demo data seeding...');
        const startTime = Date.now();
        try {
            await this.clearExistingDemoData();
            await this.seedInvestigations();
            await this.seedEntities();
            await this.seedRelationships();
            await this.createConstraintsAndIndexes();
            const duration = Date.now() - startTime;
            console.log(`✅ Demo seeding completed in ${duration}ms`);
            console.log(`   • ${this.data.investigations.length} investigations`);
            console.log(`   • ${this.data.entities.length} entities`);
            console.log(`   • ${this.data.relationships.length} relationships`);
        }
        catch (error) {
            console.error('❌ Demo seeding failed:', error);
            throw error;
        }
    }
    async clearExistingDemoData() {
        console.log('🧹 Clearing existing demo data...');
        const session = this.neo4j.session();
        try {
            // Clear relationships first to avoid constraint violations
            await session.run(`
        MATCH (r:Relationship)
        WHERE r.investigationId = 'demo-investigation-001'
        DELETE r
      `);
            await session.run(`
        MATCH (e:Entity)
        WHERE e.investigationId = 'demo-investigation-001'
        DELETE e
      `);
            await session.run(`
        MATCH (i:Investigation)
        WHERE i.id = 'demo-investigation-001'
        DELETE i
      `);
            // Clear PostgreSQL data
            await this.postgres.query(`
        DELETE FROM investigations WHERE id = 'demo-investigation-001'
      `);
        }
        finally {
            await session.close();
        }
    }
    async seedInvestigations() {
        console.log('🔍 Seeding investigations...');
        for (const investigation of this.data.investigations) {
            // Neo4j
            const session = this.neo4j.session();
            try {
                await session.run(`
          CREATE (i:Investigation {
            id: $id,
            title: $title,
            description: $description,
            status: $status,
            sensitivity: $sensitivity,
            createdBy: $createdBy,
            createdAt: $createdAt,
            updatedAt: $createdAt
          })
        `, investigation);
            }
            finally {
                await session.close();
            }
            // PostgreSQL
            await this.postgres.query(`
        INSERT INTO investigations (
          id, title, description, status, sensitivity, 
          created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          sensitivity = EXCLUDED.sensitivity,
          updated_at = EXCLUDED.updated_at
      `, [
                investigation.id,
                investigation.title,
                investigation.description,
                investigation.status,
                investigation.sensitivity,
                investigation.createdBy,
                investigation.createdAt,
            ]);
        }
    }
    async seedEntities() {
        console.log('🎯 Seeding entities...');
        for (const entity of this.data.entities) {
            const session = this.neo4j.session();
            try {
                await session.run(`
          CREATE (e:Entity {
            id: $id,
            investigationId: $investigationId,
            type: $type,
            label: $label,
            description: $description,
            properties: $properties,
            confidence: $confidence,
            source: $source,
            createdBy: $createdBy,
            createdAt: datetime(),
            updatedAt: datetime()
          })
        `, {
                    ...entity,
                    properties: JSON.stringify(entity.properties),
                });
                // Create relationship to investigation
                await session.run(`
          MATCH (e:Entity {id: $entityId})
          MATCH (i:Investigation {id: $investigationId})
          CREATE (e)-[:BELONGS_TO]->(i)
        `, {
                    entityId: entity.id,
                    investigationId: entity.investigationId,
                });
            }
            finally {
                await session.close();
            }
        }
    }
    async seedRelationships() {
        console.log('🔗 Seeding relationships...');
        for (const relationship of this.data.relationships) {
            const session = this.neo4j.session();
            try {
                await session.run(`
          MATCH (from:Entity {id: $fromEntityId})
          MATCH (to:Entity {id: $toEntityId})
          CREATE (r:Relationship {
            id: $id,
            investigationId: $investigationId,
            fromEntityId: $fromEntityId,
            toEntityId: $toEntityId,
            type: $type,
            label: $label,
            description: $description,
            properties: $properties,
            confidence: $confidence,
            source: $source,
            createdBy: $createdBy,
            createdAt: datetime(),
            updatedAt: datetime()
          })
          CREATE (from)-[:RELATIONSHIP {
            id: $id,
            type: $type,
            label: $label,
            properties: $properties
          }]->(to)
        `, {
                    ...relationship,
                    properties: JSON.stringify(relationship.properties),
                });
            }
            finally {
                await session.close();
            }
        }
    }
    async createConstraintsAndIndexes() {
        console.log('📊 Creating constraints and indexes...');
        const session = this.neo4j.session();
        try {
            // Create constraints
            const constraints = [
                'CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE',
                'CREATE CONSTRAINT investigation_id_unique IF NOT EXISTS FOR (i:Investigation) REQUIRE i.id IS UNIQUE',
                'CREATE CONSTRAINT relationship_id_unique IF NOT EXISTS FOR (r:Relationship) REQUIRE r.id IS UNIQUE',
            ];
            for (const constraint of constraints) {
                try {
                    await session.run(constraint);
                }
                catch (error) {
                    // Constraint might already exist
                    if (!error.message.includes('already exists')) {
                        throw error;
                    }
                }
            }
            // Create indexes for performance
            const indexes = [
                'CREATE INDEX entity_investigation_idx IF NOT EXISTS FOR (e:Entity) ON (e.investigationId)',
                'CREATE INDEX entity_type_idx IF NOT EXISTS FOR (e:Entity) ON (e.type)',
                'CREATE INDEX relationship_type_idx IF NOT EXISTS FOR (r:Relationship) ON (r.type)',
                'CREATE INDEX relationship_investigation_idx IF NOT EXISTS FOR (r:Relationship) ON (r.investigationId)',
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
        }
        finally {
            await session.close();
        }
    }
    async close() {
        await this.neo4j.close();
        await this.postgres.end();
    }
}
// CLI execution
async function main() {
    const seeder = new DemoSeeder();
    try {
        await seeder.seed();
        console.log('🎉 Demo data ready for Golden Path testing!');
    }
    catch (error) {
        console.error('💥 Seeding failed:', error);
        process.exit(1);
    }
    finally {
        await seeder.close();
    }
}
if (require.main === module) {
    main();
}
exports.default = DemoSeeder;
