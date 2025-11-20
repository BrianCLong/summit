/**
 * MySQL Metadata Extractor
 * Extracts schema and metadata from MySQL databases
 */

import { DiscoveredAsset, ExtractionResult, ExtractionStatistics } from '../types/discovery.js';

export interface MySQLConnection {
  query(sql: string, params?: any[]): Promise<any>;
  end(): Promise<void>;
}

export class MySQLExtractor {
  constructor(private connection: MySQLConnection) {}

  /**
   * Extract metadata from MySQL database
   */
  async extract(): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      const assets: DiscoveredAsset[] = [];

      // Extract tables
      const tables = await this.extractTables();
      assets.push(...tables);

      // Extract views
      const views = await this.extractViews();
      assets.push(...views);

      // Extract relationships
      const relationships = await this.extractRelationships();

      const statistics: ExtractionStatistics = {
        totalAssets: assets.length,
        assetsWithSchema: assets.filter((a) => a.schema !== null).length,
        assetsWithSamples: assets.filter((a) => a.sampleData.length > 0).length,
        relationshipsInferred: relationships.length,
        processingTimeMs: Date.now() - startTime,
      };

      return {
        sourceId: 'mysql',
        assets,
        relationships,
        statistics,
      };
    } catch (error) {
      throw new Error(`MySQL extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract table metadata
   */
  private async extractTables(): Promise<DiscoveredAsset[]> {
    const query = `
      SELECT
        TABLE_SCHEMA,
        TABLE_NAME,
        TABLE_TYPE,
        ENGINE,
        TABLE_ROWS,
        DATA_LENGTH,
        TABLE_COMMENT
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
        AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;

    const results = await this.connection.query(query);
    const assets: DiscoveredAsset[] = [];

    for (const row of results) {
      const columns = await this.extractColumns(row.TABLE_SCHEMA, row.TABLE_NAME);
      const sampleData = await this.extractSampleData(row.TABLE_SCHEMA, row.TABLE_NAME);

      assets.push({
        name: `${row.TABLE_SCHEMA}.${row.TABLE_NAME}`,
        type: 'TABLE',
        schema: {
          columns,
          primaryKey: columns.filter((c: any) => c.isPrimaryKey).map((c: any) => c.name),
          engine: row.ENGINE,
        },
        properties: {
          schema: row.TABLE_SCHEMA,
          tableName: row.TABLE_NAME,
          engine: row.ENGINE,
          rowCount: row.TABLE_ROWS,
          dataLength: row.DATA_LENGTH,
          comment: row.TABLE_COMMENT,
        },
        statistics: {
          rowCount: row.TABLE_ROWS,
          dataSize: row.DATA_LENGTH,
        },
        sampleData,
      });
    }

    return assets;
  }

  /**
   * Extract column metadata
   */
  private async extractColumns(schema: string, table: string): Promise<any[]> {
    const query = `
      SELECT
        c.COLUMN_NAME,
        c.DATA_TYPE,
        c.IS_NULLABLE,
        c.COLUMN_DEFAULT,
        c.CHARACTER_MAXIMUM_LENGTH,
        c.NUMERIC_PRECISION,
        c.NUMERIC_SCALE,
        c.COLUMN_COMMENT,
        c.COLUMN_KEY,
        c.EXTRA
      FROM information_schema.COLUMNS c
      WHERE c.TABLE_SCHEMA = ?
        AND c.TABLE_NAME = ?
      ORDER BY c.ORDINAL_POSITION
    `;

    const results = await this.connection.query(query, [schema, table]);

    return results.map((row: any) => ({
      name: row.COLUMN_NAME,
      dataType: row.DATA_TYPE,
      nullable: row.IS_NULLABLE === 'YES',
      defaultValue: row.COLUMN_DEFAULT,
      maxLength: row.CHARACTER_MAXIMUM_LENGTH,
      precision: row.NUMERIC_PRECISION,
      scale: row.NUMERIC_SCALE,
      comment: row.COLUMN_COMMENT,
      isPrimaryKey: row.COLUMN_KEY === 'PRI',
      isForeignKey: row.COLUMN_KEY === 'MUL',
      isAutoIncrement: row.EXTRA.includes('auto_increment'),
    }));
  }

  /**
   * Extract sample data
   */
  private async extractSampleData(schema: string, table: string, limit: number = 10): Promise<any[]> {
    try {
      const query = `SELECT * FROM \`${schema}\`.\`${table}\` LIMIT ?`;
      const results = await this.connection.query(query, [limit]);
      return results;
    } catch (error) {
      return [];
    }
  }

  /**
   * Extract views
   */
  private async extractViews(): Promise<DiscoveredAsset[]> {
    const query = `
      SELECT
        TABLE_SCHEMA,
        TABLE_NAME,
        VIEW_DEFINITION
      FROM information_schema.VIEWS
      WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;

    const results = await this.connection.query(query);
    const assets: DiscoveredAsset[] = [];

    for (const row of results) {
      const columns = await this.extractColumns(row.TABLE_SCHEMA, row.TABLE_NAME);

      assets.push({
        name: `${row.TABLE_SCHEMA}.${row.TABLE_NAME}`,
        type: 'VIEW',
        schema: {
          columns,
          definition: row.VIEW_DEFINITION,
        },
        properties: {
          schema: row.TABLE_SCHEMA,
          viewName: row.TABLE_NAME,
        },
        statistics: {},
        sampleData: [],
      });
    }

    return assets;
  }

  /**
   * Extract foreign key relationships
   */
  private async extractRelationships(): Promise<any[]> {
    const query = `
      SELECT
        kcu.TABLE_SCHEMA,
        kcu.TABLE_NAME,
        kcu.COLUMN_NAME,
        kcu.REFERENCED_TABLE_SCHEMA,
        kcu.REFERENCED_TABLE_NAME,
        kcu.REFERENCED_COLUMN_NAME,
        kcu.CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE kcu
      WHERE kcu.REFERENCED_TABLE_NAME IS NOT NULL
        AND kcu.TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
      ORDER BY kcu.TABLE_SCHEMA, kcu.TABLE_NAME
    `;

    const results = await this.connection.query(query);

    return results.map((row: any) => ({
      fromAsset: `${row.TABLE_SCHEMA}.${row.TABLE_NAME}`,
      toAsset: `${row.REFERENCED_TABLE_SCHEMA}.${row.REFERENCED_TABLE_NAME}`,
      type: 'FOREIGN_KEY',
      confidence: 1.0,
      metadata: {
        constraintName: row.CONSTRAINT_NAME,
        fromColumn: row.COLUMN_NAME,
        toColumn: row.REFERENCED_COLUMN_NAME,
      },
    }));
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.connection.end();
  }
}
