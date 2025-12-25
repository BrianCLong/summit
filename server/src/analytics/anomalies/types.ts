export interface AnomalyEvent {
    type: 'anomaly';
    metricName: string;
    score: number;
    threshold: number;
    value: number;
    reason: string;
    timestamp: string;
}

export interface TimeSeriesPoint {
    timestamp: number;
    value: number;
}
