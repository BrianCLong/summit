/**
 * Zone Map Manager for Query Pruning
 *
 * Zone maps store min/max values for data blocks to enable:
 * - Block pruning during query execution
 * - Reduced I/O by skipping irrelevant blocks
 * - Faster query performance on large datasets
 *
 * Similar to Snowflake's pruning but with more granular control
 */

import { Pool } from 'pg';

export interface ZoneMap {
  minValue: any;
  maxValue: any;
  nullCount: number;
  rowCount: number;
  distinctValues?: Set<any>;
  bloomFilter?: Uint8Array;
}

export interface ZoneMapEntry {
  blockId: string;
  columnName: string;
  minValue: any;
  maxValue: any;
  nullCount: number;
  rowCount: number;
  hasBloomFilter: boolean;
}

export class ZoneMapManager {
  private bloomFilterSize = 1024; // bits

  /**
   * Create zone map for a column block
   */
  createZoneMap(data: any[]): ZoneMap {
    const nonNull = data.filter((v) => v !== null && v !== undefined);

    if (nonNull.length === 0) {
      return {
        minValue: null,
        maxValue: null,
        nullCount: data.length,
        rowCount: data.length,
      };
    }

    const min = this.getMin(nonNull);
    const max = this.getMax(nonNull);
    const distinctValues = new Set(nonNull);

    // Create bloom filter for high-cardinality columns
    const bloomFilter =
      distinctValues.size > 100
        ? this.createBloomFilter(distinctValues)
        : undefined;

    return {
      minValue: min,
      maxValue: max,
      nullCount: data.length - nonNull.length,
      rowCount: data.length,
      distinctValues:
        distinctValues.size <= 100 ? distinctValues : undefined,
      bloomFilter,
    };
  }

  /**
   * Create zone maps table for a table
   */
  async createZoneMaps(
    pool: Pool,
    tableName: string,
    columns: string[],
  ): Promise<void> {
    const zoneMapTableSQL = `
      CREATE TABLE IF NOT EXISTS ${tableName}_zone_maps (
        id SERIAL PRIMARY KEY,
        block_id TEXT NOT NULL,
        column_name TEXT NOT NULL,
        min_value TEXT,
        max_value TEXT,
        null_count INTEGER NOT NULL,
        row_count INTEGER NOT NULL,
        distinct_values TEXT[],
        bloom_filter BYTEA,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_block_column (block_id, column_name),
        INDEX idx_min_max (column_name, min_value, max_value)
      );
    `;

    await pool.query(zoneMapTableSQL);
  }

  /**
   * Check if a value might exist in a block using zone map
   */
  mightContainValue(zoneMap: ZoneMap, value: any): boolean {
    // Check null case
    if (value === null || value === undefined) {
      return zoneMap.nullCount > 0;
    }

    // Check min/max bounds
    if (zoneMap.minValue !== null && value < zoneMap.minValue) {
      return false;
    }

    if (zoneMap.maxValue !== null && value > zoneMap.maxValue) {
      return false;
    }

    // Check distinct values set (for low cardinality)
    if (zoneMap.distinctValues) {
      return zoneMap.distinctValues.has(value);
    }

    // Check bloom filter (for high cardinality)
    if (zoneMap.bloomFilter) {
      return this.bloomFilterContains(zoneMap.bloomFilter, value);
    }

    // If no additional filters, assume it might exist
    return true;
  }

  /**
   * Prune blocks based on predicate
   */
  async pruneBlocks(
    pool: Pool,
    tableName: string,
    columnName: string,
    predicate: {
      operator: '=' | '>' | '>=' | '<' | '<=' | '!=' | 'IN' | 'BETWEEN';
      value: any;
      value2?: any;
    },
  ): Promise<string[]> {
    let whereClause = '';

    switch (predicate.operator) {
      case '=':
        whereClause = `min_value <= $1 AND max_value >= $1`;
        break;

      case '>':
        whereClause = `max_value > $1`;
        break;

      case '>=':
        whereClause = `max_value >= $1`;
        break;

      case '<':
        whereClause = `min_value < $1`;
        break;

      case '<=':
        whereClause = `min_value <= $1`;
        break;

      case '!=':
        // Can't prune for inequality
        whereClause = 'TRUE';
        break;

      case 'BETWEEN':
        whereClause = `max_value >= $1 AND min_value <= $2`;
        break;

      default:
        whereClause = 'TRUE';
    }

    const query = `
      SELECT DISTINCT block_id
      FROM ${tableName}_zone_maps
      WHERE column_name = '${columnName}'
        AND ${whereClause}
    `;

    const params =
      predicate.operator === 'BETWEEN'
        ? [predicate.value, predicate.value2]
        : [predicate.value];

    const result = await pool.query(query, params);
    return result.rows.map((row) => row.block_id);
  }

  /**
   * Get pruning statistics
   */
  async getPruningStats(
    pool: Pool,
    tableName: string,
    columnName: string,
  ): Promise<{
    totalBlocks: number;
    avgRowsPerBlock: number;
    minValueRange: { min: any; max: any };
    maxValueRange: { min: any; max: any };
  }> {
    const result = await pool.query(
      `
      SELECT
        COUNT(*) as total_blocks,
        AVG(row_count) as avg_rows_per_block,
        MIN(min_value) as overall_min,
        MAX(max_value) as overall_max
      FROM ${tableName}_zone_maps
      WHERE column_name = $1
    `,
      [columnName],
    );

    const row = result.rows[0];

    return {
      totalBlocks: parseInt(row.total_blocks),
      avgRowsPerBlock: parseFloat(row.avg_rows_per_block),
      minValueRange: { min: row.overall_min, max: row.overall_max },
      maxValueRange: { min: row.overall_min, max: row.overall_max },
    };
  }

  // Utility methods

  private getMin(values: any[]): any {
    return values.reduce((min, val) => (val < min ? val : min), values[0]);
  }

  private getMax(values: any[]): any {
    return values.reduce((max, val) => (val > max ? val : max), values[0]);
  }

  /**
   * Create a simple bloom filter
   */
  private createBloomFilter(values: Set<any>): Uint8Array {
    const filter = new Uint8Array(this.bloomFilterSize / 8);
    const hashCount = 3; // Number of hash functions

    for (const value of values) {
      const hashes = this.getHashes(value, hashCount);
      for (const hash of hashes) {
        const byteIndex = Math.floor(hash / 8);
        const bitIndex = hash % 8;
        filter[byteIndex] |= 1 << bitIndex;
      }
    }

    return filter;
  }

  /**
   * Check if bloom filter might contain value
   */
  private bloomFilterContains(filter: Uint8Array, value: any): boolean {
    const hashCount = 3;
    const hashes = this.getHashes(value, hashCount);

    for (const hash of hashes) {
      const byteIndex = Math.floor(hash / 8);
      const bitIndex = hash % 8;

      if ((filter[byteIndex] & (1 << bitIndex)) === 0) {
        return false; // Definitely not in set
      }
    }

    return true; // Might be in set
  }

  /**
   * Generate multiple hash values for bloom filter
   */
  private getHashes(value: any, count: number): number[] {
    const str = JSON.stringify(value);
    const hashes: number[] = [];

    for (let i = 0; i < count; i++) {
      let hash = 0;
      const seed = i * 31;

      for (let j = 0; j < str.length; j++) {
        hash = (hash * 31 + str.charCodeAt(j) + seed) % this.bloomFilterSize;
      }

      hashes.push(Math.abs(hash));
    }

    return hashes;
  }

  /**
   * Merge zone maps for multiple blocks
   */
  mergeZoneMaps(zoneMaps: ZoneMap[]): ZoneMap {
    if (zoneMaps.length === 0) {
      return {
        minValue: null,
        maxValue: null,
        nullCount: 0,
        rowCount: 0,
      };
    }

    const nonNullMaps = zoneMaps.filter((zm) => zm.minValue !== null);

    return {
      minValue:
        nonNullMaps.length > 0
          ? this.getMin(nonNullMaps.map((zm) => zm.minValue))
          : null,
      maxValue:
        nonNullMaps.length > 0
          ? this.getMax(nonNullMaps.map((zm) => zm.maxValue))
          : null,
      nullCount: zoneMaps.reduce((sum, zm) => sum + zm.nullCount, 0),
      rowCount: zoneMaps.reduce((sum, zm) => sum + zm.rowCount, 0),
    };
  }

  /**
   * Calculate zone map efficiency
   */
  calculatePruningEfficiency(
    totalBlocks: number,
    prunedBlocks: number,
  ): {
    blocksScanned: number;
    blocksPruned: number;
    pruningPercentage: number;
    ioReduction: number;
  } {
    const blocksPruned = totalBlocks - prunedBlocks;
    const pruningPercentage = (blocksPruned / totalBlocks) * 100;
    const ioReduction = blocksPruned;

    return {
      blocksScanned: prunedBlocks,
      blocksPruned,
      pruningPercentage,
      ioReduction,
    };
  }
}
