import {
  neo4jPerformanceMonitor,
  Neo4jPerformanceMonitor,
} from '../neo4jPerformanceMonitor.js';
import {
  neo4jQueryErrorsTotal,
  neo4jQueryLatencyMs,
  neo4jQueryTotal,
} from '../../metrics/neo4jMetrics.js';

describe('Neo4jPerformanceMonitor', () => {
  beforeEach(() => {
    neo4jPerformanceMonitor.reset();
  });

  it('tracks slow queries and records latency metrics', () => {
    const customMonitor = new Neo4jPerformanceMonitor({
      slowQueryThresholdMs: 100,
      maxTrackedQueries: 5,
    });

    customMonitor.recordSuccess({
      cypher: 'MATCH (n:Person) RETURN n',
      params: { limit: 10 },
      durationMs: 150,
      labels: { operation: 'read', label: 'Person' },
    });

    const latencyValues = neo4jQueryLatencyMs.get().values;
    const totalValues = neo4jQueryTotal.get().values;

    expect(latencyValues[0].value).toBeGreaterThan(0);
    expect(totalValues[0].value).toBe(1);
    expect(customMonitor.getSlowQueries()).toHaveLength(1);
  });

  it('records errors with labels', () => {
    neo4jPerformanceMonitor.recordError({
      cypher: 'CREATE (n:Alert {id: $id})',
      params: { id: '123' },
      durationMs: 25,
      labels: { operation: 'write', label: 'Alert' },
      error: 'Write failed',
    });

    const errorValues = neo4jQueryErrorsTotal.get().values;
    expect(errorValues[0].value).toBe(1);
    expect(neo4jPerformanceMonitor.getRecentErrors()).toHaveLength(1);
  });
});
