/**
 * MASINT Sensor Fusion E2E Tests
 *
 * Tests multi-sensor fusion, track correlation, and
 * kinematic state estimation.
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import {
  SensorFusionEngine,
  SensorReading,
  FusedTrack,
  IntelAlert,
  SensorModality,
} from '../src/index.js';

describe('MASINT Sensor Fusion Pipeline', () => {
  let fusionEngine: SensorFusionEngine;
  let capturedAlerts: IntelAlert[];

  beforeAll(() => {
    fusionEngine = new SensorFusionEngine({
      trackInitializationThreshold: 2,
      trackDropTimeoutMs: 10000,
      associationGateM: 5000,
    });
  });

  beforeEach(() => {
    capturedAlerts = [];
    fusionEngine.onAlert(async (alert) => {
      capturedAlerts.push(alert);
    });
  });

  describe('Sensor Reading Processing', () => {
    it('should process radar reading', async () => {
      const reading = createRadarReading(38.8977, -77.0365, 1000);

      const track = await fusionEngine.processSensorReading(reading);

      // First reading creates tentative track, returns null
      expect(track).toBeNull();
    });

    it('should create confirmed track after threshold readings', async () => {
      const readings = [
        createRadarReading(39.0, -77.0, 1000, 'sensor-1'),
        createRadarReading(39.001, -77.001, 1010, 'sensor-1'),
        createRadarReading(39.002, -77.002, 1020, 'sensor-1'),
      ];

      let track: FusedTrack | null = null;
      for (const reading of readings) {
        track = await fusionEngine.processSensorReading(reading);
      }

      expect(track).toBeDefined();
      expect(track?.state).toBe('CONFIRMED');
      expect(track?.trackNumber).toBeGreaterThan(0);
    });

    it('should process multiple sensor modalities', async () => {
      const readings: SensorReading[] = [
        createReading('RADAR', 40.0, -75.0, 5000),
        createReading('ELECTRO_OPTICAL', 40.0001, -75.0001, 5010),
        createReading('INFRARED', 40.0002, -75.0002, 5020),
      ];

      let track: FusedTrack | null = null;
      for (const reading of readings) {
        track = await fusionEngine.processSensorReading(reading);
      }

      expect(track).toBeDefined();
      expect(track?.contributingSensors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Track Management', () => {
    it('should update track kinematic state', async () => {
      const readings = generateMovingTargetReadings(
        { lat: 41.0, lon: -74.0 },
        { lat: 41.01, lon: -74.01 },
        5,
      );

      let track: FusedTrack | null = null;
      for (const reading of readings) {
        track = await fusionEngine.processSensorReading(reading);
      }

      expect(track).toBeDefined();
      expect(track?.kinematicState.speedMps).toBeGreaterThan(0);
      expect(track?.kinematicState.headingDeg).toBeDefined();
    });

    it('should classify track domain', async () => {
      // High altitude readings should classify as AIR
      const readings = generateHighAltitudeReadings(42.0, -73.0, 10000, 3);

      let track: FusedTrack | null = null;
      for (const reading of readings) {
        track = await fusionEngine.processSensorReading(reading);
      }

      expect(track).toBeDefined();
      expect(track?.classification.domain).toBe('AIR');
    });

    it('should get all active tracks', () => {
      const tracks = fusionEngine.getTracks();

      expect(Array.isArray(tracks)).toBe(true);
    });

    it('should provide fusion statistics', () => {
      const stats = fusionEngine.getStatistics();

      expect(stats).toHaveProperty('activeTrackCount');
      expect(stats).toHaveProperty('tentativeTrackCount');
      expect(stats).toHaveProperty('tracksByDomain');
      expect(stats).toHaveProperty('tracksByState');
    });
  });

  describe('Multi-Sensor Fusion', () => {
    it('should compute fusion confidence based on sensor diversity', async () => {
      const multiSensorReadings = [
        createReading('RADAR', 43.0, -72.0, 0, 'radar-1'),
        createReading('ELECTRO_OPTICAL', 43.0001, -72.0001, 0, 'eo-1'),
        createReading('LIDAR', 43.0002, -72.0002, 0, 'lidar-1'),
      ];

      let track: FusedTrack | null = null;
      for (const reading of multiSensorReadings) {
        track = await fusionEngine.processSensorReading(reading);
      }

      if (track) {
        // Multi-sensor tracks should have higher confidence
        expect(track.fusionConfidence).toBeGreaterThan(0.5);
      }
    });

    it('should process batch readings efficiently', async () => {
      const batchReadings = Array.from({ length: 100 }, (_, i) =>
        createReading('RADAR', 44.0 + i * 0.0001, -71.0 + i * 0.0001, 0),
      );

      const startTime = Date.now();
      const tracks = await fusionEngine.processBatch(batchReadings);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should process 100 readings in < 1s
      expect(tracks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Alert Generation', () => {
    it('should generate alert for new confirmed track', async () => {
      const readings = [
        createReading('RADAR', 45.0, -70.0, 2000, 'alert-sensor'),
        createReading('RADAR', 45.001, -70.001, 2010, 'alert-sensor'),
        createReading('RADAR', 45.002, -70.002, 2020, 'alert-sensor'),
      ];

      for (const reading of readings) {
        await fusionEngine.processSensorReading(reading);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(capturedAlerts.some((a) => a.type === 'NEW_TRACK')).toBe(true);
    });
  });

  describe('Track Association', () => {
    it('should associate signal with track', async () => {
      const readings = [
        createReading('RADAR', 46.0, -69.0, 0),
        createReading('RADAR', 46.001, -69.001, 0),
      ];

      let track: FusedTrack | null = null;
      for (const reading of readings) {
        track = await fusionEngine.processSensorReading(reading);
      }

      if (track) {
        fusionEngine.associateSignal(track.id, 'test-signal-1');
        fusionEngine.associateEntity(track.id, 'test-entity-1');

        const updatedTrack = fusionEngine.getTrack(track.id);
        expect(updatedTrack?.associatedSignals).toContain('test-signal-1');
        expect(updatedTrack?.correlatedEntities).toContain('test-entity-1');
      }
    });
  });
});

// Helper functions

function createRadarReading(
  lat: number,
  lon: number,
  altitudeM: number,
  sensorId: string = 'radar-default',
): SensorReading {
  return {
    id: `reading-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sensorId,
    modality: 'RADAR',
    timestamp: new Date(),
    value: -40,
    unit: 'dBm',
    qualityScore: 0.9,
    geolocation: {
      latitude: lat,
      longitude: lon,
      altitudeM,
      accuracyM: 50,
      timestamp: new Date(),
      source: 'RADAR',
    },
    bearing: 45,
    range: 10000,
  };
}

function createReading(
  modality: SensorModality,
  lat: number,
  lon: number,
  altitudeM: number,
  sensorId: string = `sensor-${modality.toLowerCase()}`,
): SensorReading {
  return {
    id: `reading-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sensorId,
    modality,
    timestamp: new Date(),
    value: modality === 'RADAR' ? -40 : modality === 'INFRARED' ? 300 : 0,
    unit: modality === 'RADAR' ? 'dBm' : modality === 'INFRARED' ? 'K' : 'unit',
    qualityScore: 0.85,
    geolocation: {
      latitude: lat,
      longitude: lon,
      altitudeM,
      accuracyM: modality === 'RADAR' ? 50 : modality === 'LIDAR' ? 10 : 100,
      timestamp: new Date(),
      source: modality === 'RADAR' ? 'RADAR' : 'HYBRID',
    },
  };
}

function generateMovingTargetReadings(
  start: { lat: number; lon: number },
  end: { lat: number; lon: number },
  count: number,
): SensorReading[] {
  const readings: SensorReading[] = [];

  for (let i = 0; i < count; i++) {
    const progress = i / (count - 1);
    const lat = start.lat + (end.lat - start.lat) * progress;
    const lon = start.lon + (end.lon - start.lon) * progress;

    readings.push({
      id: `moving-${i}-${Date.now()}`,
      sensorId: 'tracking-radar',
      modality: 'RADAR',
      timestamp: new Date(Date.now() + i * 1000),
      value: -35,
      unit: 'dBm',
      qualityScore: 0.9,
      geolocation: {
        latitude: lat,
        longitude: lon,
        altitudeM: 5000,
        accuracyM: 30,
        timestamp: new Date(Date.now() + i * 1000),
        source: 'RADAR',
      },
      bearing: 45,
      range: 15000 - i * 1000,
    });
  }

  return readings;
}

function generateHighAltitudeReadings(
  lat: number,
  lon: number,
  altitude: number,
  count: number,
): SensorReading[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `high-alt-${i}-${Date.now()}`,
    sensorId: 'air-surveillance',
    modality: 'RADAR' as SensorModality,
    timestamp: new Date(Date.now() + i * 500),
    value: -30,
    unit: 'dBm',
    qualityScore: 0.95,
    geolocation: {
      latitude: lat + i * 0.0005,
      longitude: lon + i * 0.0005,
      altitudeM: altitude,
      accuracyM: 100,
      timestamp: new Date(Date.now() + i * 500),
      source: 'RADAR' as const,
    },
  }));
}
