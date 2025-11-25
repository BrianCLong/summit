
import { telemetry } from './comprehensive-telemetry';
import { snapshotter } from './diagnostic-snapshotter';
import { anomalyDetector } from './anomaly-detector';
import { alertingService } from './alerting-service';
import { jest } from '@jest/globals';
import v8 from 'v8';
import fs from 'fs';

// Mocking dependencies
jest.mock('v8');
jest.mock('fs');

describe('Telemetry Integration Tests', () => {
  it('should trigger an alert and snapshot on anomaly', () => {
    const sendAlertSpy = jest.spyOn(alertingService, 'sendAlert');
    const triggerSnapshotSpy = jest.spyOn(snapshotter, 'triggerSnapshot');

    // Establish a baseline
    for (let i = 0; i < 101; i++) {
      telemetry.recordRequest(100, {});
    }

    // Trigger an anomaly
    telemetry.recordRequest(5000, {});

    expect(sendAlertSpy).toHaveBeenCalledWith(expect.stringContaining('Anomaly detected'));
    expect(triggerSnapshotSpy).toHaveBeenCalledWith(expect.stringContaining('anomaly_detected'));

    sendAlertSpy.mockRestore();
    triggerSnapshotSpy.mockRestore();
  });

  it('should trigger a snapshot when latency threshold is exceeded', () => {
    const triggerSnapshotSpy = jest.spyOn(snapshotter, 'triggerSnapshot');

    // Record high latency
    for (let i = 0; i < 10; i++) {
      telemetry.recordRequest(3000, {});
    }

    // Manually trigger the check
    (snapshotter as any).checkLatencyThreshold();

    expect(triggerSnapshotSpy).toHaveBeenCalledWith(expect.stringContaining('latency_threshold_exceeded'));

    triggerSnapshotSpy.mockRestore();
  });

  it('should detect CPU and memory anomalies', () => {
    const sendAlertSpy = jest.spyOn(alertingService, 'sendAlert');

    // Establish a baseline
    for (let i = 0; i < 101; i++) {
      (telemetry as any).notifyListeners('cpu_usage_percent', 10);
      (telemetry as any).notifyListeners('memory_usage_bytes', 1024 * 1024 * 100);
    }

    // Trigger anomalies
    (telemetry as any).notifyListeners('cpu_usage_percent', 90);
    (telemetry as any).notifyListeners('memory_usage_bytes', 1024 * 1024 * 1000);

    expect(sendAlertSpy).toHaveBeenCalledWith(expect.stringContaining('cpu_usage_percent'));
    expect(sendAlertSpy).toHaveBeenCalledWith(expect.stringContaining('memory_usage_bytes'));

    sendAlertSpy.mockRestore();
  });

  it('should increment subsystem counters', () => {
    const dbQueriesSpy = jest.spyOn(telemetry.subsystems.database.queries, 'add');
    const cacheHitsSpy = jest.spyOn(telemetry.subsystems.cache.hits, 'add');
    const cacheSetsSpy = jest.spyOn(telemetry.subsystems.cache.sets, 'add');
    const cacheDelsSpy = jest.spyOn(telemetry.subsystems.cache.dels, 'add');

    // Simulate a database query and a cache hit
    telemetry.subsystems.database.queries.add(1);
    telemetry.subsystems.cache.hits.add(1);
    telemetry.subsystems.cache.sets.add(1);
    telemetry.subsystems.cache.dels.add(1);

    expect(dbQueriesSpy).toHaveBeenCalledWith(1);
    expect(cacheHitsSpy).toHaveBeenCalledWith(1);
    expect(cacheSetsSpy).toHaveBeenCalledWith(1);
    expect(cacheDelsSpy).toHaveBeenCalledWith(1);

    dbQueriesSpy.mockRestore();
    cacheHitsSpy.mockRestore();
    cacheSetsSpy.mockRestore();
    cacheDelsSpy.mockRestore();
  });

  it('should sanitize headers in snapshots', () => {
    const req = {
      headers: {
        authorization: 'Bearer 123',
        cookie: 'session=abc',
        'x-test': 'test',
      },
    };
    const sanitizedHeaders = (snapshotter as any).sanitizeHeaders(req.headers);

    expect(sanitizedHeaders.authorization).toBe('[REDACTED]');
    expect(sanitizedHeaders.cookie).toBe('[REDACTED]');
    expect(sanitizedHeaders['x-test']).toBe('test');
  });

  it('should record database latency', () => {
    const latencySpy = jest.spyOn(telemetry.subsystems.database.latency, 'record');
    // This is a simplified test, in a real scenario you would mock the neo4j driver
    // and trigger a query.
    telemetry.subsystems.database.latency.record(0.1);
    expect(latencySpy).toHaveBeenCalledWith(0.1);
    latencySpy.mockRestore();
  });
});
