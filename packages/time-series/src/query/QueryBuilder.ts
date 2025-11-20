/**
 * IntelGraph Time Series Query Builder
 * Fluent API for building complex time series queries
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { TimeSeriesQuery } from '../models/TimeSeries.js';

export class QueryBuilder {
  private query: Partial<TimeSeriesQuery> = {};

  metric(name: string): this {
    this.query.metric_name = name;
    return this;
  }

  entity(id: string, type?: string): this {
    this.query.entity_id = id;
    if (type) {
      this.query.entity_type = type;
    }
    return this;
  }

  timeRange(start: Date, end: Date): this {
    this.query.start_time = start;
    this.query.end_time = end;
    return this;
  }

  last(duration: string): this {
    const now = new Date();
    const start = this.parseDuration(duration);
    this.query.start_time = new Date(now.getTime() - start);
    this.query.end_time = now;
    return this;
  }

  interval(interval: string): this {
    this.query.interval = interval;
    return this;
  }

  aggregate(method: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'stddev'): this {
    this.query.aggregation = method;
    return this;
  }

  tag(key: string, value: string): this {
    if (!this.query.tags) {
      this.query.tags = {};
    }
    this.query.tags[key] = value;
    return this;
  }

  tags(tags: Record<string, string>): this {
    this.query.tags = tags;
    return this;
  }

  limit(limit: number): this {
    this.query.limit = limit;
    return this;
  }

  offset(offset: number): this {
    this.query.offset = offset;
    return this;
  }

  build(): TimeSeriesQuery {
    if (!this.query.start_time || !this.query.end_time) {
      throw new Error('Time range must be specified');
    }
    return this.query as TimeSeriesQuery;
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhdw])$/);
    if (!match) {
      throw new Error(`Invalid duration format: ${duration}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }
}

export function query(): QueryBuilder {
  return new QueryBuilder();
}
