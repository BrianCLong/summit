/**
 * Maestro Conductor v24.4.0 - Graph Abuse Detection & Mitigation
 * Epic E19: Advanced Abuse/Misuse Detection & Mitigation
 *
 * Graph traversal and fan-out abuse detection with dynamic limits
 * Prevents graph bombing, excessive relationship traversals, and resource exhaustion
 */

import { Request, Response, NextFunction } from 'express';
import { PrometheusMetrics } from '../utils/metrics';
import logger from '../utils/logger';
import { tracer, Span } from '../utils/tracing';

// Configuration for graph abuse detection
interface GraphAbuseGuardConfig {
  enabled: boolean;
  maxFanOutPerNode: number;
  maxTraversalDepth: number;
  maxNodesPerQuery: number;
  maxEdgesPerQuery: number;
  maxQueryComplexity: number;
  complexityTimeoutMs: number;
  slidingWindowMinutes: number;
  maxQueriesPerWindow: number;
  suspiciousPatterns: SuspiciousPattern[];
  tenantLimits: Map<string, TenantLimits>;
}

// Tenant-specific limits
interface TenantLimits {
  tenantId: string;
  maxFanOutPerNode: number;
  maxTraversalDepth: number;
  maxNodesPerQuery: number;
  maxEdgesPerQuery: number;
  dailyQueryLimit: number;
  tier: 'basic' | 'premium' | 'enterprise';
}

// Suspicious pattern definitions
interface SuspiciousPattern {
  name: string;
  description: string;
  condition: (analysis: QueryAnalysis) => boolean;
  severity: 'low' | 'medium' | 'high';
  blockQuery: boolean;
}

// Query analysis results
interface QueryAnalysis {
  query: string;
  estimatedNodes: number;
  estimatedEdges: number;
  maxDepth: number;
  fanOutRatio: number;
  complexity: number;
  hasRecursion: boolean;
  patterns: string[];
  riskScore: number;
  tenant: string;
}

// Graph traversal limits tracker
interface TraversalState {
  currentDepth: number;
  nodesVisited: Set<string>;
  edgesTraversed: Set<string>;
  fanOutCounts: Map<string, number>;
  startTime: number;
}

// Query window tracking
interface QueryWindow {
  tenantId: string;
  timestamp: number;
  queryCount: number;
  blockedCount: number;
  suspiciousCount: number;
}

export class GraphAbuseGuard {
  private config: GraphAbuseGuardConfig;
  private metrics: PrometheusMetrics;
  private queryWindows: Map<string, QueryWindow[]> = new Map();
  private activeTraversals: Map<string, TraversalState> = new Map();

  constructor(config: Partial<GraphAbuseGuardConfig> = {}) {
    this.config = {
      enabled: true,
      maxFanOutPerNode: 100,
      maxTraversalDepth: 10,
      maxNodesPerQuery: 10000,
      maxEdgesPerQuery: 50000,
      maxQueryComplexity: 1000,
      complexityTimeoutMs: 30000,
      slidingWindowMinutes: 15,
      maxQueriesPerWindow: 500,
      suspiciousPatterns: this.getDefaultSuspiciousPatterns(),
      tenantLimits: new Map(),
      ...config,
    };

    this.metrics = new PrometheusMetrics('graph_abuse_guard');
    this.initializeMetrics();
    this.loadTenantLimits();
    this.startCleanupTask();
  }

  private initializeMetrics(): void {
    this.metrics.createCounter(
      'graph_queries_total',
      'Total graph queries processed',
      ['tenant_id', 'status'],
    );
    this.metrics.createCounter(
      'queries_blocked',
      'Queries blocked by abuse guard',
      ['tenant_id', 'reason'],
    );
    this.metrics.createCounter(
      'suspicious_patterns_detected',
      'Suspicious patterns detected',
      ['tenant_id', 'pattern'],
    );
    this.metrics.createHistogram(
      'query_complexity',
      'Graph query complexity scores',
      {
        buckets: [1, 10, 50, 100, 500, 1000, 5000],
      },
    );
    this.metrics.createHistogram('traversal_depth', 'Graph traversal depths', {
      buckets: [1, 2, 3, 5, 10, 15, 20],
    });
    this.metrics.createHistogram('fan_out_ratio', 'Fan-out ratios per query', {
      buckets: [1, 5, 10, 25, 50, 100, 500],
    });
    this.metrics.createGauge(
      'active_traversals',
      'Currently active graph traversals',
    );
  }

  private getDefaultSuspiciousPatterns(): SuspiciousPattern[] {
    return [
      {
        name: 'excessive_fan_out',
        description: 'Query with excessive fan-out potential',
        condition: (analysis) => analysis.fanOutRatio > 50,
        severity: 'high',
        blockQuery: true,
      },
      {
        name: 'deep_recursion',
        description: 'Query with dangerous recursion depth',
        condition: (analysis) =>
          analysis.maxDepth > 15 && analysis.hasRecursion,
        severity: 'high',
        blockQuery: true,
      },
      {
        name: 'graph_bomb',
        description: 'Potential graph bomb pattern',
        condition: (analysis) =>
          analysis.estimatedNodes > 5000 &&
          analysis.fanOutRatio > 20 &&
          analysis.complexity > 500,
        severity: 'high',
        blockQuery: true,
      },
      {
        name: 'resource_exhaustion',
        description: 'Query likely to exhaust resources',
        condition: (analysis) =>
          analysis.estimatedEdges > 25000 || analysis.complexity > 800,
        severity: 'medium',
        blockQuery: true,
      },
      {
        name: 'traversal_abuse',
        description: 'Excessive traversal without clear purpose',
        condition: (analysis) =>
          analysis.maxDepth > 8 &&
          analysis.patterns.includes('MATCH') &&
          !analysis.patterns.includes('LIMIT'),
        severity: 'medium',
        blockQuery: false,
      },
      {
        name: 'relationship_mining',
        description: 'Potential relationship mining pattern',
        condition: (analysis) =>
          analysis.patterns.includes('()-[*]->()') &&
          analysis.estimatedNodes > 1000,
        severity: 'low',
        blockQuery: false,
      },
    ];
  }

  private loadTenantLimits(): void {
    // In production, this would load from database
    // For now, set some default tier-based limits
    const defaultLimits: Record<string, TenantLimits> = {
      basic: {
        tenantId: 'default',
        maxFanOutPerNode: 50,
        maxTraversalDepth: 5,
        maxNodesPerQuery: 1000,
        maxEdgesPerQuery: 5000,
        dailyQueryLimit: 1000,
        tier: 'basic',
      },
      premium: {
        tenantId: 'default',
        maxFanOutPerNode: 200,
        maxTraversalDepth: 10,
        maxNodesPerQuery: 10000,
        maxEdgesPerQuery: 50000,
        dailyQueryLimit: 10000,
        tier: 'premium',
      },
      enterprise: {
        tenantId: 'default',
        maxFanOutPerNode: 500,
        maxTraversalDepth: 15,
        maxNodesPerQuery: 50000,
        maxEdgesPerQuery: 200000,
        dailyQueryLimit: 100000,
        tier: 'enterprise',
      },
    };

    // Set default limits based on environment
    Object.entries(defaultLimits).forEach(([tier, limits]) => {
      this.config.tenantLimits.set(tier, limits);
    });
  }

  // Express middleware factory
  public middleware() {
    return async (
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> => {
      if (!this.config.enabled) {
        return next();
      }

      return tracer.startActiveSpan(
        'graph_abuse_guard.middleware',
        async (span: Span) => {
          try {
            const tenantId = this.extractTenantId(req);
            const query = this.extractGraphQuery(req);

            if (!query) {
              // Not a graph query, pass through
              return next();
            }

            span.setAttributes({
              'graph_abuse_guard.tenant_id': tenantId,
              'graph_abuse_guard.query_length': query.length,
            });

            // Check rate limiting first
            if (await this.isRateLimited(tenantId)) {
              logger.warn('Graph query rate limited', { tenantId });

              this.metrics.incrementCounter('queries_blocked', {
                tenant_id: tenantId,
                reason: 'rate_limit',
              });

              res.status(429).json({
                error: 'Rate limit exceeded',
                message: 'Too many graph queries in time window',
                retryAfter: this.config.slidingWindowMinutes * 60,
              });
              return;
            }

            // Analyze query for abuse patterns
            const analysis = await this.analyzeQuery(query, tenantId);

            span.setAttributes({
              'graph_abuse_guard.complexity': analysis.complexity,
              'graph_abuse_guard.estimated_nodes': analysis.estimatedNodes,
              'graph_abuse_guard.max_depth': analysis.maxDepth,
              'graph_abuse_guard.risk_score': analysis.riskScore,
            });

            // Record metrics
            this.metrics.observeHistogram(
              'query_complexity',
              analysis.complexity,
            );
            this.metrics.observeHistogram('traversal_depth', analysis.maxDepth);
            this.metrics.observeHistogram(
              'fan_out_ratio',
              analysis.fanOutRatio,
            );

            // Check for blocking patterns
            const blockingPatterns = this.config.suspiciousPatterns.filter(
              (pattern) => pattern.blockQuery && pattern.condition(analysis),
            );

            if (blockingPatterns.length > 0) {
              const reasons = blockingPatterns.map((p) => p.name);

              logger.warn('Graph query blocked', {
                tenantId,
                reasons,
                analysis: {
                  complexity: analysis.complexity,
                  estimatedNodes: analysis.estimatedNodes,
                  maxDepth: analysis.maxDepth,
                  riskScore: analysis.riskScore,
                },
              });

              blockingPatterns.forEach((pattern) => {
                this.metrics.incrementCounter('queries_blocked', {
                  tenant_id: tenantId,
                  reason: pattern.name,
                });
              });

              res.status(400).json({
                error: 'Query blocked',
                message: 'Query violates graph abuse policies',
                reasons,
                suggestions: this.getSuggestionsForPatterns(blockingPatterns),
              });
              return;
            }

            // Check for warning patterns (log but don't block)
            const warningPatterns = this.config.suspiciousPatterns.filter(
              (pattern) => !pattern.blockQuery && pattern.condition(analysis),
            );

            if (warningPatterns.length > 0) {
              warningPatterns.forEach((pattern) => {
                logger.warn('Suspicious graph query pattern', {
                  tenantId,
                  pattern: pattern.name,
                  severity: pattern.severity,
                });

                this.metrics.incrementCounter('suspicious_patterns_detected', {
                  tenant_id: tenantId,
                  pattern: pattern.name,
                });
              });
            }

            // Track query in rate window
            await this.trackQuery(tenantId, warningPatterns.length > 0);

            // Attach traversal state for runtime monitoring
            const traversalId = this.generateTraversalId();
            this.activeTraversals.set(traversalId, {
              currentDepth: 0,
              nodesVisited: new Set(),
              edgesTraversed: new Set(),
              fanOutCounts: new Map(),
              startTime: Date.now(),
            });

            // Add traversal monitoring to request
            req.graphTraversalId = traversalId;
            req.graphAnalysis = analysis;

            this.metrics.setGauge(
              'active_traversals',
              this.activeTraversals.size,
            );
            this.metrics.incrementCounter('graph_queries_total', {
              tenant_id: tenantId,
              status: 'allowed',
            });

            next();
          } catch (error) {
            logger.error('Graph abuse guard error', { error: error.message });
            span.recordException(error as Error);

            // Fail open - allow query but log error
            this.metrics.incrementCounter('graph_queries_total', {
              tenant_id: 'unknown',
              status: 'error',
            });
            next();
          }
        },
      );
    };
  }

  private extractTenantId(req: Request): string {
    return (
      (req.headers['x-tenant-id'] as string) ||
      req.body?.tenantId ||
      (req.query.tenantId as string) ||
      req.user?.tenantId ||
      'default'
    );
  }

  private extractGraphQuery(req: Request): string | null {
    // Check various sources for graph queries
    if (req.body?.query) return req.body.query;
    if (req.body?.cypher) return req.body.cypher;
    if (req.query.query) return req.query.query as string;
    if (req.body?.gremlin) return req.body.gremlin;

    // Check for GraphQL
    if (req.body?.operationName || req.body?.variables) {
      return req.body.query || null;
    }

    return null;
  }

  private async analyzeQuery(
    query: string,
    tenantId: string,
  ): Promise<QueryAnalysis> {
    const analysis: QueryAnalysis = {
      query,
      estimatedNodes: 0,
      estimatedEdges: 0,
      maxDepth: 0,
      fanOutRatio: 0,
      complexity: 0,
      hasRecursion: false,
      patterns: [],
      riskScore: 0,
      tenant: tenantId,
    };

    // Basic pattern matching for different query languages
    const lowerQuery = query.toLowerCase();

    // Detect query patterns
    if (lowerQuery.includes('match')) analysis.patterns.push('MATCH');
    if (lowerQuery.includes('optional match'))
      analysis.patterns.push('OPTIONAL_MATCH');
    if (lowerQuery.includes('*')) analysis.patterns.push('VARIABLE_LENGTH');
    if (lowerQuery.includes('()-[*]->()'))
      analysis.patterns.push('STAR_TRAVERSAL');
    if (lowerQuery.includes('limit')) analysis.patterns.push('LIMIT');
    if (lowerQuery.includes('order by')) analysis.patterns.push('ORDER_BY');
    if (lowerQuery.includes('with ')) analysis.patterns.push('WITH_CLAUSE');

    // Estimate complexity based on patterns
    let complexity = 10; // Base complexity

    // Variable length path patterns significantly increase complexity
    const varLengthMatches = query.match(/\*(\d+)?\.\.(\d+)?/g) || [];
    for (const match of varLengthMatches) {
      const [, min = '1', max = '∞'] = match.match(/\*(\d+)?\.\.(\d+)?/) || [];
      const maxNum = max === '∞' ? 100 : parseInt(max);
      complexity += maxNum * 50;
      analysis.maxDepth = Math.max(analysis.maxDepth, maxNum);
    }

    // Unlimited variable length paths
    if (query.includes('*') && !query.includes('..')) {
      complexity += 1000;
      analysis.maxDepth = Math.max(analysis.maxDepth, 20);
      analysis.hasRecursion = true;
    }

    // Count estimated nodes/edges based on patterns
    const nodePatterns = query.match(/\([^)]*\)/g) || [];
    analysis.estimatedNodes = Math.max(nodePatterns.length * 100, 1);

    const edgePatterns = query.match(/-\[[^\]]*\]-/g) || [];
    analysis.estimatedEdges = Math.max(edgePatterns.length * 500, 1);

    // Calculate fan-out ratio
    if (nodePatterns.length > 0) {
      analysis.fanOutRatio = analysis.estimatedEdges / nodePatterns.length;
    }

    // Adjust for relationship direction and cardinality
    if (query.includes('-->') || query.includes('<--')) {
      complexity += 20;
    }

    // No LIMIT clause increases risk significantly
    if (!lowerQuery.includes('limit') && analysis.estimatedNodes > 100) {
      complexity += 200;
    }

    // Multiple MATCH clauses
    const matchCount = (lowerQuery.match(/match/g) || []).length;
    if (matchCount > 3) {
      complexity += matchCount * 50;
    }

    analysis.complexity = complexity;

    // Calculate risk score (0-100)
    let riskScore = 0;
    if (analysis.complexity > 500) riskScore += 30;
    if (analysis.maxDepth > 10) riskScore += 25;
    if (analysis.fanOutRatio > 50) riskScore += 20;
    if (analysis.estimatedNodes > 5000) riskScore += 15;
    if (!analysis.patterns.includes('LIMIT')) riskScore += 10;

    analysis.riskScore = Math.min(riskScore, 100);

    return analysis;
  }

  private async isRateLimited(tenantId: string): Promise<boolean> {
    const windows = this.queryWindows.get(tenantId) || [];
    const cutoff = Date.now() - this.config.slidingWindowMinutes * 60 * 1000;

    // Clean old windows
    const recentWindows = windows.filter((w) => w.timestamp > cutoff);
    this.queryWindows.set(tenantId, recentWindows);

    // Check if rate limited
    const totalQueries = recentWindows.reduce(
      (sum, w) => sum + w.queryCount,
      0,
    );
    return totalQueries >= this.config.maxQueriesPerWindow;
  }

  private async trackQuery(
    tenantId: string,
    suspicious: boolean,
  ): Promise<void> {
    const windows = this.queryWindows.get(tenantId) || [];
    const currentWindow = Math.floor(Date.now() / (60 * 1000)); // 1-minute windows

    let window = windows.find(
      (w) => Math.floor(w.timestamp / (60 * 1000)) === currentWindow,
    );

    if (!window) {
      window = {
        tenantId,
        timestamp: Date.now(),
        queryCount: 0,
        blockedCount: 0,
        suspiciousCount: 0,
      };
      windows.push(window);
    }

    window.queryCount++;
    if (suspicious) window.suspiciousCount++;

    this.queryWindows.set(tenantId, windows);
  }

  private getSuggestionsForPatterns(patterns: SuspiciousPattern[]): string[] {
    const suggestions: string[] = [];

    for (const pattern of patterns) {
      switch (pattern.name) {
        case 'excessive_fan_out':
          suggestions.push(
            'Consider adding more specific relationship filters or using LIMIT clauses',
          );
          break;
        case 'deep_recursion':
          suggestions.push(
            'Limit recursion depth using path length constraints like [*1..5]',
          );
          break;
        case 'graph_bomb':
          suggestions.push(
            'Add LIMIT clauses and more selective WHERE conditions',
          );
          break;
        case 'resource_exhaustion':
          suggestions.push(
            'Use pagination with SKIP and LIMIT, or add more selective filters',
          );
          break;
        case 'traversal_abuse':
          suggestions.push(
            'Add LIMIT clause and consider using indexes for better performance',
          );
          break;
        case 'relationship_mining':
          suggestions.push(
            'Be more specific about relationship types and use appropriate LIMIT clauses',
          );
          break;
      }
    }

    if (suggestions.length === 0) {
      suggestions.push(
        'Review query patterns and add appropriate limits and filters',
      );
    }

    return suggestions;
  }

  private generateTraversalId(): string {
    return `traversal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startCleanupTask(): void {
    // Clean up completed traversals every 5 minutes
    setInterval(
      () => {
        const cutoff = Date.now() - 5 * 60 * 1000;
        let cleaned = 0;

        for (const [id, state] of this.activeTraversals.entries()) {
          if (state.startTime < cutoff) {
            this.activeTraversals.delete(id);
            cleaned++;
          }
        }

        if (cleaned > 0) {
          logger.debug('Cleaned expired traversals', { count: cleaned });
          this.metrics.setGauge(
            'active_traversals',
            this.activeTraversals.size,
          );
        }

        // Clean old query windows
        for (const [tenantId, windows] of this.queryWindows.entries()) {
          const recentWindows = windows.filter((w) => w.timestamp > cutoff);
          this.queryWindows.set(tenantId, recentWindows);
        }
      },
      5 * 60 * 1000,
    );
  }

  // Runtime monitoring methods
  public trackNodeVisit(traversalId: string, nodeId: string): boolean {
    const state = this.activeTraversals.get(traversalId);
    if (!state) return true; // Allow if no state tracked

    state.nodesVisited.add(nodeId);

    // Check limits
    if (state.nodesVisited.size > this.config.maxNodesPerQuery) {
      logger.warn('Node limit exceeded during traversal', {
        traversalId,
        nodesVisited: state.nodesVisited.size,
        limit: this.config.maxNodesPerQuery,
      });
      return false;
    }

    return true;
  }

  public trackEdgeTraversal(
    traversalId: string,
    edgeId: string,
    fromNode: string,
  ): boolean {
    const state = this.activeTraversals.get(traversalId);
    if (!state) return true;

    state.edgesTraversed.add(edgeId);

    // Track fan-out for this node
    const currentFanOut = state.fanOutCounts.get(fromNode) || 0;
    state.fanOutCounts.set(fromNode, currentFanOut + 1);

    // Check edge limit
    if (state.edgesTraversed.size > this.config.maxEdgesPerQuery) {
      logger.warn('Edge limit exceeded during traversal', {
        traversalId,
        edgesTraversed: state.edgesTraversed.size,
        limit: this.config.maxEdgesPerQuery,
      });
      return false;
    }

    // Check fan-out limit
    if (currentFanOut >= this.config.maxFanOutPerNode) {
      logger.warn('Fan-out limit exceeded during traversal', {
        traversalId,
        fromNode,
        fanOut: currentFanOut + 1,
        limit: this.config.maxFanOutPerNode,
      });
      return false;
    }

    return true;
  }

  public finishTraversal(traversalId: string): void {
    const state = this.activeTraversals.get(traversalId);
    if (state) {
      const duration = Date.now() - state.startTime;
      logger.debug('Graph traversal completed', {
        traversalId,
        nodesVisited: state.nodesVisited.size,
        edgesTraversed: state.edgesTraversed.size,
        duration,
      });

      this.activeTraversals.delete(traversalId);
      this.metrics.setGauge('active_traversals', this.activeTraversals.size);
    }
  }

  // Admin methods
  public getActiveTraversals(): Map<string, TraversalState> {
    return new Map(this.activeTraversals);
  }

  public getTenantQueryStats(tenantId: string): QueryWindow[] {
    return this.queryWindows.get(tenantId) || [];
  }

  public updateTenantLimits(
    tenantId: string,
    limits: Partial<TenantLimits>,
  ): void {
    const existing = this.config.tenantLimits.get(tenantId);
    const updated = { ...existing, ...limits, tenantId } as TenantLimits;
    this.config.tenantLimits.set(tenantId, updated);

    logger.info('Updated tenant limits', { tenantId, limits: updated });
  }
}

// Extend Request interface for TypeScript
declare global {
  namespace Express {
    interface Request {
      graphTraversalId?: string;
      graphAnalysis?: QueryAnalysis;
    }
  }
}

// Export singleton instance
export const graphAbuseGuard = new GraphAbuseGuard({
  enabled: process.env.GRAPH_ABUSE_GUARD_ENABLED !== 'false',
  maxFanOutPerNode: parseInt(process.env.GRAPH_MAX_FAN_OUT || '100'),
  maxTraversalDepth: parseInt(process.env.GRAPH_MAX_DEPTH || '10'),
  maxNodesPerQuery: parseInt(process.env.GRAPH_MAX_NODES || '10000'),
  maxEdgesPerQuery: parseInt(process.env.GRAPH_MAX_EDGES || '50000'),
  maxQueryComplexity: parseInt(process.env.GRAPH_MAX_COMPLEXITY || '1000'),
  complexityTimeoutMs: parseInt(
    process.env.GRAPH_COMPLEXITY_TIMEOUT || '30000',
  ),
  slidingWindowMinutes: parseInt(process.env.GRAPH_RATE_WINDOW || '15'),
  maxQueriesPerWindow: parseInt(process.env.GRAPH_MAX_QUERIES_WINDOW || '500'),
});
