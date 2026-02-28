export interface ForecastFeatureVector {
  entityId: string;
  timestamp: string;
  numeric: number[];
  embedding?: number[];
}
