#!/usr/bin/env ts-node
/**
 * IntelGraph Seed Data Generator
 * 
 * Creates realistic test data for performance testing and development.
 * Generates 10k+ entities and 100k+ relationships with realistic distributions.
 */

import { Driver } from 'neo4j-driver';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { connectNeo4j, connectPostgres, connectRedis } from '../src/config/database.js';
import config from '../src/config/index.js';

interface SeedOptions {
  entities: number;
  relationships: number;
  investigations: number;
  users: number;
  clear: boolean;
  benchmark: boolean;
}

interface SeedStats {
  entitiesCreated: number;
  relationshipsCreated: number;
  investigationsCreated: number;
  usersCreated: number;
  executionTime: number;
  queriesPerSecond: number;
}

class SeedDataGenerator {
  private neo4j: Driver;
  private postgres: Pool;
  private redis: Redis | null;
  private stats: SeedStats;

  constructor() {
    this.stats = {
      entitiesCreated: 0,
      relationshipsCreated: 0,
      investigationsCreated: 0,
      usersCreated: 0,
      executionTime: 0,
      queriesPerSecond: 0
    };
  }

  async initialize(): Promise<void> {
    console.log('🔌 Connecting to databases...');
    this.neo4j = await connectNeo4j();
    this.postgres = await connectPostgres();
    this.redis = await connectRedis();
    console.log('✅ Database connections established');
  }

  async seed(options: SeedOptions): Promise<SeedStats> {
    const startTime = Date.now();
    
    if (options.clear) {
      await this.clearData();
    }

    console.log(`🌱 Seeding data: ${options.entities} entities, ${options.relationships} relationships...`);

    await this.seedUsers(options.users);
    await this.seedInvestigations(options.investigations);
    await this.seedEntities(options.entities);
    await this.seedRelationships(options.relationships);
    
    if (options.benchmark) {
      await this.runPerformanceTests();
    }

    this.stats.executionTime = Date.now() - startTime;
    this.stats.queriesPerSecond = this.calculateQPS();

    return this.stats;
  }

  private async clearData(): Promise<void> {
    console.log('🧹 Clearing existing data...');
    
    const neo4jSession = this.neo4j.session();
    try {
      await neo4jSession.run('MATCH (n) DETACH DELETE n');
      console.log('  ✅ Neo4j data cleared');
    } finally {
      await neo4jSession.close();
    }

    const pgClient = await this.postgres.connect();
    try {
      await pgClient.query('TRUNCATE TABLE users, audit_logs, user_sessions, analysis_results CASCADE');
      console.log('  ✅ PostgreSQL data cleared');
    } finally {
      pgClient.release();
    }

    if (this.redis) {
      await this.redis.flushdb();
      console.log('  ✅ Redis data cleared');
    }
  }

  private async seedUsers(count: number): Promise<void> {
    console.log(`👥 Creating ${count} users...`);
    
    const pgClient = await this.postgres.connect();
    try {
      const roles = ['admin', 'senior_analyst', 'analyst', 'viewer'];
      const tenants = ['tenant_1', 'tenant_2', 'tenant_3'];
      
      for (let i = 0; i < count; i++) {
        const role = roles[i % roles.length];
        const tenant = tenants[i % tenants.length];
        
        await pgClient.query(`
          INSERT INTO users (email, username, password_hash, first_name, last_name, role, tenant_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          `user${i}@test.com`,
          `user${i}`,
          '$2b$12$dummy.hash.for.testing',
          `FirstName${i}`,
          `LastName${i}`,
          role,
          tenant
        ]);
      }
      
      this.stats.usersCreated = count;
      console.log(`  ✅ Created ${count} users`);
    } finally {
      pgClient.release();
    }
  }

  private async seedInvestigations(count: number): Promise<void> {
    console.log(`🔍 Creating ${count} investigations...`);
    
    const neo4jSession = this.neo4j.session();
    try {
      const statuses = ['draft', 'active', 'review', 'completed'];
      const priorities = ['low', 'medium', 'high', 'critical'];
      
      for (let i = 0; i < count; i++) {
        const status = statuses[i % statuses.length];
        const priority = priorities[i % priorities.length];
        
        await neo4jSession.run(`
          CREATE (inv:Investigation {
            id: $id,
            title: $title,
            description: $description,
            status: $status,
            priority: $priority,
            createdAt: datetime(),
            updatedAt: datetime(),
            tenantId: $tenantId
          })
        `, {
          id: `investigation_${i}`,
          title: `Investigation ${i}`,
          description: `Generated investigation ${i} for testing purposes`,
          status,
          priority,
          tenantId: `tenant_${i % 3 + 1}`
        });
      }
      
      this.stats.investigationsCreated = count;
      console.log(`  ✅ Created ${count} investigations`);
    } finally {
      await neo4jSession.close();
    }
  }

  private async seedEntities(count: number): Promise<void> {
    console.log(`🏗️  Creating ${count} entities...`);
    
    const neo4jSession = this.neo4j.session();
    try {
      const entityTypes = ['PERSON', 'ORGANIZATION', 'LOCATION', 'EVENT', 'DOCUMENT', 'EMAIL', 'PHONE_NUMBER'];
      const batchSize = 1000;
      
      for (let batch = 0; batch < Math.ceil(count / batchSize); batch++) {
        const entities = [];
        const startIdx = batch * batchSize;
        const endIdx = Math.min(startIdx + batchSize, count);
        
        for (let i = startIdx; i < endIdx; i++) {
          const entityType = entityTypes[i % entityTypes.length];
          
          entities.push({
            id: `entity_${i}`,
            uuid: `uuid_${i}`,
            type: entityType,
            label: `${entityType}_${i}`,
            description: `Generated ${entityType.toLowerCase()} ${i} for testing`,
            properties: JSON.stringify({
              confidence: Math.random(),
              source: 'seed_data',
              category: `category_${i % 10}`
            }),
            createdAt: new Date().toISOString(),
            tenantId: `tenant_${i % 3 + 1}`,
            investigationId: `investigation_${i % Math.min(this.stats.investigationsCreated, 100)}`
          });
        }
        
        await neo4jSession.run(`
          UNWIND $entities AS entity
          CREATE (e:Entity {
            id: entity.id,
            uuid: entity.uuid,
            type: entity.type,
            label: entity.label,
            description: entity.description,
            properties: entity.properties,
            createdAt: datetime(entity.createdAt),
            tenantId: entity.tenantId,
            investigationId: entity.investigationId
          })
        `, { entities });
        
        console.log(`  📦 Batch ${batch + 1}/${Math.ceil(count / batchSize)} completed`);
      }
      
      this.stats.entitiesCreated = count;
      console.log(`  ✅ Created ${count} entities`);
    } finally {
      await neo4jSession.close();
    }
  }

  private async seedRelationships(count: number): Promise<void> {
    console.log(`🔗 Creating ${count} relationships...`);
    
    const neo4jSession = this.neo4j.session();
    try {
      const relationshipTypes = ['KNOWS', 'WORKS_FOR', 'LOCATED_AT', 'RELATED_TO', 'COMMUNICATES_WITH'];
      const batchSize = 1000;
      
      for (let batch = 0; batch < Math.ceil(count / batchSize); batch++) {
        const relationships = [];
        const startIdx = batch * batchSize;
        const endIdx = Math.min(startIdx + batchSize, count);
        
        for (let i = startIdx; i < endIdx; i++) {
          const relType = relationshipTypes[i % relationshipTypes.length];
          const sourceId = `entity_${i % this.stats.entitiesCreated}`;
          const targetId = `entity_${(i + 1) % this.stats.entitiesCreated}`;
          
          relationships.push({
            id: `relationship_${i}`,
            type: relType,
            sourceId,
            targetId,
            label: `${relType}_${i}`,
            confidence: Math.random(),
            weight: Math.random() * 10,
            tenantId: `tenant_${i % 3 + 1}`
          });
        }
        
        await neo4jSession.run(`
          UNWIND $relationships AS rel
          MATCH (source:Entity {id: rel.sourceId})
          MATCH (target:Entity {id: rel.targetId})
          CREATE (source)-[r:RELATIONSHIP {
            id: rel.id,
            type: rel.type,
            label: rel.label,
            confidence: rel.confidence,
            weight: rel.weight,
            tenantId: rel.tenantId,
            createdAt: datetime()
          }]->(target)
        `, { relationships });
        
        console.log(`  🔗 Batch ${batch + 1}/${Math.ceil(count / batchSize)} completed`);
      }
      
      this.stats.relationshipsCreated = count;
      console.log(`  ✅ Created ${count} relationships`);
    } finally {
      await neo4jSession.close();
    }
  }

  private async runPerformanceTests(): Promise<void> {
    console.log('🏎️  Running performance benchmarks...');
    
    const neo4jSession = this.neo4j.session();
    try {
      const tests = [
        {
          name: 'Entity lookup by ID',
          query: 'MATCH (e:Entity {id: $id}) RETURN e',
          params: { id: 'entity_100' }
        },
        {
          name: 'Relationship traversal (depth 2)',
          query: 'MATCH (e:Entity {id: $id})-[r1]->(n1)-[r2]->(n2) RETURN e, r1, n1, r2, n2 LIMIT 100',
          params: { id: 'entity_100' }
        },
        {
          name: 'Full-text search',
          query: 'CALL db.index.fulltext.queryNodes("entity_search", $query) YIELD node, score RETURN node, score LIMIT 50',
          params: { query: 'entity*' }
        },
        {
          name: 'Investigation entities count',
          query: 'MATCH (e:Entity {investigationId: $invId}) RETURN count(e)',
          params: { invId: 'investigation_1' }
        },
        {
          name: 'Complex graph pattern',
          query: `
            MATCH (e1:Entity)-[r1:RELATIONSHIP]->(e2:Entity)-[r2:RELATIONSHIP]->(e3:Entity)
            WHERE e1.tenantId = $tenantId
            RETURN e1, r1, e2, r2, e3
            LIMIT 100
          `,
          params: { tenantId: 'tenant_1' }
        }
      ];

      for (const test of tests) {
        const startTime = Date.now();
        const result = await neo4jSession.run(test.query, test.params);
        const duration = Date.now() - startTime;
        
        console.log(`  ⚡ ${test.name}: ${duration}ms (${result.records.length} records)`);
        
        // SLO validation: queries should complete under 1.5s
        if (duration > 1500) {
          console.warn(`  ⚠️  SLO VIOLATION: ${test.name} took ${duration}ms (>1500ms)`);
        }
      }
    } finally {
      await neo4jSession.close();
    }
  }

  private calculateQPS(): number {
    const totalQueries = this.stats.entitiesCreated + this.stats.relationshipsCreated + 
                        this.stats.investigationsCreated + this.stats.usersCreated;
    return Math.round(totalQueries / (this.stats.executionTime / 1000));
  }

  async cleanup(): Promise<void> {
    await this.neo4j.close();
    await this.postgres.end();
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}

// CLI Interface
async function main() {
  const options: SeedOptions = {
    entities: parseInt(process.env.SEED_ENTITIES || '10000'),
    relationships: parseInt(process.env.SEED_RELATIONSHIPS || '50000'),
    investigations: parseInt(process.env.SEED_INVESTIGATIONS || '100'),
    users: parseInt(process.env.SEED_USERS || '50'),
    clear: process.env.SEED_CLEAR === 'true',
    benchmark: process.env.SEED_BENCHMARK !== 'false'
  };

  const generator = new SeedDataGenerator();
  
  try {
    await generator.initialize();
    const stats = await generator.seed(options);
    
    console.log('\\n📊 Seeding Complete:');
    console.log(`  👥 Users: ${stats.usersCreated}`);
    console.log(`  🔍 Investigations: ${stats.investigationsCreated}`);
    console.log(`  🏗️  Entities: ${stats.entitiesCreated}`);
    console.log(`  🔗 Relationships: ${stats.relationshipsCreated}`);
    console.log(`  ⏱️  Execution Time: ${stats.executionTime}ms`);
    console.log(`  🚀 Queries/Second: ${stats.queriesPerSecond}`);
    
    // Cache seed metadata in Redis
    if (generator['redis']) {
      await generator['redis'].set('seed:stats', JSON.stringify(stats));
      await generator['redis'].set('seed:timestamp', new Date().toISOString());
    }
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await generator.cleanup();
  }
}

if (require.main === module) {
  main();
}

export { SeedDataGenerator, type SeedOptions, type SeedStats };