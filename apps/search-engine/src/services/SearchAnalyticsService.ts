import { Pool } from 'pg';
import { Redis } from 'redis';
import { createLogger, format, transports, Logger } from 'winston';

import { SearchQuery, SearchAnalytics } from '../types';

export interface QueryPerformance {
  query: string;
  avgExecutionTime: number;
  totalExecutions: number;
  successRate: number;
  avgResultCount: number;
  lastExecuted: Date;
}

export interface PopularQuery {
  query: string;
  executionCount: number;
  uniqueUsers: number;
  avgClickThroughRate: number;
}

export interface SearchMetrics {
  totalQueries: number;
  avgExecutionTime: number;
  successRate: number;
  topQueries: PopularQuery[];
  slowQueries: QueryPerformance[];
  failedQueries: number;
  cacheHitRate: number;
}

export class SearchAnalyticsService {
  private logger: Logger;
  private redis: Redis;

  constructor(
    private pg: Pool,
    redisClient: Redis,
  ) {
    this.redis = redisClient;

    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
      ),
      transports: [
        new transports.Console(),
        new transports.File({ filename: 'logs/search-analytics.log' }),
      ],
    });
  }

  /**
   * Track a search query execution
   */
  async trackQuery(
    userId: string,
    query: SearchQuery,
    resultCount: number,
    executionTime: number,
    success: boolean = true,
    sessionId?: string,
  ): Promise<string> {
    const queryId = this.generateQueryId();

    try {
      // Store in PostgreSQL for long-term analysis
      await this.pg.query(
        `
        INSERT INTO search_analytics (
          query_id, user_id, query_text, query_type,
          filters, result_count, execution_time,
          success, session_id, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `,
        [
          queryId,
          userId,
          query.query,
          query.searchType || 'fulltext',
          JSON.stringify(query.filters || {}),
          resultCount,
          executionTime,
          success,
          sessionId,
        ],
      );

      // Update real-time metrics in Redis
      await this.updateRealTimeMetrics(
        query.query,
        executionTime,
        resultCount,
        success,
      );

      this.logger.debug('Query tracked', {
        queryId,
        query: query.query,
        resultCount,
        executionTime,
      });

      return queryId;
    } catch (error) {
      this.logger.error('Failed to track query', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Track user click on a search result
   */
  async trackClick(
    queryId: string,
    resultId: string,
    position: number,
  ): Promise<void> {
    try {
      await this.pg.query(
        `
        INSERT INTO search_clicks (
          query_id, result_id, position, timestamp
        ) VALUES ($1, $2, $3, NOW())
        `,
        [queryId, resultId, position],
      );

      // Update click-through rate in Redis
      const key = `search:ctr:${queryId}`;
      await this.redis.incr(key);
      await this.redis.expire(key, 86400); // 24 hours

      this.logger.debug('Click tracked', { queryId, resultId, position });
    } catch (error) {
      this.logger.error('Failed to track click', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Track query refinement
   */
  async trackRefinement(
    queryId: string,
    originalQuery: string,
    refinedQuery: string,
    refinementType: 'filter' | 'spelling' | 'suggestion' | 'facet',
  ): Promise<void> {
    try {
      await this.pg.query(
        `
        INSERT INTO search_refinements (
          query_id, original_query, refined_query,
          refinement_type, timestamp
        ) VALUES ($1, $2, $3, $4, NOW())
        `,
        [queryId, originalQuery, refinedQuery, refinementType],
      );

      this.logger.debug('Refinement tracked', {
        queryId,
        refinementType,
      });
    } catch (error) {
      this.logger.error('Failed to track refinement', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get search metrics for a time period
   */
  async getMetrics(
    startDate: Date,
    endDate: Date,
    userId?: string,
  ): Promise<SearchMetrics> {
    try {
      const whereClause = userId
        ? 'WHERE timestamp BETWEEN $1 AND $2 AND user_id = $3'
        : 'WHERE timestamp BETWEEN $1 AND $2';
      const params = userId ? [startDate, endDate, userId] : [startDate, endDate];

      // Get overall metrics
      const overallResult = await this.pg.query(
        `
        SELECT
          COUNT(*) as total_queries,
          AVG(execution_time) as avg_execution_time,
          SUM(CASE WHEN success = true THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate,
          SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_queries
        FROM search_analytics
        ${whereClause}
        `,
        params,
      );

      const overall = overallResult.rows[0];

      // Get top queries
      const topQueriesResult = await this.pg.query(
        `
        SELECT
          query_text as query,
          COUNT(*) as execution_count,
          COUNT(DISTINCT user_id) as unique_users,
          COALESCE(
            (SELECT COUNT(*)::float / COUNT(DISTINCT sa.query_id)
             FROM search_clicks sc
             WHERE sc.query_id IN (
               SELECT query_id FROM search_analytics
               WHERE query_text = sa.query_text
             )),
            0
          ) as avg_click_through_rate
        FROM search_analytics sa
        ${whereClause}
        GROUP BY query_text
        ORDER BY execution_count DESC
        LIMIT 10
        `,
        params,
      );

      // Get slow queries
      const slowQueriesResult = await this.pg.query(
        `
        SELECT
          query_text as query,
          AVG(execution_time) as avg_execution_time,
          COUNT(*) as total_executions,
          SUM(CASE WHEN success = true THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate,
          AVG(result_count) as avg_result_count,
          MAX(timestamp) as last_executed
        FROM search_analytics
        ${whereClause}
        GROUP BY query_text
        HAVING AVG(execution_time) > 1000
        ORDER BY avg_execution_time DESC
        LIMIT 10
        `,
        params,
      );

      // Get cache hit rate from Redis
      const cacheHitRate = await this.getCacheHitRate();

      return {
        totalQueries: parseInt(overall.total_queries),
        avgExecutionTime: parseFloat(overall.avg_execution_time) || 0,
        successRate: parseFloat(overall.success_rate) || 0,
        failedQueries: parseInt(overall.failed_queries) || 0,
        topQueries: topQueriesResult.rows.map((row) => ({
          query: row.query,
          executionCount: parseInt(row.execution_count),
          uniqueUsers: parseInt(row.unique_users),
          avgClickThroughRate: parseFloat(row.avg_click_through_rate),
        })),
        slowQueries: slowQueriesResult.rows.map((row) => ({
          query: row.query,
          avgExecutionTime: parseFloat(row.avg_execution_time),
          totalExecutions: parseInt(row.total_executions),
          successRate: parseFloat(row.success_rate),
          avgResultCount: parseFloat(row.avg_result_count),
          lastExecuted: new Date(row.last_executed),
        })),
        cacheHitRate,
      };
    } catch (error) {
      this.logger.error('Failed to get metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get query suggestions based on popular searches
   */
  async getQuerySuggestions(
    prefix: string,
    limit: number = 10,
  ): Promise<string[]> {
    try {
      const result = await this.pg.query(
        `
        SELECT DISTINCT query_text
        FROM search_analytics
        WHERE query_text ILIKE $1 AND success = true
        GROUP BY query_text
        ORDER BY COUNT(*) DESC
        LIMIT $2
        `,
        [`${prefix}%`, limit],
      );

      return result.rows.map((row) => row.query_text);
    } catch (error) {
      this.logger.error('Failed to get query suggestions', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get personalized query suggestions for a user
   */
  async getPersonalizedSuggestions(
    userId: string,
    limit: number = 10,
  ): Promise<string[]> {
    try {
      const result = await this.pg.query(
        `
        SELECT query_text, COUNT(*) as frequency
        FROM search_analytics
        WHERE user_id = $1 AND success = true
        GROUP BY query_text
        ORDER BY MAX(timestamp) DESC, frequency DESC
        LIMIT $2
        `,
        [userId, limit],
      );

      return result.rows.map((row) => row.query_text);
    } catch (error) {
      this.logger.error('Failed to get personalized suggestions', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Update real-time metrics in Redis
   */
  private async updateRealTimeMetrics(
    query: string,
    executionTime: number,
    resultCount: number,
    success: boolean,
  ): Promise<void> {
    const key = `search:metrics:${this.getDateKey()}`;

    try {
      await this.redis.hIncrBy(key, 'total_queries', 1);
      await this.redis.hIncrBy(key, 'total_execution_time', executionTime);
      await this.redis.hIncrBy(key, 'total_results', resultCount);

      if (success) {
        await this.redis.hIncrBy(key, 'successful_queries', 1);
      } else {
        await this.redis.hIncrBy(key, 'failed_queries', 1);
      }

      await this.redis.expire(key, 604800); // 7 days

      // Track popular queries
      const queryKey = `search:popular:${this.getDateKey()}`;
      await this.redis.zIncrBy(queryKey, 1, query);
      await this.redis.expire(queryKey, 604800);
    } catch (error) {
      this.logger.warn('Failed to update real-time metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get cache hit rate
   */
  private async getCacheHitRate(): Promise<number> {
    try {
      const key = `search:cache:${this.getDateKey()}`;
      const hits = await this.redis.hGet(key, 'hits');
      const misses = await this.redis.hGet(key, 'misses');

      const hitsNum = parseInt(hits || '0');
      const missesNum = parseInt(misses || '0');
      const total = hitsNum + missesNum;

      return total > 0 ? hitsNum / total : 0;
    } catch (error) {
      this.logger.warn('Failed to get cache hit rate', {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Track cache hit
   */
  async trackCacheHit(hit: boolean): Promise<void> {
    const key = `search:cache:${this.getDateKey()}`;
    const field = hit ? 'hits' : 'misses';

    try {
      await this.redis.hIncrBy(key, field, 1);
      await this.redis.expire(key, 604800); // 7 days
    } catch (error) {
      this.logger.warn('Failed to track cache hit', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get zero-result queries for improvement
   */
  async getZeroResultQueries(limit: number = 20): Promise<PopularQuery[]> {
    try {
      const result = await this.pg.query(
        `
        SELECT
          query_text as query,
          COUNT(*) as execution_count,
          COUNT(DISTINCT user_id) as unique_users,
          0 as avg_click_through_rate
        FROM search_analytics
        WHERE result_count = 0
        GROUP BY query_text
        ORDER BY execution_count DESC
        LIMIT $1
        `,
        [limit],
      );

      return result.rows.map((row) => ({
        query: row.query,
        executionCount: parseInt(row.execution_count),
        uniqueUsers: parseInt(row.unique_users),
        avgClickThroughRate: 0,
      }));
    } catch (error) {
      this.logger.error('Failed to get zero-result queries', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Generate unique query ID
   */
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get date key for Redis metrics
   */
  private getDateKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * Clean up old analytics data
   */
  async cleanupOldData(daysToKeep: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.pg.query(
        `
        DELETE FROM search_analytics
        WHERE timestamp < $1
        `,
        [cutoffDate],
      );

      this.logger.info('Cleaned up old analytics data', {
        rowsDeleted: result.rowCount,
        cutoffDate,
      });
    } catch (error) {
      this.logger.error('Failed to cleanup old data', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
