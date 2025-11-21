/**
 * Time Series Package Tests
 * Basic unit tests for time series storage and query functionality
 */

import { QueryBuilder, query } from '../query/QueryBuilder.js';

describe('QueryBuilder', () => {
  it('should build a basic query with time range', () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-01-31');

    const q = query()
      .metric('cpu_usage')
      .timeRange(start, end)
      .build();

    expect(q.metric_name).toBe('cpu_usage');
    expect(q.start_time).toEqual(start);
    expect(q.end_time).toEqual(end);
  });

  it('should support entity filtering', () => {
    const q = query()
      .metric('memory_usage')
      .entity('server-01', 'server')
      .timeRange(new Date('2025-01-01'), new Date('2025-01-31'))
      .build();

    expect(q.entity_id).toBe('server-01');
    expect(q.entity_type).toBe('server');
  });

  it('should support aggregation settings', () => {
    const q = query()
      .metric('requests')
      .timeRange(new Date('2025-01-01'), new Date('2025-01-31'))
      .interval('1h')
      .aggregate('sum')
      .build();

    expect(q.interval).toBe('1h');
    expect(q.aggregation).toBe('sum');
  });

  it('should support tags filtering', () => {
    const q = query()
      .metric('api_latency')
      .timeRange(new Date('2025-01-01'), new Date('2025-01-31'))
      .tag('region', 'us-east-1')
      .tag('environment', 'production')
      .build();

    expect(q.tags).toEqual({
      region: 'us-east-1',
      environment: 'production'
    });
  });

  it('should support limit and offset', () => {
    const q = query()
      .metric('events')
      .timeRange(new Date('2025-01-01'), new Date('2025-01-31'))
      .limit(100)
      .offset(50)
      .build();

    expect(q.limit).toBe(100);
    expect(q.offset).toBe(50);
  });

  it('should throw error when time range is missing', () => {
    expect(() => {
      query().metric('test').build();
    }).toThrow('Time range must be specified');
  });

  it('should parse duration strings correctly using last()', () => {
    const q = query()
      .metric('cpu')
      .last('24h')
      .build();

    expect(q.start_time).toBeDefined();
    expect(q.end_time).toBeDefined();
    expect(q.end_time!.getTime() - q.start_time!.getTime()).toBeCloseTo(24 * 60 * 60 * 1000, -3);
  });
});
