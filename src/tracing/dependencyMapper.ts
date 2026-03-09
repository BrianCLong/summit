/**
 * Service Dependency Mapper for IntelGraph
 * Analyzes distributed traces to build service topology and dependency graphs
 */

import { EventEmitter } from 'events';

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  duration: number;
  tags: Record<string, any>;
  logs: TraceLog[];
  status: 'ok' | 'error';
}

export interface TraceLog {
  timestamp: number;
  fields: Record<string, any>;
}

export interface ServiceDependencyGraph {
  nodes: ServiceNode[];
  edges: DependencyEdge[];
  metadata: GraphMetadata;
}

export interface ServiceNode {
  id: string;
  name: string;
  version?: string;
  environment: string;
  type: 'service' | 'database' | 'cache' | 'queue' | 'external';
  health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  metrics: NodeMetrics;
  tags: Record<string, string>;
}

export interface DependencyEdge {
  id: string;
  source: string;
  target: string;
  type: 'http' | 'database' | 'messaging' | 'rpc' | 'other';
  metrics: EdgeMetrics;
  errorTypes: ErrorType[];
}

export interface NodeMetrics {
  requestCount: number;
  errorCount: number;
  totalDuration: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number; // requests per second
}

export interface EdgeMetrics {
  callCount: number;
  errorCount: number;
  totalDuration: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
}

export interface ErrorType {
  type: string;
  count: number;
  lastOccurrence: number;
  samples: string[];
}

export interface GraphMetadata {
  timeRange: {
    start: number;
    end: number;
  };
  totalTraces: number;
  totalSpans: number;
  uniqueServices: number;
  criticalPath: CriticalPath;
  anomalies: Anomaly[];
}

export interface CriticalPath {
  services: string[];
  totalLatency: number;
  bottlenecks: Bottleneck[];
}

export interface Bottleneck {
  service: string;
  operation: string;
  avgLatency: number;
  impactScore: number;
}

export interface Anomaly {
  type:
    | 'latency_spike'
    | 'error_spike'
    | 'new_dependency'
    | 'missing_dependency';
  service: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  metadata: Record<string, any>;
}

export interface DependencyAnalysis {
  serviceDependencies: ServiceDependencyGraph;
  criticalPaths: CriticalPath[];
  performanceInsights: PerformanceInsight[];
  reliabilityMetrics: ReliabilityMetrics;
}

export interface PerformanceInsight {
  type:
    | 'slow_service'
    | 'high_error_rate'
    | 'resource_intensive'
    | 'inefficient_pattern';
  service: string;
  metric: string;
  currentValue: number;
  expectedValue: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface ReliabilityMetrics {
  overallHealthScore: number;
  serviceAvailability: Record<string, number>;
  errorBudgets: Record<string, number>;
  sloViolations: SLOViolation[];
}

export interface SLOViolation {
  service: string;
  metric: string;
  threshold: number;
  actualValue: number;
  duration: number;
  timestamp: number;
}

export class DependencyMapper extends EventEmitter {
  private traces: Map<string, TraceSpan[]> = new Map();
  private serviceGraph: ServiceDependencyGraph;
  private analysisHistory: DependencyAnalysis[] = [];
  private anomalyDetector: AnomalyDetector;

  constructor() {
    super();
    this.serviceGraph = {
      nodes: [],
      edges: [],
      metadata: {
        timeRange: { start: 0, end: 0 },
        totalTraces: 0,
        totalSpans: 0,
        uniqueServices: 0,
        criticalPath: { services: [], totalLatency: 0, bottlenecks: [] },
        anomalies: [],
      },
    };
    this.anomalyDetector = new AnomalyDetector();
    this.setupPeriodicAnalysis();
  }

  /**
   * Add trace data for analysis
   */
  addTrace(spans: TraceSpan[]): void {
    if (spans.length === 0) return;

    const traceId = spans[0].traceId;
    this.traces.set(traceId, spans);

    // Update metadata
    this.serviceGraph.metadata.totalTraces++;
    this.serviceGraph.metadata.totalSpans += spans.length;

    // Trigger real-time updates for large traces
    if (spans.length > 10) {
      this.processTraceIncremental(spans);
    }

    this.emit('trace_added', { traceId, spanCount: spans.length });
  }

  /**
   * Process multiple traces in batch
   */
  addTraces(traces: Record<string, TraceSpan[]>): void {
    Object.entries(traces).forEach(([traceId, spans]) => {
      this.traces.set(traceId, spans);
    });

    this.serviceGraph.metadata.totalTraces += Object.keys(traces).length;
    this.serviceGraph.metadata.totalSpans += Object.values(traces).reduce(
      (sum, spans) => sum + spans.length,
      0,
    );

    this.emit('traces_added', { count: Object.keys(traces).length });
  }

  /**
   * Analyze all traces and build dependency graph
   */
  async analyzeDependencies(): Promise<DependencyAnalysis> {
    const startTime = Date.now();

    // Clear existing analysis
    this.serviceGraph.nodes = [];
    this.serviceGraph.edges = [];

    // Extract services and dependencies from traces
    const serviceMap = new Map<string, ServiceNode>();
    const dependencyMap = new Map<string, DependencyEdge>();

    for (const [traceId, spans] of this.traces.entries()) {
      this.processTrace(spans, serviceMap, dependencyMap);
    }

    // Convert maps to arrays
    this.serviceGraph.nodes = Array.from(serviceMap.values());
    this.serviceGraph.edges = Array.from(dependencyMap.values());

    // Update metadata
    this.serviceGraph.metadata.uniqueServices = this.serviceGraph.nodes.length;
    this.serviceGraph.metadata.timeRange = this.calculateTimeRange();

    // Find critical paths
    const criticalPaths = this.findCriticalPaths();

    // Generate performance insights
    const performanceInsights = this.generatePerformanceInsights();

    // Calculate reliability metrics
    const reliabilityMetrics = this.calculateReliabilityMetrics();

    // Detect anomalies
    const anomalies = await this.anomalyDetector.detectAnomalies(
      this.serviceGraph,
      this.analysisHistory,
    );

    this.serviceGraph.metadata.anomalies = anomalies;

    const analysis: DependencyAnalysis = {
      serviceDependencies: this.serviceGraph,
      criticalPaths,
      performanceInsights,
      reliabilityMetrics,
    };

    // Store for historical analysis
    this.analysisHistory.push(analysis);
    if (this.analysisHistory.length > 100) {
      this.analysisHistory.shift();
    }

    const analysisTime = Date.now() - startTime;
    this.emit('analysis_completed', {
      analysis,
      analysisTime,
      tracesAnalyzed: this.traces.size,
    });

    return analysis;
  }

  /**
   * Get current service dependency graph
   */
  getServiceGraph(): ServiceDependencyGraph {
    return this.serviceGraph;
  }

  /**
   * Get dependencies for a specific service
   */
  getServiceDependencies(serviceName: string): {
    upstream: DependencyEdge[];
    downstream: DependencyEdge[];
  } {
    const upstream = this.serviceGraph.edges.filter(
      (edge) => edge.target === serviceName,
    );
    const downstream = this.serviceGraph.edges.filter(
      (edge) => edge.source === serviceName,
    );

    return { upstream, downstream };
  }

  /**
   * Find services in the critical path of a trace
   */
  findCriticalPath(traceId: string): string[] {
    const spans = this.traces.get(traceId);
    if (!spans) return [];

    // Build span tree
    const spanTree = this.buildSpanTree(spans);

    // Find the longest path
    const criticalPath = this.findLongestPath(spanTree);

    return criticalPath.map((span) => span.serviceName);
  }

  /**
   * Get performance metrics for a service
   */
  getServiceMetrics(serviceName: string): NodeMetrics | null {
    const node = this.serviceGraph.nodes.find((n) => n.name === serviceName);
    return node ? node.metrics : null;
  }

  /**
   * Get dependency metrics between two services
   */
  getDependencyMetrics(
    sourceService: string,
    targetService: string,
  ): EdgeMetrics | null {
    const edge = this.serviceGraph.edges.find(
      (e) => e.source === sourceService && e.target === targetService,
    );
    return edge ? edge.metrics : null;
  }

  /**
   * Export dependency graph in various formats
   */
  exportGraph(format: 'json' | 'dot' | 'cytoscape'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(this.serviceGraph, null, 2);

      case 'dot':
        return this.exportToDot();

      case 'cytoscape':
        return this.exportToCytoscape();

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Process a single trace and extract dependencies
   */
  private processTrace(
    spans: TraceSpan[],
    serviceMap: Map<string, ServiceNode>,
    dependencyMap: Map<string, DependencyEdge>,
  ): void {
    // Create service nodes
    for (const span of spans) {
      const serviceId = `${span.serviceName}:${span.tags.environment || 'unknown'}`;

      if (!serviceMap.has(serviceId)) {
        serviceMap.set(serviceId, this.createServiceNode(span));
      } else {
        this.updateServiceMetrics(serviceMap.get(serviceId)!, span);
      }
    }

    // Create dependency edges
    for (const span of spans) {
      if (span.parentSpanId) {
        const parentSpan = spans.find((s) => s.spanId === span.parentSpanId);
        if (parentSpan && parentSpan.serviceName !== span.serviceName) {
          const edgeId = `${parentSpan.serviceName}->${span.serviceName}`;

          if (!dependencyMap.has(edgeId)) {
            dependencyMap.set(
              edgeId,
              this.createDependencyEdge(parentSpan, span),
            );
          } else {
            this.updateDependencyMetrics(dependencyMap.get(edgeId)!, span);
          }
        }
      }
    }
  }

  /**
   * Process trace incrementally for real-time updates
   */
  private processTraceIncremental(spans: TraceSpan[]): void {
    // Real-time processing for large traces
    for (const span of spans) {
      if (span.duration > 1000) {
        // Spans longer than 1 second
        this.emit('slow_operation', {
          service: span.serviceName,
          operation: span.operationName,
          duration: span.duration,
          traceId: span.traceId,
        });
      }

      if (span.status === 'error') {
        this.emit('error_detected', {
          service: span.serviceName,
          operation: span.operationName,
          traceId: span.traceId,
          error: span.tags.error,
        });
      }
    }
  }

  /**
   * Create a new service node
   */
  private createServiceNode(span: TraceSpan): ServiceNode {
    return {
      id: `${span.serviceName}:${span.tags.environment || 'unknown'}`,
      name: span.serviceName,
      version: span.tags.version,
      environment: span.tags.environment || 'unknown',
      type: this.inferServiceType(span),
      health: span.status === 'error' ? 'unhealthy' : 'healthy',
      metrics: {
        requestCount: 1,
        errorCount: span.status === 'error' ? 1 : 0,
        totalDuration: span.duration,
        avgLatency: span.duration,
        p95Latency: span.duration,
        p99Latency: span.duration,
        throughput: 0,
      },
      tags: span.tags,
    };
  }

  /**
   * Update service metrics with new span data
   */
  private updateServiceMetrics(node: ServiceNode, span: TraceSpan): void {
    node.metrics.requestCount++;
    if (span.status === 'error') {
      node.metrics.errorCount++;
    }

    node.metrics.totalDuration += span.duration;
    node.metrics.avgLatency =
      node.metrics.totalDuration / node.metrics.requestCount;

    // Update health based on error rate
    const errorRate = node.metrics.errorCount / node.metrics.requestCount;
    if (errorRate > 0.1) {
      node.health = 'unhealthy';
    } else if (errorRate > 0.05) {
      node.health = 'degraded';
    } else {
      node.health = 'healthy';
    }
  }

  /**
   * Create a new dependency edge
   */
  private createDependencyEdge(
    parentSpan: TraceSpan,
    childSpan: TraceSpan,
  ): DependencyEdge {
    return {
      id: `${parentSpan.serviceName}->${childSpan.serviceName}`,
      source: parentSpan.serviceName,
      target: childSpan.serviceName,
      type: this.inferDependencyType(parentSpan, childSpan),
      metrics: {
        callCount: 1,
        errorCount: childSpan.status === 'error' ? 1 : 0,
        totalDuration: childSpan.duration,
        avgLatency: childSpan.duration,
        p95Latency: childSpan.duration,
        p99Latency: childSpan.duration,
        errorRate: childSpan.status === 'error' ? 1 : 0,
      },
      errorTypes:
        childSpan.status === 'error'
          ? [
              {
                type: childSpan.tags.error?.type || 'unknown',
                count: 1,
                lastOccurrence: childSpan.startTime,
                samples: [childSpan.tags.error?.message || ''],
              },
            ]
          : [],
    };
  }

  /**
   * Update dependency metrics with new span data
   */
  private updateDependencyMetrics(edge: DependencyEdge, span: TraceSpan): void {
    edge.metrics.callCount++;
    if (span.status === 'error') {
      edge.metrics.errorCount++;
    }

    edge.metrics.totalDuration += span.duration;
    edge.metrics.avgLatency =
      edge.metrics.totalDuration / edge.metrics.callCount;
    edge.metrics.errorRate = edge.metrics.errorCount / edge.metrics.callCount;
  }

  /**
   * Infer service type from span attributes
   */
  private inferServiceType(span: TraceSpan): ServiceNode['type'] {
    if (span.tags['db.system']) return 'database';
    if (span.tags['messaging.system']) return 'queue';
    if (span.tags['cache.system'] || span.operationName.includes('cache'))
      return 'cache';
    if (span.tags['http.url'] && !span.serviceName.includes('internal'))
      return 'external';
    return 'service';
  }

  /**
   * Infer dependency type from span attributes
   */
  private inferDependencyType(
    parentSpan: TraceSpan,
    childSpan: TraceSpan,
  ): DependencyEdge['type'] {
    if (childSpan.tags['db.system']) return 'database';
    if (childSpan.tags['messaging.system']) return 'messaging';
    if (childSpan.tags['http.method']) return 'http';
    if (childSpan.tags['rpc.system']) return 'rpc';
    return 'other';
  }

  /**
   * Build span tree for critical path analysis
   */
  private buildSpanTree(spans: TraceSpan[]): Map<string, TraceSpan[]> {
    const tree = new Map<string, TraceSpan[]>();

    for (const span of spans) {
      if (span.parentSpanId) {
        if (!tree.has(span.parentSpanId)) {
          tree.set(span.parentSpanId, []);
        }
        tree.get(span.parentSpanId)!.push(span);
      }
    }

    return tree;
  }

  /**
   * Find the longest path in the span tree
   */
  private findLongestPath(spanTree: Map<string, TraceSpan[]>): TraceSpan[] {
    // Implementation would find the critical path through the span tree
    return [];
  }

  /**
   * Find all critical paths in the system
   */
  private findCriticalPaths(): CriticalPath[] {
    // Analyze all traces to find common critical paths
    const paths: CriticalPath[] = [];

    // Implementation would analyze trace patterns to identify critical paths

    return paths;
  }

  /**
   * Generate performance insights
   */
  private generatePerformanceInsights(): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    // Analyze service performance
    for (const node of this.serviceGraph.nodes) {
      if (node.metrics.avgLatency > 1000) {
        insights.push({
          type: 'slow_service',
          service: node.name,
          metric: 'avg_latency',
          currentValue: node.metrics.avgLatency,
          expectedValue: 500,
          impact: node.metrics.avgLatency > 5000 ? 'critical' : 'high',
          recommendations: [
            'Optimize database queries',
            'Add caching layer',
            'Scale horizontally',
          ],
        });
      }

      const errorRate = node.metrics.errorCount / node.metrics.requestCount;
      if (errorRate > 0.05) {
        insights.push({
          type: 'high_error_rate',
          service: node.name,
          metric: 'error_rate',
          currentValue: errorRate,
          expectedValue: 0.01,
          impact: errorRate > 0.1 ? 'critical' : 'high',
          recommendations: [
            'Review error logs',
            'Implement retry logic',
            'Add circuit breakers',
          ],
        });
      }
    }

    return insights;
  }

  /**
   * Calculate reliability metrics
   */
  private calculateReliabilityMetrics(): ReliabilityMetrics {
    const serviceAvailability: Record<string, number> = {};

    for (const node of this.serviceGraph.nodes) {
      const errorRate = node.metrics.errorCount / node.metrics.requestCount;
      serviceAvailability[node.name] = (1 - errorRate) * 100;
    }

    const healthyServices = this.serviceGraph.nodes.filter(
      (n) => n.health === 'healthy',
    ).length;
    const overallHealthScore =
      (healthyServices / this.serviceGraph.nodes.length) * 100;

    return {
      overallHealthScore,
      serviceAvailability,
      errorBudgets: {}, // Would be calculated based on SLOs
      sloViolations: [], // Would be detected based on SLO definitions
    };
  }

  /**
   * Calculate time range from traces
   */
  private calculateTimeRange(): { start: number; end: number } {
    let start = Infinity;
    let end = 0;

    for (const spans of this.traces.values()) {
      for (const span of spans) {
        start = Math.min(start, span.startTime);
        end = Math.max(end, span.startTime + span.duration);
      }
    }

    return { start, end };
  }

  /**
   * Export to DOT format for Graphviz
   */
  private exportToDot(): string {
    let dot = 'digraph ServiceDependencies {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=box];\n\n';

    // Add nodes
    for (const node of this.serviceGraph.nodes) {
      const color =
        node.health === 'healthy'
          ? 'green'
          : node.health === 'degraded'
            ? 'yellow'
            : 'red';
      dot += `  "${node.name}" [color=${color}];\n`;
    }

    dot += '\n';

    // Add edges
    for (const edge of this.serviceGraph.edges) {
      const weight = Math.max(1, Math.floor(edge.metrics.callCount / 100));
      dot += `  "${edge.source}" -> "${edge.target}" [label="${edge.metrics.callCount}", penwidth=${weight}];\n`;
    }

    dot += '}\n';
    return dot;
  }

  /**
   * Export to Cytoscape.js format
   */
  private exportToCytoscape(): string {
    const elements = [];

    // Add nodes
    for (const node of this.serviceGraph.nodes) {
      elements.push({
        data: {
          id: node.id,
          label: node.name,
          type: node.type,
          health: node.health,
          metrics: node.metrics,
        },
      });
    }

    // Add edges
    for (const edge of this.serviceGraph.edges) {
      elements.push({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          metrics: edge.metrics,
        },
      });
    }

    return JSON.stringify({ elements }, null, 2);
  }

  /**
   * Set up periodic analysis
   */
  private setupPeriodicAnalysis(): void {
    // Analyze dependencies every 5 minutes
    setInterval(() => {
      if (this.traces.size > 0) {
        this.analyzeDependencies();
      }
    }, 300000);

    // Clean up old traces every hour
    setInterval(() => {
      this.cleanupOldTraces();
    }, 3600000);
  }

  /**
   * Clean up old traces to prevent memory leaks
   */
  private cleanupOldTraces(): void {
    const cutoff = Date.now() - 3600000; // 1 hour ago
    const tracesToDelete: string[] = [];

    for (const [traceId, spans] of this.traces.entries()) {
      const latestSpanTime = Math.max(
        ...spans.map((s) => s.startTime + s.duration),
      );
      if (latestSpanTime < cutoff) {
        tracesToDelete.push(traceId);
      }
    }

    for (const traceId of tracesToDelete) {
      this.traces.delete(traceId);
    }

    if (tracesToDelete.length > 0) {
      this.emit('traces_cleaned', { count: tracesToDelete.length });
    }
  }
}

/**
 * Anomaly Detection for service dependencies
 */
class AnomalyDetector {
  async detectAnomalies(
    currentGraph: ServiceDependencyGraph,
    history: DependencyAnalysis[],
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    if (history.length === 0) return anomalies;

    const previousGraph = history[history.length - 1].serviceDependencies;

    // Detect new dependencies
    for (const edge of currentGraph.edges) {
      const existsInPrevious = previousGraph.edges.some(
        (e) => e.source === edge.source && e.target === edge.target,
      );

      if (!existsInPrevious) {
        anomalies.push({
          type: 'new_dependency',
          service: edge.source,
          description: `New dependency detected: ${edge.source} -> ${edge.target}`,
          severity: 'medium',
          timestamp: Date.now(),
          metadata: { dependency: edge },
        });
      }
    }

    // Detect latency spikes
    for (const node of currentGraph.nodes) {
      const previousNode = previousGraph.nodes.find(
        (n) => n.name === node.name,
      );
      if (previousNode) {
        const latencyIncrease =
          node.metrics.avgLatency / previousNode.metrics.avgLatency;
        if (latencyIncrease > 2) {
          anomalies.push({
            type: 'latency_spike',
            service: node.name,
            description: `Latency spike detected: ${latencyIncrease.toFixed(2)}x increase`,
            severity: latencyIncrease > 5 ? 'critical' : 'high',
            timestamp: Date.now(),
            metadata: {
              currentLatency: node.metrics.avgLatency,
              previousLatency: previousNode.metrics.avgLatency,
              increase: latencyIncrease,
            },
          });
        }
      }
    }

    return anomalies;
  }
}

export default DependencyMapper;
