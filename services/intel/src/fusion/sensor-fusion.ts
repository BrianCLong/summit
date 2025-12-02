/**
 * MASINT Sensor Fusion Engine
 *
 * Multi-sensor fusion system combining RADAR, EO/IR, acoustic, and
 * other MASINT sources into unified tracks. Implements Kalman filtering,
 * track correlation, and kinematic state estimation.
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SensorReading,
  FusedTrack,
  TrackClassification,
  TrackState,
  KinematicState,
  GeoLocation,
  SensorModality,
  ConfidenceLevel,
  IntelAlert,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Sensor fusion configuration
 */
export interface SensorFusionConfig {
  trackInitializationThreshold: number; // Min observations for new track
  trackDropTimeoutMs: number; // Time before dropping coasting track
  associationGateM: number; // Distance gate for track association
  velocityGateMps: number; // Velocity gate for association
  kalmanProcessNoise: number; // Process noise variance
  kalmanMeasurementNoise: number; // Measurement noise variance
  fusionWeights: Partial<Record<SensorModality, number>>; // Sensor trust weights
  maxTracksPerSensor: number;
  enableClassification: boolean;
  enablePrediction: boolean;
  predictionHorizonMs: number;
}

const DEFAULT_CONFIG: SensorFusionConfig = {
  trackInitializationThreshold: 2,
  trackDropTimeoutMs: 30000,
  associationGateM: 5000,
  velocityGateMps: 50,
  kalmanProcessNoise: 0.1,
  kalmanMeasurementNoise: 1.0,
  fusionWeights: {
    RADAR: 0.9,
    ELECTRO_OPTICAL: 0.85,
    INFRARED: 0.8,
    LIDAR: 0.95,
    SAR: 0.9,
    ACOUSTIC: 0.6,
    SEISMIC: 0.5,
    MAGNETIC: 0.7,
  },
  maxTracksPerSensor: 100,
  enableClassification: true,
  enablePrediction: true,
  predictionHorizonMs: 5000,
};

/**
 * Tentative track before confirmation
 */
interface TentativeTrack {
  id: string;
  readings: SensorReading[];
  firstSeen: Date;
  lastSeen: Date;
  estimatedState?: KinematicState;
}

/**
 * Kalman filter state
 */
interface KalmanState {
  x: number[]; // State vector [x, y, z, vx, vy, vz]
  P: number[][]; // Covariance matrix
  lastUpdateTime: number;
}

/**
 * SensorFusionEngine - Multi-INT sensor fusion
 */
export class SensorFusionEngine {
  private config: SensorFusionConfig;
  private activeTracks: Map<string, FusedTrack>;
  private tentativeTracks: Map<string, TentativeTrack>;
  private kalmanStates: Map<string, KalmanState>;
  private trackCounter: number;
  private alertCallback?: (alert: IntelAlert) => Promise<void>;

  constructor(config: Partial<SensorFusionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.activeTracks = new Map();
    this.tentativeTracks = new Map();
    this.kalmanStates = new Map();
    this.trackCounter = 0;

    // Start maintenance task
    this.startMaintenanceTask();
  }

  /**
   * Set alert callback
   */
  onAlert(callback: (alert: IntelAlert) => Promise<void>): void {
    this.alertCallback = callback;
  }

  /**
   * Process sensor reading and update fusion state
   */
  async processSensorReading(reading: SensorReading): Promise<FusedTrack | null> {
    const startTime = Date.now();

    try {
      // Validate reading
      if (!this.validateReading(reading)) {
        logger.warn({ message: 'Invalid sensor reading', readingId: reading.id });
        return null;
      }

      // Try to associate with existing track
      const associatedTrack = this.associateWithTrack(reading);

      if (associatedTrack) {
        // Update existing track
        return await this.updateTrack(associatedTrack, reading);
      }

      // Try to associate with tentative track
      const tentative = this.associateWithTentative(reading);

      if (tentative) {
        // Add to tentative track
        tentative.readings.push(reading);
        tentative.lastSeen = reading.timestamp;

        // Check if ready for promotion
        if (tentative.readings.length >= this.config.trackInitializationThreshold) {
          return await this.promoteToTrack(tentative);
        }

        return null;
      }

      // Create new tentative track
      this.createTentativeTrack(reading);

      const processTime = Date.now() - startTime;
      logger.debug({
        message: 'Sensor reading processed',
        readingId: reading.id,
        sensorId: reading.sensorId,
        modality: reading.modality,
        processTimeMs: processTime,
      });

      return null;
    } catch (error) {
      logger.error({
        message: 'Sensor fusion error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Process batch of sensor readings
   */
  async processBatch(readings: SensorReading[]): Promise<FusedTrack[]> {
    const updatedTracks: FusedTrack[] = [];

    // Sort by timestamp
    const sorted = [...readings].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    for (const reading of sorted) {
      const track = await this.processSensorReading(reading);
      if (track) {
        updatedTracks.push(track);
      }
    }

    return updatedTracks;
  }

  /**
   * Validate sensor reading
   */
  private validateReading(reading: SensorReading): boolean {
    if (!reading.id || !reading.sensorId) return false;
    if (reading.qualityScore < 0 || reading.qualityScore > 1) return false;
    if (!reading.timestamp) return false;
    return true;
  }

  /**
   * Find track to associate reading with
   */
  private associateWithTrack(reading: SensorReading): FusedTrack | null {
    if (!reading.geolocation) return null;

    let bestTrack: FusedTrack | null = null;
    let bestScore = Infinity;

    for (const track of this.activeTracks.values()) {
      if (track.state === 'DROPPED' || track.state === 'MERGED') continue;

      // Predict track position to reading time
      const predictedState = this.predictState(
        track,
        reading.timestamp.getTime(),
      );

      // Compute association score (distance + velocity match)
      const score = this.computeAssociationScore(
        reading,
        predictedState,
        track,
      );

      if (score < bestScore && score < this.config.associationGateM) {
        bestScore = score;
        bestTrack = track;
      }
    }

    return bestTrack;
  }

  /**
   * Find tentative track to associate with
   */
  private associateWithTentative(reading: SensorReading): TentativeTrack | null {
    if (!reading.geolocation) return null;

    for (const tentative of this.tentativeTracks.values()) {
      const lastReading = tentative.readings[tentative.readings.length - 1];
      if (!lastReading.geolocation) continue;

      const distance = this.computeDistance(
        reading.geolocation,
        lastReading.geolocation,
      );

      // Simple distance gate for tentative association
      if (distance < this.config.associationGateM) {
        return tentative;
      }
    }

    return null;
  }

  /**
   * Create new tentative track
   */
  private createTentativeTrack(reading: SensorReading): TentativeTrack {
    const tentative: TentativeTrack = {
      id: uuidv4(),
      readings: [reading],
      firstSeen: reading.timestamp,
      lastSeen: reading.timestamp,
    };

    this.tentativeTracks.set(tentative.id, tentative);
    return tentative;
  }

  /**
   * Promote tentative track to confirmed track
   */
  private async promoteToTrack(tentative: TentativeTrack): Promise<FusedTrack> {
    // Initialize kinematic state from readings
    const kinematicState = this.initializeKinematicState(tentative.readings);

    // Initialize Kalman filter
    const kalmanState = this.initializeKalman(kinematicState);

    // Determine classification if enabled
    const classification = this.config.enableClassification
      ? this.classifyTrack(tentative.readings)
      : this.defaultClassification();

    const track: FusedTrack = {
      id: tentative.id,
      trackNumber: ++this.trackCounter,
      classification,
      state: 'CONFIRMED',
      kinematicState,
      contributingSensors: [
        ...new Set(tentative.readings.map((r) => r.sensorId)),
      ],
      fusionConfidence: this.computeFusionConfidence(tentative.readings),
      firstDetectionAt: tentative.firstSeen,
      lastUpdateAt: tentative.lastSeen,
      predictionTimeMs: 0,
      associatedSignals: [],
      correlatedEntities: [],
    };

    // Store track and Kalman state
    this.activeTracks.set(track.id, track);
    this.kalmanStates.set(track.id, kalmanState);
    this.tentativeTracks.delete(tentative.id);

    // Generate alert for new track
    if (this.alertCallback) {
      await this.alertCallback({
        id: uuidv4(),
        type: 'NEW_TRACK',
        priority: 'MEDIUM',
        title: `New ${track.classification.domain} track confirmed`,
        description: `Track ${track.trackNumber} confirmed with ${track.contributingSensors.length} sensors`,
        source: 'MASINT',
        relatedEntityIds: [],
        relatedSignalIds: [],
        relatedTrackIds: [track.id],
        odniGapReferences: [],
        geolocation: kinematicState.position,
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    logger.info({
      message: 'Track promoted',
      trackId: track.id,
      trackNumber: track.trackNumber,
      domain: track.classification.domain,
    });

    return track;
  }

  /**
   * Update existing track with new reading
   */
  private async updateTrack(
    track: FusedTrack,
    reading: SensorReading,
  ): Promise<FusedTrack> {
    const kalmanState = this.kalmanStates.get(track.id);
    if (!kalmanState || !reading.geolocation) {
      return track;
    }

    // Kalman filter update
    const updatedKalman = this.kalmanUpdate(
      kalmanState,
      reading,
      reading.timestamp.getTime(),
    );

    // Update track kinematic state
    track.kinematicState = this.kalmanToKinematic(
      updatedKalman,
      reading.geolocation,
    );

    // Update track metadata
    track.lastUpdateAt = reading.timestamp;
    track.state = 'CONFIRMED';
    track.predictionTimeMs = 0;

    // Add sensor if new
    if (!track.contributingSensors.includes(reading.sensorId)) {
      track.contributingSensors.push(reading.sensorId);
    }

    // Update confidence
    track.fusionConfidence = Math.min(
      1,
      track.fusionConfidence + 0.05,
    );

    // Detect maneuvers
    const maneuverDetected = this.detectManeuver(track, reading);
    if (maneuverDetected && this.alertCallback) {
      await this.alertCallback({
        id: uuidv4(),
        type: 'TRACK_MANEUVER',
        priority: 'HIGH',
        title: `Track ${track.trackNumber} maneuver detected`,
        description: `Significant kinematic change detected`,
        source: 'MASINT',
        relatedEntityIds: track.correlatedEntities,
        relatedSignalIds: track.associatedSignals,
        relatedTrackIds: [track.id],
        odniGapReferences: [],
        geolocation: track.kinematicState.position,
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    // Store updated state
    this.kalmanStates.set(track.id, updatedKalman);
    this.activeTracks.set(track.id, track);

    return track;
  }

  /**
   * Predict track state to future time
   */
  private predictState(track: FusedTrack, targetTimeMs: number): KinematicState {
    const kalmanState = this.kalmanStates.get(track.id);
    if (!kalmanState) {
      return track.kinematicState;
    }

    const dt = (targetTimeMs - kalmanState.lastUpdateTime) / 1000;
    if (dt <= 0) {
      return track.kinematicState;
    }

    // Simple linear prediction
    const [x, y, z, vx, vy, vz] = kalmanState.x;

    return {
      position: {
        latitude: track.kinematicState.position.latitude + (vy * dt) / 111000,
        longitude:
          track.kinematicState.position.longitude +
          (vx * dt) /
            (111000 *
              Math.cos(
                (track.kinematicState.position.latitude * Math.PI) / 180,
              )),
        altitudeM: (track.kinematicState.position.altitudeM || 0) + vz * dt,
        accuracyM: track.kinematicState.position.accuracyM * (1 + dt * 0.1),
        timestamp: new Date(targetTimeMs),
        source: 'ESTIMATED',
      },
      velocityMps: { x: vx, y: vy, z: vz },
      headingDeg: track.kinematicState.headingDeg,
      speedMps: Math.sqrt(vx * vx + vy * vy + vz * vz),
    };
  }

  /**
   * Compute association score (lower is better)
   */
  private computeAssociationScore(
    reading: SensorReading,
    predictedState: KinematicState,
    track: FusedTrack,
  ): number {
    if (!reading.geolocation) return Infinity;

    // Distance component
    const distance = this.computeDistance(
      reading.geolocation,
      predictedState.position,
    );

    // Velocity match component (if bearing/range available)
    let velocityPenalty = 0;
    if (reading.bearing !== undefined && track.kinematicState.headingDeg) {
      const headingDiff = Math.abs(reading.bearing - track.kinematicState.headingDeg);
      velocityPenalty = Math.min(headingDiff, 360 - headingDiff) * 10;
    }

    // Sensor quality weight
    const weight = this.config.fusionWeights[reading.modality] || 0.5;
    const qualityFactor = reading.qualityScore * weight;

    return (distance + velocityPenalty) / qualityFactor;
  }

  /**
   * Initialize kinematic state from readings
   */
  private initializeKinematicState(readings: SensorReading[]): KinematicState {
    const withLocation = readings.filter((r) => r.geolocation);
    if (withLocation.length === 0) {
      throw new Error('Cannot initialize track without geolocation');
    }

    // Use weighted average of positions
    let totalWeight = 0;
    let weightedLat = 0;
    let weightedLon = 0;
    let weightedAlt = 0;

    for (const reading of withLocation) {
      const weight =
        reading.qualityScore *
        (this.config.fusionWeights[reading.modality] || 0.5);
      weightedLat += reading.geolocation!.latitude * weight;
      weightedLon += reading.geolocation!.longitude * weight;
      weightedAlt += (reading.geolocation!.altitudeM || 0) * weight;
      totalWeight += weight;
    }

    // Estimate velocity if multiple readings
    let vx = 0,
      vy = 0,
      vz = 0;
    if (withLocation.length >= 2) {
      const sorted = [...withLocation].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const dt =
        (last.timestamp.getTime() - first.timestamp.getTime()) / 1000;

      if (dt > 0) {
        const dLat = last.geolocation!.latitude - first.geolocation!.latitude;
        const dLon = last.geolocation!.longitude - first.geolocation!.longitude;
        const dAlt =
          (last.geolocation!.altitudeM || 0) -
          (first.geolocation!.altitudeM || 0);

        vy = (dLat * 111000) / dt; // m/s north
        vx =
          (dLon *
            111000 *
            Math.cos((weightedLat / totalWeight) * (Math.PI / 180))) /
          dt; // m/s east
        vz = dAlt / dt; // m/s up
      }
    }

    const speedMps = Math.sqrt(vx * vx + vy * vy);
    const headingDeg = (Math.atan2(vx, vy) * 180) / Math.PI;

    return {
      position: {
        latitude: weightedLat / totalWeight,
        longitude: weightedLon / totalWeight,
        altitudeM: weightedAlt / totalWeight,
        accuracyM: Math.min(...withLocation.map((r) => r.geolocation!.accuracyM)),
        timestamp: withLocation[withLocation.length - 1].timestamp,
        source: 'HYBRID',
      },
      velocityMps: { x: vx, y: vy, z: vz },
      headingDeg: (headingDeg + 360) % 360,
      speedMps,
      climbRateMps: vz,
    };
  }

  /**
   * Initialize Kalman filter
   */
  private initializeKalman(state: KinematicState): KalmanState {
    // State vector: [x, y, z, vx, vy, vz]
    const x = [
      0, // x position (local frame)
      0, // y position
      state.position.altitudeM || 0,
      state.velocityMps.x,
      state.velocityMps.y,
      state.velocityMps.z,
    ];

    // Initial covariance (high uncertainty)
    const P = [
      [100, 0, 0, 0, 0, 0],
      [0, 100, 0, 0, 0, 0],
      [0, 0, 100, 0, 0, 0],
      [0, 0, 0, 25, 0, 0],
      [0, 0, 0, 0, 25, 0],
      [0, 0, 0, 0, 0, 25],
    ];

    return {
      x,
      P,
      lastUpdateTime: state.position.timestamp.getTime(),
    };
  }

  /**
   * Kalman filter update
   */
  private kalmanUpdate(
    state: KalmanState,
    reading: SensorReading,
    timeMs: number,
  ): KalmanState {
    const dt = (timeMs - state.lastUpdateTime) / 1000;
    if (dt <= 0) return state;

    // State transition matrix
    const F = [
      [1, 0, 0, dt, 0, 0],
      [0, 1, 0, 0, dt, 0],
      [0, 0, 1, 0, 0, dt],
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 1],
    ];

    // Process noise
    const q = this.config.kalmanProcessNoise;
    const Q = [
      [q * dt * dt, 0, 0, 0, 0, 0],
      [0, q * dt * dt, 0, 0, 0, 0],
      [0, 0, q * dt * dt, 0, 0, 0],
      [0, 0, 0, q, 0, 0],
      [0, 0, 0, 0, q, 0],
      [0, 0, 0, 0, 0, q],
    ];

    // Predict
    const xPred = this.matVecMul(F, state.x);
    const PPred = this.matAdd(this.matMul(this.matMul(F, state.P), this.transpose(F)), Q);

    // Measurement update (position only)
    const H = [
      [1, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
    ];

    const r = this.config.kalmanMeasurementNoise / (reading.qualityScore || 0.5);
    const R = [
      [r, 0, 0],
      [0, r, 0],
      [0, 0, r],
    ];

    // Convert measurement to local frame
    const z = reading.geolocation
      ? [0, 0, reading.geolocation.altitudeM || 0] // Simplified - using local frame
      : [0, 0, 0];

    // Innovation
    const y = this.vecSub(z, this.matVecMul(H, xPred));

    // Kalman gain
    const S = this.matAdd(this.matMul(this.matMul(H, PPred), this.transpose(H)), R);
    const K = this.matMul(this.matMul(PPred, this.transpose(H)), this.matInverse3x3(S));

    // Update
    const xNew = this.vecAdd(xPred, this.matVecMul(K, y));
    const I = this.eye(6);
    const PNew = this.matMul(this.matSub(I, this.matMul(K, H)), PPred);

    return {
      x: xNew,
      P: PNew,
      lastUpdateTime: timeMs,
    };
  }

  /**
   * Convert Kalman state to kinematic state
   */
  private kalmanToKinematic(
    kalman: KalmanState,
    refLocation: GeoLocation,
  ): KinematicState {
    const [, , z, vx, vy, vz] = kalman.x;

    const speedMps = Math.sqrt(vx * vx + vy * vy);
    const headingDeg = (Math.atan2(vx, vy) * 180) / Math.PI;

    return {
      position: {
        latitude: refLocation.latitude,
        longitude: refLocation.longitude,
        altitudeM: z,
        accuracyM: Math.sqrt(kalman.P[0][0] + kalman.P[1][1]),
        timestamp: new Date(kalman.lastUpdateTime),
        source: 'HYBRID',
      },
      velocityMps: { x: vx, y: vy, z: vz },
      headingDeg: (headingDeg + 360) % 360,
      speedMps,
      climbRateMps: vz,
      covariance: kalman.P,
    };
  }

  /**
   * Classify track based on sensor data
   */
  private classifyTrack(readings: SensorReading[]): TrackClassification {
    // Simple heuristic classification
    const hasRadar = readings.some((r) => r.modality === 'RADAR');
    const hasEO = readings.some(
      (r) => r.modality === 'ELECTRO_OPTICAL' || r.modality === 'INFRARED',
    );
    const hasAcoustic = readings.some((r) => r.modality === 'ACOUSTIC');
    const hasSeismic = readings.some((r) => r.modality === 'SEISMIC');

    // Estimate altitude to determine domain
    const altitudes = readings
      .filter((r) => r.geolocation?.altitudeM !== undefined)
      .map((r) => r.geolocation!.altitudeM!);

    const avgAlt = altitudes.length > 0
      ? altitudes.reduce((a, b) => a + b, 0) / altitudes.length
      : 0;

    let domain: TrackClassification['domain'] = 'UNKNOWN';
    let category = 'UNKNOWN';

    if (avgAlt > 1000) {
      domain = 'AIR';
      category = hasRadar ? 'AIRCRAFT' : 'UAV';
    } else if (hasSeismic || (hasAcoustic && avgAlt < 10)) {
      domain = 'GROUND';
      category = 'VEHICLE';
    } else if (avgAlt < -10) {
      domain = 'SUBSURFACE';
      category = 'SUBMARINE';
    } else {
      domain = 'SURFACE';
      category = hasRadar ? 'VESSEL' : 'CONTACT';
    }

    return {
      domain,
      category,
      confidence: readings.length >= 5 ? 'HIGH' : 'MEDIUM',
    };
  }

  /**
   * Default classification
   */
  private defaultClassification(): TrackClassification {
    return {
      domain: 'UNKNOWN',
      category: 'UNKNOWN',
      confidence: 'LOW',
    };
  }

  /**
   * Compute fusion confidence from readings
   */
  private computeFusionConfidence(readings: SensorReading[]): number {
    const sensorTypes = new Set(readings.map((r) => r.modality));
    const avgQuality =
      readings.reduce((sum, r) => sum + r.qualityScore, 0) / readings.length;

    // Multi-sensor bonus
    const sensorBonus = Math.min(sensorTypes.size * 0.1, 0.3);

    return Math.min(avgQuality + sensorBonus, 1);
  }

  /**
   * Detect maneuver based on kinematic change
   */
  private detectManeuver(track: FusedTrack, reading: SensorReading): boolean {
    if (!reading.bearing) return false;

    const headingChange = Math.abs(
      reading.bearing - track.kinematicState.headingDeg,
    );
    const normalizedChange = Math.min(headingChange, 360 - headingChange);

    // Significant turn (> 30 degrees)
    return normalizedChange > 30;
  }

  /**
   * Compute haversine distance
   */
  private computeDistance(a: GeoLocation, b: GeoLocation): number {
    const R = 6371000;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;

    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // Matrix operations for Kalman filter
  private matMul(A: number[][], B: number[][]): number[][] {
    const rows = A.length;
    const cols = B[0].length;
    const inner = B.length;
    const result: number[][] = [];

    for (let i = 0; i < rows; i++) {
      result[i] = [];
      for (let j = 0; j < cols; j++) {
        let sum = 0;
        for (let k = 0; k < inner; k++) {
          sum += A[i][k] * B[k][j];
        }
        result[i][j] = sum;
      }
    }

    return result;
  }

  private matVecMul(A: number[][], x: number[]): number[] {
    return A.map((row) => row.reduce((sum, val, i) => sum + val * x[i], 0));
  }

  private matAdd(A: number[][], B: number[][]): number[][] {
    return A.map((row, i) => row.map((val, j) => val + B[i][j]));
  }

  private matSub(A: number[][], B: number[][]): number[][] {
    return A.map((row, i) => row.map((val, j) => val - B[i][j]));
  }

  private vecAdd(a: number[], b: number[]): number[] {
    return a.map((val, i) => val + b[i]);
  }

  private vecSub(a: number[], b: number[]): number[] {
    return a.map((val, i) => val - b[i]);
  }

  private transpose(A: number[][]): number[][] {
    return A[0].map((_, i) => A.map((row) => row[i]));
  }

  private eye(n: number): number[][] {
    return Array(n)
      .fill(0)
      .map((_, i) =>
        Array(n)
          .fill(0)
          .map((_, j) => (i === j ? 1 : 0)),
      );
  }

  private matInverse3x3(A: number[][]): number[][] {
    // Simple 3x3 inverse for measurement update
    const det =
      A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
      A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
      A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

    if (Math.abs(det) < 1e-10) {
      return this.eye(3);
    }

    const invDet = 1 / det;

    return [
      [
        invDet * (A[1][1] * A[2][2] - A[1][2] * A[2][1]),
        invDet * (A[0][2] * A[2][1] - A[0][1] * A[2][2]),
        invDet * (A[0][1] * A[1][2] - A[0][2] * A[1][1]),
      ],
      [
        invDet * (A[1][2] * A[2][0] - A[1][0] * A[2][2]),
        invDet * (A[0][0] * A[2][2] - A[0][2] * A[2][0]),
        invDet * (A[0][2] * A[1][0] - A[0][0] * A[1][2]),
      ],
      [
        invDet * (A[1][0] * A[2][1] - A[1][1] * A[2][0]),
        invDet * (A[0][1] * A[2][0] - A[0][0] * A[2][1]),
        invDet * (A[0][0] * A[1][1] - A[0][1] * A[1][0]),
      ],
    ];
  }

  /**
   * Start track maintenance task
   */
  private startMaintenanceTask(): void {
    setInterval(() => {
      const now = Date.now();

      // Process coasting tracks
      for (const [id, track] of this.activeTracks) {
        const timeSinceUpdate = now - track.lastUpdateAt.getTime();

        if (timeSinceUpdate > this.config.trackDropTimeoutMs) {
          track.state = 'DROPPED';
          this.activeTracks.delete(id);
          this.kalmanStates.delete(id);
          logger.debug({ message: 'Track dropped', trackId: id });
        } else if (timeSinceUpdate > 5000 && track.state === 'CONFIRMED') {
          track.state = 'COASTING';
          track.fusionConfidence *= 0.9;
        }
      }

      // Clean up old tentative tracks
      for (const [id, tentative] of this.tentativeTracks) {
        if (now - tentative.lastSeen.getTime() > 10000) {
          this.tentativeTracks.delete(id);
        }
      }
    }, 1000);
  }

  /**
   * Get all active tracks
   */
  getTracks(): FusedTrack[] {
    return Array.from(this.activeTracks.values());
  }

  /**
   * Get track by ID
   */
  getTrack(id: string): FusedTrack | undefined {
    return this.activeTracks.get(id);
  }

  /**
   * Associate signal with track
   */
  associateSignal(trackId: string, signalId: string): void {
    const track = this.activeTracks.get(trackId);
    if (track && !track.associatedSignals.includes(signalId)) {
      track.associatedSignals.push(signalId);
    }
  }

  /**
   * Associate entity with track
   */
  associateEntity(trackId: string, entityId: string): void {
    const track = this.activeTracks.get(trackId);
    if (track && !track.correlatedEntities.includes(entityId)) {
      track.correlatedEntities.push(entityId);
    }
  }

  /**
   * Get fusion statistics
   */
  getStatistics(): {
    activeTrackCount: number;
    tentativeTrackCount: number;
    tracksByDomain: Record<string, number>;
    tracksByState: Record<string, number>;
  } {
    const tracksByDomain: Record<string, number> = {};
    const tracksByState: Record<string, number> = {};

    for (const track of this.activeTracks.values()) {
      tracksByDomain[track.classification.domain] =
        (tracksByDomain[track.classification.domain] || 0) + 1;
      tracksByState[track.state] = (tracksByState[track.state] || 0) + 1;
    }

    return {
      activeTrackCount: this.activeTracks.size,
      tentativeTrackCount: this.tentativeTracks.size,
      tracksByDomain,
      tracksByState,
    };
  }
}

export default SensorFusionEngine;
