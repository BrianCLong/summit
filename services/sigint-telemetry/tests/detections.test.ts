/**
 * Detection engine tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DetectionEngine, createDetectionEngine } from '../src/detections/engine.js';
import { allRules } from '../src/detections/rules/index.js';
import { identityRules } from '../src/detections/rules/identity.js';
import { networkRules } from '../src/detections/rules/network.js';
import { AnomalyDetector, createAnomalyDetector } from '../src/detections/anomaly.js';

describe('DetectionEngine', () => {
  let engine: DetectionEngine;

  beforeEach(() => {
    engine = createDetectionEngine();
    engine.registerRules(allRules);
  });

  it('should register rules', () => {
    const rules = engine.getRules();
    expect(rules.length).toBe(allRules.length);
  });

  it('should detect impossible travel', () => {
    const event = {
      id: 'test-001',
      eventType: 'identity.auth',
      impossibleTravel: true,
      result: 'success',
      riskScore: 80,
    };

    const results = engine.evaluate(event);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.ruleName.includes('Impossible Travel'))).toBe(true);
  });

  it('should detect high DGA score', () => {
    const event = {
      id: 'test-002',
      eventType: 'network.dns',
      queryName: 'asdkjhaskdjhaskdjh.suspicious.example',
      dgaScore: 0.85,
      isNewlyObserved: true,
    };

    const results = engine.evaluate(event);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.ruleName.includes('DGA'))).toBe(true);
  });

  it('should detect suspicious process execution', () => {
    const event = {
      id: 'test-003',
      eventType: 'endpoint.process',
      processName: 'powershell.exe',
      isElevated: true,
      commandLine: 'powershell.exe -enc SGVsbG8gV29ybGQ=',
    };

    const results = engine.evaluate(event);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should detect MFA disabled', () => {
    const event = {
      id: 'test-004',
      eventType: 'cloud.iam',
      action: 'mfa_disabled',
      actorType: 'user',
    };

    const results = engine.evaluate(event);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.severity === 'critical')).toBe(true);
  });

  it('should not detect normal events', () => {
    const event = {
      id: 'test-005',
      eventType: 'identity.auth',
      result: 'success',
      riskScore: 10,
      impossibleTravel: false,
      authMethod: 'mfa_totp',
    };

    const results = engine.evaluate(event);
    // May have some low-confidence detections, but none critical
    const critical = results.filter((r) => r.severity === 'critical');
    expect(critical.length).toBe(0);
  });

  it('should evaluate batch of events', () => {
    const events = [
      { id: '1', eventType: 'identity.auth', impossibleTravel: true },
      { id: '2', eventType: 'network.dns', dgaScore: 0.9 },
      { id: '3', eventType: 'identity.auth', result: 'success', riskScore: 5 },
    ];

    const results = engine.evaluateBatch(events);
    expect(results.size).toBeGreaterThan(0);
    expect(results.has('1') || results.has('2')).toBe(true);
  });

  it('should calculate statistics', () => {
    const events = [
      { id: '1', eventType: 'identity.auth', impossibleTravel: true },
      { id: '2', eventType: 'cloud.iam', action: 'mfa_disabled' },
    ];

    const results = engine.evaluateBatch(events);
    const stats = engine.getStats(results);

    expect(stats.eventsWithDetections).toBeGreaterThan(0);
    expect(stats.totalDetections).toBeGreaterThan(0);
  });

  it('should respect minConfidence setting', () => {
    const strictEngine = createDetectionEngine({ minConfidence: 0.9 });
    strictEngine.registerRules(allRules);

    const event = {
      id: 'test-006',
      eventType: 'network.flow',
      action: 'deny',
    };

    const results = strictEngine.evaluate(event);
    // Low confidence detections should be filtered
    results.forEach((r) => {
      expect(r.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });
});

describe('AnomalyDetector', () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = createAnomalyDetector({ minSamples: 5 });
  });

  it('should build baseline from values', () => {
    // Use deterministic values for testing
    const values = [100, 102, 104, 106, 108, 101, 103, 105, 107, 109];
    for (const v of values) {
      detector.updateBaseline('test.metric', v);
    }

    const baseline = detector.getBaseline('test.metric');
    expect(baseline).toBeDefined();
    expect(baseline?.count).toBe(10);
    expect(baseline?.mean).toBeCloseTo(104.5, 0);
  });

  it('should detect anomalies', () => {
    // Build baseline with values around 100
    for (let i = 0; i < 20; i++) {
      detector.updateBaseline('test.metric', 100 + (Math.random() - 0.5) * 10);
    }

    // Check anomalous value
    const result = detector.detect('test.metric', 500);
    expect(result).toBeDefined();
    expect(result?.isAnomaly).toBe(true);
    expect(result?.zscore).toBeGreaterThan(3);
  });

  it('should not flag normal values', () => {
    // Use values with some variance (detector returns null for zero variance)
    for (let i = 0; i < 20; i++) {
      detector.updateBaseline('test.metric', 100 + (i % 2));
    }

    const result = detector.detect('test.metric', 100);
    expect(result).toBeDefined();
    expect(result?.isAnomaly).toBe(false);
  });

  it('should extract metrics from events', () => {
    const event = {
      eventType: 'network.flow',
      bytesIn: 1000,
      bytesOut: 2000,
      durationMs: 150,
    };

    const metrics = detector.extractMetrics(event);
    expect(metrics['network.flow.bytesIn']).toBe(1000);
    expect(metrics['network.flow.bytesOut']).toBe(2000);
    expect(metrics['network.flow.durationMs']).toBe(150);
  });

  it('should process events and detect anomalies', () => {
    // Process normal events
    for (let i = 0; i < 20; i++) {
      detector.processEvent({
        eventType: 'network.flow',
        bytesOut: 1000 + Math.random() * 100,
      });
    }

    // Process anomalous event
    const anomalies = detector.processEvent({
      eventType: 'network.flow',
      bytesOut: 100000, // Much higher than baseline
    });

    expect(anomalies.length).toBeGreaterThan(0);
  });
});
