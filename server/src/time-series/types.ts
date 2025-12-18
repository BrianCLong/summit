export type NumericFields = Record<string, number>;

export type Tags = Record<string, string>;

export type TimeSeriesPoint = {
  measurement: string;
  fields: NumericFields;
  tags?: Tags;
  timestamp: Date;
};

export type QueryRangeParams = {
  measurement: string;
  start: Date;
  end: Date;
  fields?: string[];
  tags?: Tags;
  limit?: number;
};

export type AggregationWindow = {
  every: string; // e.g. '1m', '5m'
  function: 'avg' | 'sum' | 'min' | 'max' | 'median' | 'p95' | 'p99';
};

export type AggregationParams = QueryRangeParams & {
  window: AggregationWindow;
};

export type TimeSeriesRow = {
  timestamp: Date;
  values: NumericFields;
  tags?: Tags;
};

export type Anomaly = {
  timestamp: Date;
  value: number;
  zScore: number;
};

export type ForecastPoint = {
  timestamp: Date;
  predicted: number;
  lower: number;
  upper: number;
};

export interface TimeSeriesConnector {
  writePoints(points: TimeSeriesPoint[]): Promise<void>;
  queryRange(params: QueryRangeParams): Promise<TimeSeriesRow[]>;
  aggregate(params: AggregationParams): Promise<TimeSeriesRow[]>;
}
