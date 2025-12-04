/**
 * Metrics Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MetricsRegistry,
  Counter,
  Gauge,
  Histogram,
  createMeshMetrics,
} from '../src/metrics.js';

describe('MetricsRegistry', () => {
  let registry: MetricsRegistry;

  beforeEach(() => {
    registry = new MetricsRegistry('test');
  });

  it('should create counter metrics', () => {
    const counter = registry.counter({
      name: 'requests_total',
      help: 'Total requests',
    });

    expect(counter).toBeInstanceOf(Counter);
  });

  it('should create gauge metrics', () => {
    const gauge = registry.gauge({
      name: 'active_connections',
      help: 'Active connections',
    });

    expect(gauge).toBeInstanceOf(Gauge);
  });

  it('should create histogram metrics', () => {
    const histogram = registry.histogram({
      name: 'request_duration',
      help: 'Request duration',
    });

    expect(histogram).toBeInstanceOf(Histogram);
  });

  it('should export metrics in Prometheus format', () => {
    const counter = registry.counter({
      name: 'requests_total',
      help: 'Total requests',
    });

    counter.inc({}, 5);

    const output = registry.export();
    expect(output).toContain('# HELP test_requests_total Total requests');
    expect(output).toContain('# TYPE test_requests_total counter');
    expect(output).toContain('test_requests_total 5');
  });
});

describe('Counter', () => {
  let registry: MetricsRegistry;

  beforeEach(() => {
    registry = new MetricsRegistry('test');
  });

  it('should increment by 1 by default', () => {
    const counter = registry.counter({ name: 'counter', help: 'Test counter' });
    counter.inc();
    counter.inc();

    const output = registry.export();
    expect(output).toContain('test_counter 2');
  });

  it('should increment by specified value', () => {
    const counter = registry.counter({ name: 'counter', help: 'Test counter' });
    counter.inc({}, 10);

    const output = registry.export();
    expect(output).toContain('test_counter 10');
  });

  it('should support labels', () => {
    const counter = registry.counter({
      name: 'counter',
      help: 'Test counter',
      labels: ['status'],
    });

    counter.inc({ status: 'success' }, 5);
    counter.inc({ status: 'error' }, 2);

    const output = registry.export();
    expect(output).toContain('status="success"');
    expect(output).toContain('status="error"');
  });
});

describe('Gauge', () => {
  let registry: MetricsRegistry;

  beforeEach(() => {
    registry = new MetricsRegistry('test');
  });

  it('should set value', () => {
    const gauge = registry.gauge({ name: 'gauge', help: 'Test gauge' });
    gauge.set({}, 42);

    const output = registry.export();
    expect(output).toContain('test_gauge 42');
  });

  it('should increment and decrement', () => {
    const gauge = registry.gauge({ name: 'gauge', help: 'Test gauge' });
    gauge.set({}, 10);
    gauge.inc({}, 5);
    gauge.dec({}, 3);

    const output = registry.export();
    expect(output).toContain('test_gauge 12');
  });
});

describe('Histogram', () => {
  let registry: MetricsRegistry;

  beforeEach(() => {
    registry = new MetricsRegistry('test');
  });

  it('should observe values', () => {
    const histogram = registry.histogram({
      name: 'duration',
      help: 'Duration',
      buckets: [0.1, 0.5, 1, 5],
    });

    histogram.observe({}, 0.3);
    histogram.observe({}, 0.8);
    histogram.observe({}, 2);

    const output = registry.export();
    expect(output).toContain('test_duration_bucket');
    expect(output).toContain('test_duration_sum');
    expect(output).toContain('test_duration_count');
  });

  it('should provide timer functionality', () => {
    const histogram = registry.histogram({
      name: 'duration',
      help: 'Duration',
    });

    const end = histogram.startTimer();
    // Simulate some work
    const duration = end();

    expect(duration).toBeGreaterThanOrEqual(0);
  });
});

describe('createMeshMetrics', () => {
  it('should create all mesh metrics', () => {
    const metrics = createMeshMetrics('mesh');

    expect(metrics.tasksTotal).toBeDefined();
    expect(metrics.taskDuration).toBeDefined();
    expect(metrics.agentInvocations).toBeDefined();
    expect(metrics.activeAgents).toBeDefined();
    expect(metrics.modelCalls).toBeDefined();
    expect(metrics.modelLatency).toBeDefined();
    expect(metrics.modelTokens).toBeDefined();
    expect(metrics.toolInvocations).toBeDefined();
    expect(metrics.toolLatency).toBeDefined();
    expect(metrics.policyDecisions).toBeDefined();
    expect(metrics.costUsd).toBeDefined();
  });

  it('should track task metrics', () => {
    const metrics = createMeshMetrics('mesh');

    metrics.tasksTotal.inc({ type: 'code_review', status: 'completed' });
    metrics.taskDuration.observe({ type: 'code_review' }, 2.5);

    const output = metrics.registry.export();
    expect(output).toContain('mesh_tasks_total');
    expect(output).toContain('mesh_task_duration');
  });
});
