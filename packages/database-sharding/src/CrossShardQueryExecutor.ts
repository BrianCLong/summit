import { trace } from '@opentelemetry/api';
import pino from 'pino';
import { QueryDistributor } from './QueryDistributor';
import { ShardedQuery, CrossShardQueryResult } from './types';

const logger = pino({ name: 'CrossShardQueryExecutor' });
const tracer = trace.getTracer('database-sharding');

/**
 * Advanced cross-shard query optimization and execution
 */
export class CrossShardQueryExecutor {
  constructor(private distributor: QueryDistributor) {}

  /**
   * Execute JOIN across shards with optimization
   */
  async executeJoin<T = any>(
    leftQuery: ShardedQuery,
    rightQuery: ShardedQuery,
    joinKey: string,
    joinType: 'inner' | 'left' | 'right' | 'full' = 'inner'
  ): Promise<T[]> {
    const span = tracer.startSpan('CrossShardQueryExecutor.executeJoin');

    try {
      // Execute both queries
      const [leftResult, rightResult] = await Promise.all([
        this.distributor.broadcast(leftQuery),
        this.distributor.broadcast(rightQuery),
      ]);

      // Perform in-memory join
      const joined = this.performJoin(
        leftResult.rows,
        rightResult.rows,
        joinKey,
        joinType
      );

      span.setAttributes({
        'left.rows': leftResult.rows.length,
        'right.rows': rightResult.rows.length,
        'result.rows': joined.length,
        'join.type': joinType,
      });

      return joined as T[];
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Execute aggregation across shards
   */
  async executeAggregation<T = any>(
    query: ShardedQuery,
    aggregations: {
      field: string;
      function: 'sum' | 'avg' | 'min' | 'max' | 'count';
    }[]
  ): Promise<T> {
    const span = tracer.startSpan('CrossShardQueryExecutor.executeAggregation');

    try {
      // Execute query on all shards
      const result = await this.distributor.broadcast(query);

      // Combine aggregations
      const aggregated: any = {};

      for (const agg of aggregations) {
        const values = result.rows.map((row: any) => row[agg.field]);

        switch (agg.function) {
          case 'sum':
            aggregated[agg.field] = values.reduce(
              (acc: number, val: number) => acc + (val || 0),
              0
            );
            break;
          case 'avg':
            const sum = values.reduce(
              (acc: number, val: number) => acc + (val || 0),
              0
            );
            aggregated[agg.field] = sum / values.length;
            break;
          case 'min':
            aggregated[agg.field] = Math.min(...values.filter((v) => v != null));
            break;
          case 'max':
            aggregated[agg.field] = Math.max(...values.filter((v) => v != null));
            break;
          case 'count':
            aggregated[agg.field] = values.filter((v) => v != null).length;
            break;
        }
      }

      span.setAttributes({
        'aggregations.count': aggregations.length,
        'shards.queried': result.mergedFrom.length,
      });

      return aggregated as T;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Execute sorted query across shards with limit/offset
   */
  async executeSortedQuery<T = any>(
    query: ShardedQuery,
    sortBy: string,
    order: 'asc' | 'desc' = 'asc',
    limit?: number,
    offset?: number
  ): Promise<T[]> {
    const span = tracer.startSpan('CrossShardQueryExecutor.executeSortedQuery');

    try {
      // Execute query on all shards
      const result = await this.distributor.broadcast(query);

      // Sort combined results
      const sorted = result.rows.sort((a: any, b: any) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];

        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
      });

      // Apply limit and offset
      const start = offset || 0;
      const end = limit ? start + limit : undefined;
      const paginated = sorted.slice(start, end);

      span.setAttributes({
        'total.rows': sorted.length,
        'result.rows': paginated.length,
        'sort.field': sortBy,
        'sort.order': order,
      });

      return paginated as T[];
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Execute GROUP BY across shards
   */
  async executeGroupBy<T = any>(
    query: ShardedQuery,
    groupByFields: string[],
    aggregations: {
      field: string;
      function: 'sum' | 'avg' | 'min' | 'max' | 'count';
      alias?: string;
    }[]
  ): Promise<T[]> {
    const span = tracer.startSpan('CrossShardQueryExecutor.executeGroupBy');

    try {
      // Execute query on all shards
      const result = await this.distributor.broadcast(query);

      // Group results
      const groups = new Map<string, any[]>();

      for (const row of result.rows) {
        const groupKey = groupByFields.map((field) => row[field]).join('|');

        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }

        groups.get(groupKey)!.push(row);
      }

      // Aggregate each group
      const aggregated: any[] = [];

      for (const [groupKey, rows] of groups.entries()) {
        const groupValues = groupByFields.reduce((acc, field, index) => {
          acc[field] = groupKey.split('|')[index];
          return acc;
        }, {} as any);

        for (const agg of aggregations) {
          const values = rows.map((row) => row[agg.field]);
          const alias = agg.alias || `${agg.function}_${agg.field}`;

          switch (agg.function) {
            case 'sum':
              groupValues[alias] = values.reduce(
                (acc, val) => acc + (val || 0),
                0
              );
              break;
            case 'avg':
              const sum = values.reduce((acc, val) => acc + (val || 0), 0);
              groupValues[alias] = sum / values.length;
              break;
            case 'min':
              groupValues[alias] = Math.min(...values.filter((v) => v != null));
              break;
            case 'max':
              groupValues[alias] = Math.max(...values.filter((v) => v != null));
              break;
            case 'count':
              groupValues[alias] = values.filter((v) => v != null).length;
              break;
          }
        }

        aggregated.push(groupValues);
      }

      span.setAttributes({
        'groups.count': groups.size,
        'aggregations.count': aggregations.length,
      });

      return aggregated as T[];
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Perform in-memory join
   */
  private performJoin(
    leftRows: any[],
    rightRows: any[],
    joinKey: string,
    joinType: 'inner' | 'left' | 'right' | 'full'
  ): any[] {
    const rightIndex = new Map<any, any[]>();

    // Build index on right table
    for (const rightRow of rightRows) {
      const key = rightRow[joinKey];
      if (!rightIndex.has(key)) {
        rightIndex.set(key, []);
      }
      rightIndex.get(key)!.push(rightRow);
    }

    const result: any[] = [];

    // Perform join
    for (const leftRow of leftRows) {
      const key = leftRow[joinKey];
      const matches = rightIndex.get(key);

      if (matches && matches.length > 0) {
        for (const rightRow of matches) {
          result.push({ ...leftRow, ...rightRow });
        }
      } else if (joinType === 'left' || joinType === 'full') {
        result.push(leftRow);
      }
    }

    // For full join, add unmatched right rows
    if (joinType === 'full') {
      const matchedKeys = new Set(leftRows.map((row) => row[joinKey]));
      for (const rightRow of rightRows) {
        if (!matchedKeys.has(rightRow[joinKey])) {
          result.push(rightRow);
        }
      }
    }

    return result;
  }
}
