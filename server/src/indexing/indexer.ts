import { ElasticsearchService } from '../search/elasticsearch';
import { Pool } from 'pg';
import neo4j, { Driver } from 'neo4j-driver';
import pino from 'pino';

export class Indexer {
  private elastic: ElasticsearchService;
  private logger = pino({ name: 'Indexer' });
  private pg: Pool;
  private neo4jDriver: Driver;

  constructor() {
    this.elastic = new ElasticsearchService();
    this.pg = new Pool({ connectionString: process.env.DATABASE_URL });
    this.neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || process.env.NEO4J_PASS || '',
      ),
    );
  }

  async initializeIndices() {
    const types = ['cases', 'iocs', 'reports', 'articles', 'entities'];
    const mapping = {
      properties: {
        title: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword', ignore_above: 256 },
          },
        },
        suggest: { type: 'completion' },
        description: { type: 'text' },
        status: { type: 'keyword' },
        createdAt: { type: 'date' },
        embedding_vector: { type: 'dense_vector', dims: 3072 },
      },
    };

    for (const type of types) {
      try {
        await this.elastic.createIndex({
          name: type,
          mappings: mapping,
          settings: {},
          aliases: [],
        } as any);
      } catch (e) {
        // Ignore if exists
      }
    }
  }

  async indexAll() {
    await this.initializeIndices();
    await this.indexCases();
    await this.indexEntities();
  }

  async indexCases() {
    this.logger.info('Indexing cases...');
    const client = await this.pg.connect();
    try {
      const res = await client.query(
        'SELECT id, title, description, status, created_at as "createdAt" FROM cases',
      );
      const ops: any[] = [];
      for (const row of res.rows) {
        ops.push({ index: { _index: 'cases', _id: row.id } });
        ops.push({
          ...row,
          suggest: { input: row.title },
        });
      }

      if (ops.length > 0) {
        await this.elastic.bulkIndex(ops);
      }
      this.logger.info(`Indexed ${res.rows.length} cases`);
    } catch (err) {
      // If table doesn't exist, just log warning
      this.logger.warn({ err }, 'Error indexing cases (table might not exist)');
    } finally {
      client.release();
    }
  }

  async indexEntities() {
    this.logger.info('Indexing entities...');
    const client = await this.pg.connect();
    try {
      const res = await client.query(
        'SELECT id, type, name, properties, created_at as "createdAt" FROM entities',
      );
      const ops: any[] = [];
      for (const row of res.rows) {
        const indexName = (row.type || 'entities').toLowerCase() + 's';
        const doc = {
          id: row.id,
          title: row.name,
          description:
            row.properties.description || row.properties.content || '',
          status: row.properties.status || 'active',
          createdAt: row.createdAt,
          type: row.type,
          ...row.properties,
          suggest: { input: row.name },
        };

        ops.push({ index: { _index: indexName, _id: row.id } });
        ops.push(doc);
      }

      if (ops.length > 0) {
        await this.elastic.bulkIndex(ops);
      }
      this.logger.info(`Indexed ${res.rows.length} entities`);
    } catch (err) {
      this.logger.warn(
        { err },
        'Error indexing entities (table might not exist)',
      );
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pg.end();
    await this.neo4jDriver.close();
  }
}
