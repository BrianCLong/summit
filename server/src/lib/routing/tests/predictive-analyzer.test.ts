
import PredictiveAnalyzer from '../predictive-analyzer';

describe('PredictiveAnalyzer', () => {
  let analyzer: typeof PredictiveAnalyzer;

  beforeEach(() => {
    analyzer = PredictiveAnalyzer;
  });

  test('should analyze trends correctly', () => {
    const increasingData = [{ timestamp: 1, value: 10 }, { timestamp: 2, value: 20 }];
    const decreasingData = [{ timestamp: 1, value: 20 }, { timestamp: 2, value: 10 }];
    const stableData = [{ timestamp: 1, value: 10 }, { timestamp: 2, value: 12 }];
    expect(analyzer.analyzeTrend(increasingData)).toBe('increasing');
    expect(analyzer.analyzeTrend(decreasingData)).toBe('decreasing');
    expect(analyzer.analyzeTrend(stableData)).toBe('stable');
  });

  test('should predict spikes', () => {
    const spikeData = [{ timestamp: 1, value: 10 }, { timestamp: 2, value: 20 }, { timestamp: 3, value: 50 }];
    const noSpikeData = [{ timestamp: 1, value: 10 }, { timestamp: 2, value: 12 }, { timestamp: 3, value: 15 }];
    expect(analyzer.predictSpike(spikeData)).toBe(true);
    expect(analyzer.predictSpike(noSpikeData)).toBe(false);
  });

  test('should detect anomalies', () => {
    const anomalyData = [
      { timestamp: 1, value: 10 },
      { timestamp: 2, value: 12 },
      { timestamp: 3, value: 11 },
      { timestamp: 4, value: 9 },
      { timestamp: 5, value: 100 }, // Anomaly
    ];
    const noAnomalyData = [
      { timestamp: 1, value: 10 },
      { timestamp: 2, value: 12 },
      { timestamp: 3, value: 11 },
      { timestamp: 4, value: 9 },
      { timestamp: 5, value: 13 },
    ];
    expect(analyzer.detectAnomaly(anomalyData)).toEqual({ timestamp: 5, value: 100 });
    expect(analyzer.detectAnomaly(noAnomalyData)).toBe(null);
  });
});
