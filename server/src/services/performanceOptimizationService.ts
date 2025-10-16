import { EventEmitter } from 'events';
import { RedisCache } from '../cache/redis';

interface PerformanceMetrics {
  id: string;
  timestamp: Date;
  endpoint: string;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  cacheHitRate: number;
  concurrentUsers: number;
  status: 'success' | 'error' | 'timeout';
}

interface CacheStrategy {
  id: string;
  name: string;
  pattern: string;
  ttl: number;
  priority: 'high' | 'medium' | 'low';
  compressionEnabled: boolean;
  prefetchEnabled: boolean;
}

interface QueryOptimization {
  id: string;
  queryType: 'graphql' | 'cypher' | 'sql';
  originalQuery: string;
  optimizedQuery: string;
  executionTime: number;
  improvement: number;
  indexRecommendations: string[];
}

interface ConnectionPool {
  id: string;
  type: 'postgresql' | 'neo4j' | 'redis';
  maxConnections: number;
  activeConnections: number;
  idleConnections: number;
  avgResponseTime: number;
  errorRate: number;
}

export class PerformanceOptimizationService extends EventEmitter {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private cacheStrategies: Map<string, CacheStrategy> = new Map();
  private queryOptimizations: Map<string, QueryOptimization> = new Map();
  private connectionPools: Map<string, ConnectionPool> = new Map();
  private cache: RedisCache;
  private performanceThresholds = {
    responseTime: 1000, // ms
    memoryUsage: 80, // percentage
    cacheHitRate: 85, // percentage
    errorRate: 5, // percentage
  };

  constructor() {
    super();
    this.cache = new RedisCache();
    this.initializeCacheStrategies();
    this.initializeConnectionPools();
    this.startPerformanceMonitoring();
  }

  private initializeCacheStrategies(): void {
    const strategies: CacheStrategy[] = [
      {
        id: 'graph-queries',
        name: 'Graph Query Cache',
        pattern: 'graph:*',
        ttl: 300,
        priority: 'high',
        compressionEnabled: true,
        prefetchEnabled: true,
      },
      {
        id: 'entity-data',
        name: 'Entity Data Cache',
        pattern: 'entity:*',
        ttl: 600,
        priority: 'high',
        compressionEnabled: true,
        prefetchEnabled: false,
      },
      {
        id: 'investigation-cache',
        name: 'Investigation Cache',
        pattern: 'investigation:*',
        ttl: 180,
        priority: 'medium',
        compressionEnabled: false,
        prefetchEnabled: true,
      },
      {
        id: 'user-sessions',
        name: 'User Session Cache',
        pattern: 'session:*',
        ttl: 3600,
        priority: 'medium',
        compressionEnabled: false,
        prefetchEnabled: false,
      },
      {
        id: 'ml-results',
        name: 'ML Analysis Cache',
        pattern: 'ml:*',
        ttl: 1800,
        priority: 'high',
        compressionEnabled: true,
        prefetchEnabled: true,
      },
    ];

    strategies.forEach((strategy) => {
      this.cacheStrategies.set(strategy.id, strategy);
    });

    console.log(
      '[PERFORMANCE] Initialized cache strategies:',
      strategies.length,
    );
  }

  private initializeConnectionPools(): void {
    this.connectionPools.set('postgresql', {
      id: 'postgresql',
      type: 'postgresql',
      maxConnections: 20,
      activeConnections: 0,
      idleConnections: 20,
      avgResponseTime: 0,
      errorRate: 0,
    });

    this.connectionPools.set('neo4j', {
      id: 'neo4j',
      type: 'neo4j',
      maxConnections: 15,
      activeConnections: 0,
      idleConnections: 15,
      avgResponseTime: 0,
      errorRate: 0,
    });

    this.connectionPools.set('redis', {
      id: 'redis',
      type: 'redis',
      maxConnections: 10,
      activeConnections: 0,
      idleConnections: 10,
      avgResponseTime: 0,
      errorRate: 0,
    });
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.collectMetrics();
      this.analyzePerformance();
      this.optimizeCacheStrategies();
    }, 30000); // Every 30 seconds
  }

  public recordMetric(
    endpoint: string,
    responseTime: number,
    status: 'success' | 'error' | 'timeout',
  ): void {
    const metric: PerformanceMetrics = {
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      endpoint,
      responseTime,
      memoryUsage:
        (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) *
        100,
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      cacheHitRate: this.calculateCacheHitRate(),
      concurrentUsers: this.getCurrentConcurrentUsers(),
      status,
    };

    this.metrics.set(metric.id, metric);

    // Keep only last 1000 metrics
    if (this.metrics.size > 1000) {
      const oldest = Array.from(this.metrics.keys())[0];
      this.metrics.delete(oldest);
    }

    this.emit('metric-recorded', metric);

    if (responseTime > this.performanceThresholds.responseTime) {
      this.emit('performance-alert', {
        type: 'slow-response',
        endpoint,
        responseTime,
        threshold: this.performanceThresholds.responseTime,
      });
    }
  }

  private calculateCacheHitRate(): number {
    // Mock implementation - would integrate with actual cache statistics
    return 92.5;
  }

  private getCurrentConcurrentUsers(): number {
    // Mock implementation - would count active WebSocket connections
    return Math.floor(Math.random() * 50) + 10;
  }

  private collectMetrics(): void {
    const systemMetrics = {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
    };

    this.emit('system-metrics', systemMetrics);
  }

  private analyzePerformance(): void {
    const recentMetrics = Array.from(this.metrics.values())
      .filter((metric) => Date.now() - metric.timestamp.getTime() < 300000) // Last 5 minutes
      .slice(-50);

    if (recentMetrics.length === 0) return;

    const avgResponseTime =
      recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) /
      recentMetrics.length;
    const errorRate =
      (recentMetrics.filter((m) => m.status === 'error').length /
        recentMetrics.length) *
      100;
    const avgMemoryUsage =
      recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) /
      recentMetrics.length;

    const analysis = {
      avgResponseTime,
      errorRate,
      avgMemoryUsage,
      totalRequests: recentMetrics.length,
      slowQueries: recentMetrics.filter(
        (m) => m.responseTime > this.performanceThresholds.responseTime,
      ).length,
    };

    this.emit('performance-analysis', analysis);

    // Check for performance issues
    if (avgResponseTime > this.performanceThresholds.responseTime) {
      this.emit('performance-alert', {
        type: 'high-average-response-time',
        value: avgResponseTime,
        threshold: this.performanceThresholds.responseTime,
      });
    }

    if (errorRate > this.performanceThresholds.errorRate) {
      this.emit('performance-alert', {
        type: 'high-error-rate',
        value: errorRate,
        threshold: this.performanceThresholds.errorRate,
      });
    }
  }

  private optimizeCacheStrategies(): void {
    this.cacheStrategies.forEach((strategy) => {
      if (strategy.prefetchEnabled) {
        this.prefetchCacheData(strategy);
      }
    });
  }

  private async prefetchCacheData(strategy: CacheStrategy): Promise<void> {
    try {
      // Mock prefetch logic - would implement actual prefetching based on usage patterns
      const keys = await this.cache.getKeysByPattern(strategy.pattern);
      const expiringSoon = keys.filter((key) => {
        // Check if key expires within next 60 seconds
        return true; // Mock implementation
      });

      for (const key of expiringSoon.slice(0, 10)) {
        // Prefetch max 10 keys per cycle
        // Refresh cache entry
        this.emit('cache-prefetch', { strategy: strategy.id, key });
      }
    } catch (error) {
      console.error('[PERFORMANCE] Cache prefetch error:', error);
    }
  }

  public async optimizeQuery(
    queryType: 'graphql' | 'cypher' | 'sql',
    query: string,
  ): Promise<QueryOptimization> {
    const startTime = Date.now();

    let optimizedQuery = query;
    const indexRecommendations: string[] = [];

    // Basic query optimization rules
    if (queryType === 'cypher') {
      // Add LIMIT clauses where missing
      if (
        !query.toLowerCase().includes('limit') &&
        query.toLowerCase().includes('return')
      ) {
        optimizedQuery = query + ' LIMIT 1000';
        indexRecommendations.push('Consider adding explicit LIMIT clause');
      }

      // Suggest indexes for WHERE clauses
      const whereMatches = query.match(/WHERE\s+(\w+)\.(\w+)/gi);
      if (whereMatches) {
        whereMatches.forEach((match) => {
          indexRecommendations.push(
            `Consider index on ${match.replace('WHERE ', '')}`,
          );
        });
      }
    } else if (queryType === 'sql') {
      // Basic SQL optimizations
      if (query.toLowerCase().includes('select *')) {
        indexRecommendations.push('Avoid SELECT * - specify required columns');
      }
    }

    const executionTime = Date.now() - startTime;
    const improvement =
      query.length > optimizedQuery.length
        ? ((query.length - optimizedQuery.length) / query.length) * 100
        : 0;

    const optimization: QueryOptimization = {
      id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      queryType,
      originalQuery: query,
      optimizedQuery,
      executionTime,
      improvement,
      indexRecommendations,
    };

    this.queryOptimizations.set(optimization.id, optimization);
    this.emit('query-optimized', optimization);

    return optimization;
  }

  public getPerformanceReport(): any {
    const recentMetrics = Array.from(this.metrics.values())
      .filter((metric) => Date.now() - metric.timestamp.getTime() < 3600000) // Last hour
      .slice(-100);

    const cacheStats = Array.from(this.cacheStrategies.values()).map(
      (strategy) => ({
        name: strategy.name,
        pattern: strategy.pattern,
        ttl: strategy.ttl,
        priority: strategy.priority,
        compressionEnabled: strategy.compressionEnabled,
        prefetchEnabled: strategy.prefetchEnabled,
      }),
    );

    const connectionPoolStats = Array.from(this.connectionPools.values());

    const topSlowQueries = Array.from(this.queryOptimizations.values())
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    return {
      timestamp: new Date(),
      metrics: {
        totalRequests: recentMetrics.length,
        avgResponseTime:
          recentMetrics.length > 0
            ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) /
              recentMetrics.length
            : 0,
        errorRate:
          recentMetrics.length > 0
            ? (recentMetrics.filter((m) => m.status === 'error').length /
                recentMetrics.length) *
              100
            : 0,
        cacheHitRate: this.calculateCacheHitRate(),
        concurrentUsers: this.getCurrentConcurrentUsers(),
      },
      cacheStrategies: cacheStats,
      connectionPools: connectionPoolStats,
      slowQueries: topSlowQueries,
      systemHealth: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      },
    };
  }

  public async implementCacheWarming(): Promise<void> {
    console.log('[PERFORMANCE] Starting cache warming...');

    const warmupQueries = [
      'MATCH (n) RETURN count(n) as total_nodes',
      'MATCH ()-[r]->() RETURN count(r) as total_relationships',
      'MATCH (i:Investigation) RETURN i LIMIT 20',
      'MATCH (e:Entity) WHERE e.type = "Person" RETURN e LIMIT 50',
      'MATCH (ioc:IOC) WHERE ioc.active = true RETURN ioc LIMIT 30',
    ];

    for (const query of warmupQueries) {
      try {
        const cacheKey = `warmup:${Buffer.from(query).toString('base64')}`;
        await this.cache.set(cacheKey, 'warmed', 3600);
        this.emit('cache-warmed', { query, cacheKey });
      } catch (error) {
        console.error('[PERFORMANCE] Cache warming error:', error);
      }
    }

    console.log('[PERFORMANCE] Cache warming completed');
  }

  public async implementDataCompression(): Promise<void> {
    console.log('[PERFORMANCE] Implementing data compression...');

    // Enable compression for high-priority cache strategies
    const highPriorityStrategies = Array.from(
      this.cacheStrategies.values(),
    ).filter((s) => s.priority === 'high' && s.compressionEnabled);

    for (const strategy of highPriorityStrategies) {
      try {
        const keys = await this.cache.getKeysByPattern(strategy.pattern);
        let compressed = 0;

        for (const key of keys.slice(0, 100)) {
          // Process max 100 keys per strategy
          const data = await this.cache.get(key);
          if (data && typeof data === 'string' && data.length > 1000) {
            // Mock compression - would use actual compression algorithm
            const compressedData = `compressed:${data.substring(0, 100)}...`;
            await this.cache.set(key, compressedData, strategy.ttl);
            compressed++;
          }
        }

        this.emit('data-compressed', {
          strategy: strategy.id,
          itemsCompressed: compressed,
        });
      } catch (error) {
        console.error('[PERFORMANCE] Data compression error:', error);
      }
    }

    console.log('[PERFORMANCE] Data compression completed');
  }
}
