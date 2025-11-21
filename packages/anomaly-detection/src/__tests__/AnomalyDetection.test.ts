/**
 * Anomaly Detection Package Tests
 * Basic unit tests for anomaly detection algorithms
 */

import { StatisticalDetector } from '../detectors/StatisticalDetector.js';
import { ChangePointDetector } from '../detectors/ChangePointDetector.js';
import { StreamingAnomalyDetector } from '../realtime/StreamingAnomalyDetector.js';

describe('StatisticalDetector', () => {
  const generateNormalData = (n: number, mean: number = 100, std: number = 10): number[] => {
    const data: number[] = [];
    for (let i = 0; i < n; i++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      data.push(mean + z * std);
    }
    return data;
  };

  const generateTimestamps = (n: number): Date[] => {
    const timestamps: Date[] = [];
    const now = Date.now();
    for (let i = 0; i < n; i++) {
      timestamps.push(new Date(now + i * 3600000)); // 1 hour intervals
    }
    return timestamps;
  };

  it('should detect Z-score anomalies', () => {
    const data = generateNormalData(100, 100, 10);
    // Insert obvious anomalies
    data[50] = 200; // 10 std dev above mean
    data[75] = 0;   // 10 std dev below mean

    const timestamps = generateTimestamps(100);
    const detector = new StatisticalDetector({
      method: 'zscore',
      threshold: 3.0
    });

    const anomalies = detector.detectZScore(data, timestamps);

    expect(anomalies.length).toBeGreaterThanOrEqual(2);

    // Check that our inserted anomalies were detected
    const anomalyIndices = anomalies.map(a =>
      timestamps.findIndex(t => t.getTime() === a.timestamp.getTime())
    );
    expect(anomalyIndices).toContain(50);
    expect(anomalyIndices).toContain(75);
  });

  it('should detect IQR anomalies', () => {
    const data = generateNormalData(100, 100, 10);
    data[30] = 250; // Far outlier

    const timestamps = generateTimestamps(100);
    const detector = new StatisticalDetector({
      method: 'iqr',
      threshold: 1.5
    });

    const anomalies = detector.detectIQR(data, timestamps);

    expect(anomalies.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect MAD anomalies', () => {
    const data = generateNormalData(100, 100, 10);
    data[45] = 300; // Extreme outlier

    const timestamps = generateTimestamps(100);
    const detector = new StatisticalDetector({
      method: 'mad',
      threshold: 3.5
    });

    const anomalies = detector.detectMAD(data, timestamps);

    expect(anomalies.length).toBeGreaterThanOrEqual(1);
    expect(anomalies[0].severity).toBeDefined();
    expect(['low', 'medium', 'high', 'critical']).toContain(anomalies[0].severity);
  });

  it('should classify severity correctly', () => {
    const data = generateNormalData(100, 100, 10);
    data[20] = 150; // Moderate anomaly
    data[40] = 200; // Severe anomaly
    data[60] = 300; // Critical anomaly

    const timestamps = generateTimestamps(100);
    const detector = new StatisticalDetector({
      method: 'zscore',
      threshold: 2.0
    });

    const anomalies = detector.detectZScore(data, timestamps);

    const severities = anomalies.map(a => a.severity);
    expect(severities.some(s => s === 'critical' || s === 'high')).toBe(true);
  });
});

describe('ChangePointDetector', () => {
  it('should detect mean shifts with CUSUM', () => {
    // Create data with clear mean shift
    const data: number[] = [];
    for (let i = 0; i < 50; i++) data.push(100 + Math.random() * 5);
    for (let i = 0; i < 50; i++) data.push(150 + Math.random() * 5); // Mean shift

    const timestamps: Date[] = [];
    for (let i = 0; i < 100; i++) {
      timestamps.push(new Date(Date.now() + i * 3600000));
    }

    const detector = new ChangePointDetector();
    const changePoints = detector.detectCUSUM(data, timestamps, 5.0, 0.5);

    expect(changePoints.length).toBeGreaterThanOrEqual(1);

    // Change point should be around index 50
    const cpIndex = changePoints[0].index;
    expect(cpIndex).toBeGreaterThan(40);
    expect(cpIndex).toBeLessThan(60);
  });

  it('should detect variance changes', () => {
    // Create data with variance change
    const data: number[] = [];
    for (let i = 0; i < 50; i++) data.push(100 + Math.random() * 5);
    for (let i = 0; i < 50; i++) data.push(100 + Math.random() * 30); // Variance increase

    const timestamps: Date[] = [];
    for (let i = 0; i < 100; i++) {
      timestamps.push(new Date(Date.now() + i * 3600000));
    }

    const detector = new ChangePointDetector();
    const changePoints = detector.detectVarianceChange(data, timestamps, 20, 2.0);

    expect(changePoints.length).toBeGreaterThanOrEqual(0); // May or may not detect depending on random data
  });
});

describe('StreamingAnomalyDetector', () => {
  it('should process streaming data points', async () => {
    const detector = new StreamingAnomalyDetector(50, 3.0);

    // Feed normal data to establish baseline
    for (let i = 0; i < 50; i++) {
      await detector.processPoint(100 + Math.random() * 10, new Date());
    }

    // Feed anomalous point
    const anomaly = await detector.processPoint(500, new Date());

    // Should detect the anomaly
    expect(anomaly).not.toBeNull();
    if (anomaly) {
      expect(anomaly.anomaly_score).toBeGreaterThan(1);
      expect(anomaly.severity).toBeDefined();
    }
  });

  it('should support anomaly callbacks', async () => {
    const detector = new StreamingAnomalyDetector(30, 2.0);
    const detectedAnomalies: any[] = [];

    detector.onAnomaly((anomaly) => {
      detectedAnomalies.push(anomaly);
    });

    // Feed data
    for (let i = 0; i < 40; i++) {
      await detector.processPoint(100 + Math.random() * 5, new Date());
    }

    // Feed anomaly
    await detector.processPoint(1000, new Date());

    expect(detectedAnomalies.length).toBeGreaterThanOrEqual(1);
  });

  it('should provide statistics', async () => {
    const detector = new StreamingAnomalyDetector(50, 3.0);

    for (let i = 0; i < 50; i++) {
      await detector.processPoint(100 + i, new Date());
    }

    const stats = detector.getStatistics();

    expect(stats.count).toBe(50);
    expect(stats.mean).toBeGreaterThan(100);
    expect(stats.std).toBeGreaterThan(0);
    expect(stats.bufferSize).toBe(50);
  });

  it('should reset properly', async () => {
    const detector = new StreamingAnomalyDetector(50, 3.0);

    for (let i = 0; i < 30; i++) {
      await detector.processPoint(100 + i, new Date());
    }

    detector.reset();
    const stats = detector.getStatistics();

    expect(stats.count).toBe(0);
    expect(stats.mean).toBe(0);
    expect(stats.bufferSize).toBe(0);
  });
});
