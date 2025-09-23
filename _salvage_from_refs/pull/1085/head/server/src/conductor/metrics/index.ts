// Metrics and Observability for MoE Conductor
// Provides Prometheus metrics, health checks, and performance monitoring

import { ExpertType } from '../types';

export interface MetricsRegistry {
  // Counters
  incrementCounter(name: string, labels?: Record<string, string>): void;
  
  // Histograms 
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
  
  // Gauges
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
}

export class ConductorMetrics {
  private counters = new Map<string, { value: number; labels: Record<string, string> }>();
  private histograms = new Map<string, { values: number[]; labels: Record<string, string> }>();
  private gauges = new Map<string, { value: number; labels: Record<string, string> }>();

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // Initialize core metrics
    this.setGauge('conductor_active_tasks', 0);
    this.setGauge('conductor_total_experts', 7);
    
    // Initialize expert counters
    const experts: ExpertType[] = [
      'LLM_LIGHT', 'LLM_HEAVY', 'GRAPH_TOOL', 'RAG_TOOL',
      'FILES_TOOL', 'OSINT_TOOL', 'EXPORT_TOOL'
    ];
    
    experts.forEach(expert => {
      this.incrementCounter('conductor_router_decisions_total', { expert, result: 'success' }, 0);
      this.incrementCounter('conductor_router_decisions_total', { expert, result: 'error' }, 0);
    });
  }

  /**
   * Record a routing decision
   */
  public recordRoutingDecision(expert: ExpertType, latencyMs: number, success: boolean): void {
    // Decision counter
    this.incrementCounter('conductor_router_decisions_total', {
      expert,
      result: success ? 'success' : 'error'
    });

    // Decision latency
    this.recordHistogram('conductor_routing_latency_ms', latencyMs, { expert });
  }

  /**
   * Record expert execution
   */
  public recordExpertExecution(
    expert: ExpertType, 
    latencyMs: number, 
    cost: number, 
    success: boolean
  ): void {
    // Execution counter
    this.incrementCounter('conductor_expert_executions_total', {
      expert,
      result: success ? 'success' : 'error'
    });

    // Latency histogram
    this.recordHistogram('conductor_expert_latency_ms', latencyMs, { expert });

    // Cost histogram
    this.recordHistogram('conductor_expert_cost_usd', cost, { expert });
  }

  /**
   * Record MCP operation
   */
  public recordMCPOperation(
    serverName: string,
    toolName: string,
    latencyMs: number,
    success: boolean
  ): void {
    // MCP operation counter
    this.incrementCounter('conductor_mcp_operations_total', {
      server: serverName,
      tool: toolName,
      result: success ? 'success' : 'error'
    });

    // MCP latency
    this.recordHistogram('conductor_mcp_latency_ms', latencyMs, {
      server: serverName,
      tool: toolName
    });
  }

  /**
   * Update active task count
   */
  public updateActiveTaskCount(count: number): void {
    this.setGauge('conductor_active_tasks', count);
  }

  /**
   * Record security event
   */
  public recordSecurityEvent(eventType: string, success: boolean): void {
    this.incrementCounter('conductor_security_events_total', {
      type: eventType,
      result: success ? 'allowed' : 'denied'
    });
  }

  // Base metric operations
  public incrementCounter(name: string, labels: Record<string, string> = {}, amount: number = 1): void {
    const key = this.getMetricKey(name, labels);
    const existing = this.counters.get(key) || { value: 0, labels };
    this.counters.set(key, { value: existing.value + amount, labels });
  }

  public recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, labels);
    const existing = this.histograms.get(key) || { values: [], labels };
    existing.values.push(value);
    
    // Keep only last 1000 values for memory efficiency
    if (existing.values.length > 1000) {
      existing.values = existing.values.slice(-1000);
    }
    
    this.histograms.set(key, existing);
  }

  public setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getMetricKey(name, labels);
    this.gauges.set(key, { value, labels });
  }

  private getMetricKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  /**
   * Export metrics in Prometheus format
   */
  public exportPrometheusMetrics(): string {
    const lines: string[] = [];
    
    // Export counters
    this.counters.forEach((metric, key) => {
      lines.push(`${key} ${metric.value}`);
    });
    
    // Export gauges
    this.gauges.forEach((metric, key) => {
      lines.push(`${key} ${metric.value}`);
    });
    
    // Export histogram summaries
    this.histograms.forEach((metric, key) => {
      const values = metric.values;
      if (values.length === 0) return;
      
      const sorted = [...values].sort((a, b) => a - b);
      const count = values.length;
      const sum = values.reduce((a, b) => a + b, 0);
      
      // Basic percentiles
      const p50 = sorted[Math.floor(count * 0.5)];
      const p95 = sorted[Math.floor(count * 0.95)];
      const p99 = sorted[Math.floor(count * 0.99)];
      
      const baseName = key.replace(/\{.*\}/, '');
      const labels = key.includes('{') ? key.match(/\{([^}]+)\}/)?.[1] || '' : '';
      const labelStr = labels ? `{${labels}}` : '';
      
      lines.push(`${baseName}_count${labelStr} ${count}`);
      lines.push(`${baseName}_sum${labelStr} ${sum}`);
      lines.push(`${baseName}_p50${labelStr} ${p50}`);
      lines.push(`${baseName}_p95${labelStr} ${p95}`);
      lines.push(`${baseName}_p99${labelStr} ${p99}`);
    });
    
    return lines.join('\n');
  }

  /**
   * Get metrics summary for health checks
   */
  public getSummary(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, { count: number; avg: number; p95: number }>;
  } {
    const summary = {
      counters: {} as Record<string, number>,
      gauges: {} as Record<string, number>,
      histograms: {} as Record<string, { count: number; avg: number; p95: number }>
    };
    
    // Summarize counters
    this.counters.forEach((metric, key) => {
      summary.counters[key] = metric.value;
    });
    
    // Summarize gauges
    this.gauges.forEach((metric, key) => {
      summary.gauges[key] = metric.value;
    });
    
    // Summarize histograms
    this.histograms.forEach((metric, key) => {
      const values = metric.values;
      if (values.length === 0) return;
      
      const sorted = [...values].sort((a, b) => a - b);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const p95 = sorted[Math.floor(values.length * 0.95)];
      
      summary.histograms[key] = {
        count: values.length,
        avg: Math.round(avg * 100) / 100,
        p95: Math.round(p95 * 100) / 100
      };
    });
    
    return summary;
  }

  /**
   * Reset all metrics (for testing)
   */
  public reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
    this.initializeMetrics();
  }
}

// Health check utilities
export class HealthChecker {
  constructor(private metrics: ConductorMetrics) {}

  /**
   * Perform comprehensive health check
   */
  public async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message: string;
      duration_ms?: number;
    }>;
  }> {
    const checks = [];
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check active tasks
    const activeTasksCheck = await this.checkActiveTasks();
    checks.push(activeTasksCheck);
    if (activeTasksCheck.status === 'fail') overallStatus = 'unhealthy';
    if (activeTasksCheck.status === 'warn' && overallStatus === 'healthy') overallStatus = 'degraded';

    // Check error rates
    const errorRateCheck = this.checkErrorRates();
    checks.push(errorRateCheck);
    if (errorRateCheck.status === 'fail') overallStatus = 'unhealthy';
    if (errorRateCheck.status === 'warn' && overallStatus === 'healthy') overallStatus = 'degraded';

    // Check latencies
    const latencyCheck = this.checkLatencies();
    checks.push(latencyCheck);
    if (latencyCheck.status === 'fail') overallStatus = 'unhealthy';
    if (latencyCheck.status === 'warn' && overallStatus === 'healthy') overallStatus = 'degraded';

    return { status: overallStatus, checks };
  }

  private async checkActiveTasks(): Promise<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
  }> {
    const summary = this.metrics.getSummary();
    const activeTasks = summary.gauges['conductor_active_tasks'] || 0;

    if (activeTasks > 50) {
      return {
        name: 'active_tasks',
        status: 'fail',
        message: `Too many active tasks: ${activeTasks}`
      };
    } else if (activeTasks > 20) {
      return {
        name: 'active_tasks',
        status: 'warn', 
        message: `High number of active tasks: ${activeTasks}`
      };
    } else {
      return {
        name: 'active_tasks',
        status: 'pass',
        message: `Active tasks: ${activeTasks}`
      };
    }
  }

  private checkErrorRates(): {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
  } {
    const summary = this.metrics.getSummary();
    let totalRequests = 0;
    let totalErrors = 0;

    // Count total requests and errors across all experts
    Object.entries(summary.counters).forEach(([key, value]) => {
      if (key.includes('conductor_expert_executions_total')) {
        totalRequests += value;
        if (key.includes('result="error"')) {
          totalErrors += value;
        }
      }
    });

    if (totalRequests === 0) {
      return {
        name: 'error_rate',
        status: 'pass',
        message: 'No requests to analyze'
      };
    }

    const errorRate = (totalErrors / totalRequests) * 100;

    if (errorRate > 10) {
      return {
        name: 'error_rate',
        status: 'fail',
        message: `High error rate: ${errorRate.toFixed(1)}%`
      };
    } else if (errorRate > 5) {
      return {
        name: 'error_rate',
        status: 'warn',
        message: `Elevated error rate: ${errorRate.toFixed(1)}%`
      };
    } else {
      return {
        name: 'error_rate',
        status: 'pass',
        message: `Error rate: ${errorRate.toFixed(1)}%`
      };
    }
  }

  private checkLatencies(): {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
  } {
    const summary = this.metrics.getSummary();
    
    // Find the highest P95 latency across all experts
    let maxP95 = 0;
    Object.entries(summary.histograms).forEach(([key, hist]) => {
      if (key.includes('conductor_expert_latency_ms')) {
        maxP95 = Math.max(maxP95, hist.p95);
      }
    });

    if (maxP95 === 0) {
      return {
        name: 'latency',
        status: 'pass',
        message: 'No latency data available'
      };
    }

    if (maxP95 > 10000) { // 10 seconds
      return {
        name: 'latency',
        status: 'fail',
        message: `High P95 latency: ${maxP95}ms`
      };
    } else if (maxP95 > 5000) { // 5 seconds
      return {
        name: 'latency',
        status: 'warn',
        message: `Elevated P95 latency: ${maxP95}ms`
      };
    } else {
      return {
        name: 'latency',
        status: 'pass',
        message: `P95 latency: ${maxP95}ms`
      };
    }
  }
}

// Singleton instances
export const conductorMetrics = new ConductorMetrics();
export const healthChecker = new HealthChecker(conductorMetrics);

/**
 * Get conductor system health for API endpoints
 */
export async function getConductorHealth() {
  return await healthChecker.checkHealth();
}
