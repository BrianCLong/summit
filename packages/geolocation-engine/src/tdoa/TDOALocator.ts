/**
 * Time Difference of Arrival (TDOA) Geolocation
 * TRAINING/SIMULATION ONLY
 */

import { v4 as uuid } from 'uuid';

export interface SensorPosition {
  id: string;
  latitude: number;
  longitude: number;
  altitude: number;
  timestampAccuracy: number; // nanoseconds
}

export interface TDOAMeasurement {
  sensorId: string;
  arrivalTime: number; // nanoseconds since epoch
  signalStrength: number; // dBm
  frequency: number;
  confidence: number;
}

export interface GeolocationResult {
  id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: {
    horizontal: number; // meters
    vertical?: number;
    cep: number; // Circular Error Probable (50%)
    ellipse?: {
      semiMajor: number;
      semiMinor: number;
      orientation: number;
    };
  };
  method: 'TDOA' | 'AOA' | 'RSSI' | 'HYBRID';
  timestamp: Date;
  measurements: TDOAMeasurement[];
  dop: { hdop: number; vdop: number; pdop: number }; // Dilution of precision
  confidence: number;
  isSimulated: boolean;
}

export class TDOALocator {
  private sensors: Map<string, SensorPosition> = new Map();
  private speedOfLight = 299792458; // m/s

  /**
   * Register a sensor for TDOA calculations
   */
  registerSensor(sensor: SensorPosition): void {
    this.sensors.set(sensor.id, sensor);
  }

  /**
   * Remove a sensor
   */
  unregisterSensor(sensorId: string): void {
    this.sensors.delete(sensorId);
  }

  /**
   * Calculate position from TDOA measurements
   */
  calculatePosition(measurements: TDOAMeasurement[]): GeolocationResult | null {
    if (measurements.length < 3) {
      console.warn('[TDOA] Need at least 3 measurements for 2D location');
      return null;
    }

    // Get sensor positions for measurements
    const sensorMeasurements = measurements
      .map(m => ({
        measurement: m,
        sensor: this.sensors.get(m.sensorId)
      }))
      .filter(sm => sm.sensor !== undefined) as Array<{
        measurement: TDOAMeasurement;
        sensor: SensorPosition;
      }>;

    if (sensorMeasurements.length < 3) {
      console.warn('[TDOA] Not enough valid sensor measurements');
      return null;
    }

    // Use first sensor as reference
    const reference = sensorMeasurements[0];

    // Calculate time differences relative to reference
    const tdoaPairs = sensorMeasurements.slice(1).map(sm => ({
      sensor: sm.sensor,
      tdoa: (sm.measurement.arrivalTime - reference.measurement.arrivalTime) * 1e-9 // Convert to seconds
    }));

    // Solve using Taylor series linearization (simplified for training)
    const position = this.solveTDOA(reference.sensor, tdoaPairs);

    // Calculate accuracy metrics
    const dop = this.calculateDOP(sensorMeasurements.map(sm => sm.sensor), position);
    const accuracy = this.estimateAccuracy(measurements, dop);

    return {
      id: uuid(),
      latitude: position.lat,
      longitude: position.lon,
      altitude: position.alt,
      accuracy,
      method: 'TDOA',
      timestamp: new Date(),
      measurements,
      dop,
      confidence: this.calculateConfidence(measurements, accuracy),
      isSimulated: true
    };
  }

  /**
   * Simplified TDOA solver using iterative least squares
   */
  private solveTDOA(
    reference: SensorPosition,
    tdoaPairs: Array<{ sensor: SensorPosition; tdoa: number }>
  ): { lat: number; lon: number; alt: number } {
    // Initial estimate: centroid of sensors
    let lat = reference.latitude;
    let lon = reference.longitude;
    let alt = reference.altitude;

    for (const pair of tdoaPairs) {
      lat += pair.sensor.latitude;
      lon += pair.sensor.longitude;
      alt += pair.sensor.altitude;
    }

    lat /= (tdoaPairs.length + 1);
    lon /= (tdoaPairs.length + 1);
    alt /= (tdoaPairs.length + 1);

    // Iterative refinement (simplified Newton-Raphson)
    const iterations = 10;
    for (let i = 0; i < iterations; i++) {
      const gradLat = this.calculateGradient('lat', lat, lon, alt, reference, tdoaPairs);
      const gradLon = this.calculateGradient('lon', lat, lon, alt, reference, tdoaPairs);

      // Step size with damping
      const step = 0.5 / (i + 1);
      lat -= step * gradLat;
      lon -= step * gradLon;
    }

    // Add simulation noise for realism
    const noiseScale = 0.0001; // ~10m
    lat += (Math.random() - 0.5) * noiseScale;
    lon += (Math.random() - 0.5) * noiseScale;

    return { lat, lon, alt };
  }

  private calculateGradient(
    dimension: 'lat' | 'lon',
    lat: number,
    lon: number,
    alt: number,
    reference: SensorPosition,
    tdoaPairs: Array<{ sensor: SensorPosition; tdoa: number }>
  ): number {
    const delta = 0.00001;
    let gradient = 0;

    for (const pair of tdoaPairs) {
      const d1 = this.distance(lat, lon, alt, reference);
      const d2 = this.distance(lat, lon, alt, pair.sensor);
      const measured = pair.tdoa * this.speedOfLight;
      const predicted = d2 - d1;
      const error = predicted - measured;

      let d1Plus: number, d2Plus: number;
      if (dimension === 'lat') {
        d1Plus = this.distance(lat + delta, lon, alt, reference);
        d2Plus = this.distance(lat + delta, lon, alt, pair.sensor);
      } else {
        d1Plus = this.distance(lat, lon + delta, alt, reference);
        d2Plus = this.distance(lat, lon + delta, alt, pair.sensor);
      }

      const predictedPlus = d2Plus - d1Plus;
      const dError = (predictedPlus - predicted) / delta;
      gradient += 2 * error * dError;
    }

    return gradient;
  }

  /**
   * Calculate distance between point and sensor (Haversine)
   */
  private distance(lat: number, lon: number, alt: number, sensor: SensorPosition): number {
    const R = 6371000; // Earth radius in meters
    const dLat = (sensor.latitude - lat) * Math.PI / 180;
    const dLon = (sensor.longitude - lon) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat * Math.PI / 180) * Math.cos(sensor.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const horizontalDist = R * c;

    const verticalDist = Math.abs(alt - sensor.altitude);

    return Math.sqrt(horizontalDist * horizontalDist + verticalDist * verticalDist);
  }

  /**
   * Calculate Dilution of Precision
   */
  private calculateDOP(
    sensors: SensorPosition[],
    position: { lat: number; lon: number; alt: number }
  ): { hdop: number; vdop: number; pdop: number } {
    // Simplified DOP calculation based on sensor geometry
    let sumAngles = 0;

    for (let i = 0; i < sensors.length; i++) {
      for (let j = i + 1; j < sensors.length; j++) {
        const angle = this.angleBetweenSensors(
          position,
          sensors[i],
          sensors[j]
        );
        sumAngles += Math.abs(Math.sin(angle));
      }
    }

    const geometryFactor = sensors.length > 2
      ? sumAngles / (sensors.length * (sensors.length - 1) / 2)
      : 1;

    // Lower is better
    const hdop = 1 / (geometryFactor + 0.1);
    const vdop = hdop * 1.5; // Vertical typically worse
    const pdop = Math.sqrt(hdop * hdop + vdop * vdop);

    return { hdop, vdop, pdop };
  }

  private angleBetweenSensors(
    position: { lat: number; lon: number },
    sensor1: SensorPosition,
    sensor2: SensorPosition
  ): number {
    const bearing1 = Math.atan2(
      sensor1.longitude - position.lon,
      sensor1.latitude - position.lat
    );
    const bearing2 = Math.atan2(
      sensor2.longitude - position.lon,
      sensor2.latitude - position.lat
    );
    return bearing2 - bearing1;
  }

  /**
   * Estimate position accuracy
   */
  private estimateAccuracy(
    measurements: TDOAMeasurement[],
    dop: { hdop: number; vdop: number }
  ): GeolocationResult['accuracy'] {
    // Base accuracy from timing uncertainty
    const avgTimingError = measurements.reduce(
      (sum, m) => sum + (this.sensors.get(m.sensorId)?.timestampAccuracy || 100),
      0
    ) / measurements.length;

    const timingAccuracy = avgTimingError * 1e-9 * this.speedOfLight;

    // Apply DOP
    const horizontal = timingAccuracy * dop.hdop;
    const vertical = timingAccuracy * dop.vdop;
    const cep = horizontal * 0.59; // CEP ≈ 0.59 * 1-sigma for circular

    return {
      horizontal,
      vertical,
      cep,
      ellipse: {
        semiMajor: horizontal * 1.2,
        semiMinor: horizontal * 0.8,
        orientation: Math.random() * 180
      }
    };
  }

  private calculateConfidence(
    measurements: TDOAMeasurement[],
    accuracy: GeolocationResult['accuracy']
  ): number {
    // Base confidence on measurement quality and accuracy
    const avgMeasurementConfidence = measurements.reduce(
      (sum, m) => sum + m.confidence,
      0
    ) / measurements.length;

    // Penalize poor accuracy
    const accuracyPenalty = Math.min(1, accuracy.horizontal / 1000);

    return avgMeasurementConfidence * (1 - accuracyPenalty * 0.5);
  }

  getSensors(): SensorPosition[] {
    return Array.from(this.sensors.values());
  }
}
