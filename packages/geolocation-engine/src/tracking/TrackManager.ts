/**
 * Track Manager - Multi-target tracking and movement analysis
 * TRAINING/SIMULATION ONLY
 */

import { v4 as uuid } from 'uuid';
import { GeolocationResult } from '../tdoa/TDOALocator';

export interface Track {
  id: string;
  targetId: string;
  status: 'tentative' | 'confirmed' | 'lost' | 'deleted';

  // Current state
  position: {
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracy: number;
  };
  velocity: {
    speed: number;     // m/s
    heading: number;   // degrees from north
    climb?: number;    // m/s vertical
  };

  // Track history
  history: TrackPoint[];
  predictions: TrackPoint[];

  // Metrics
  firstDetection: Date;
  lastUpdate: Date;
  updateCount: number;
  confidence: number;

  // Classification
  classification?: {
    type: string;
    confidence: number;
  };

  isSimulated: boolean;
}

export interface TrackPoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
  source: 'measurement' | 'prediction' | 'interpolation';
}

export interface TrackingConfig {
  maxHistoryPoints: number;
  predictionHorizon: number; // seconds
  associationThreshold: number; // meters
  trackTimeout: number; // seconds
  minUpdatesForConfirmation: number;
}

export interface MovementPattern {
  id: string;
  trackId: string;
  patternType: 'stationary' | 'linear' | 'circular' | 'erratic' | 'unknown';
  startTime: Date;
  endTime?: Date;
  characteristics: {
    averageSpeed: number;
    averageHeading: number;
    headingVariance: number;
    distanceTraveled: number;
    boundingBox: {
      minLat: number;
      maxLat: number;
      minLon: number;
      maxLon: number;
    };
  };
}

export class TrackManager {
  private tracks: Map<string, Track> = new Map();
  private config: TrackingConfig;

  constructor(config: Partial<TrackingConfig> = {}) {
    this.config = {
      maxHistoryPoints: config.maxHistoryPoints || 1000,
      predictionHorizon: config.predictionHorizon || 60,
      associationThreshold: config.associationThreshold || 500,
      trackTimeout: config.trackTimeout || 300,
      minUpdatesForConfirmation: config.minUpdatesForConfirmation || 3
    };
  }

  /**
   * Process new geolocation and associate with track
   */
  processLocation(location: GeolocationResult, targetId?: string): Track {
    // Try to associate with existing track
    const existingTrack = targetId
      ? this.findTrackByTarget(targetId)
      : this.findNearestTrack(location);

    if (existingTrack && this.shouldAssociate(existingTrack, location)) {
      return this.updateTrack(existingTrack, location);
    }

    // Create new track
    return this.createTrack(location, targetId);
  }

  /**
   * Create a new track
   */
  private createTrack(location: GeolocationResult, targetId?: string): Track {
    const track: Track = {
      id: uuid(),
      targetId: targetId || `TARGET-${uuid().slice(0, 8)}`,
      status: 'tentative',
      position: {
        latitude: location.latitude,
        longitude: location.longitude,
        altitude: location.altitude,
        accuracy: location.accuracy.horizontal
      },
      velocity: {
        speed: 0,
        heading: 0
      },
      history: [{
        timestamp: location.timestamp,
        latitude: location.latitude,
        longitude: location.longitude,
        altitude: location.altitude,
        accuracy: location.accuracy.horizontal,
        source: 'measurement'
      }],
      predictions: [],
      firstDetection: location.timestamp,
      lastUpdate: location.timestamp,
      updateCount: 1,
      confidence: location.confidence,
      isSimulated: true
    };

    this.tracks.set(track.id, track);
    return track;
  }

  /**
   * Update existing track with new location
   */
  private updateTrack(track: Track, location: GeolocationResult): Track {
    const timeDelta = (location.timestamp.getTime() - track.lastUpdate.getTime()) / 1000;

    // Calculate velocity
    if (timeDelta > 0) {
      const distance = this.calculateDistance(
        track.position.latitude,
        track.position.longitude,
        location.latitude,
        location.longitude
      );

      track.velocity.speed = distance / timeDelta;
      track.velocity.heading = this.calculateBearing(
        track.position.latitude,
        track.position.longitude,
        location.latitude,
        location.longitude
      );

      if (track.position.altitude && location.altitude) {
        track.velocity.climb = (location.altitude - track.position.altitude) / timeDelta;
      }
    }

    // Update position
    track.position = {
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: location.altitude,
      accuracy: location.accuracy.horizontal
    };

    // Add to history
    track.history.push({
      timestamp: location.timestamp,
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: location.altitude,
      accuracy: location.accuracy.horizontal,
      source: 'measurement'
    });

    // Trim history
    if (track.history.length > this.config.maxHistoryPoints) {
      track.history = track.history.slice(-this.config.maxHistoryPoints);
    }

    // Update metadata
    track.lastUpdate = location.timestamp;
    track.updateCount++;
    track.confidence = (track.confidence + location.confidence) / 2;

    // Update status
    if (track.status === 'tentative' && track.updateCount >= this.config.minUpdatesForConfirmation) {
      track.status = 'confirmed';
    }

    // Generate predictions
    track.predictions = this.generatePredictions(track);

    return track;
  }

  /**
   * Generate position predictions
   */
  private generatePredictions(track: Track): TrackPoint[] {
    const predictions: TrackPoint[] = [];
    const steps = 10;
    const stepSize = this.config.predictionHorizon / steps;

    let lat = track.position.latitude;
    let lon = track.position.longitude;
    let alt = track.position.altitude;

    for (let i = 1; i <= steps; i++) {
      const t = i * stepSize;

      // Simple linear prediction
      const distance = track.velocity.speed * t;
      const bearing = track.velocity.heading * Math.PI / 180;

      const R = 6371000;
      const lat1 = lat * Math.PI / 180;
      const lon1 = lon * Math.PI / 180;

      const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(distance / R) +
        Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearing)
      );
      const lon2 = lon1 + Math.atan2(
        Math.sin(bearing) * Math.sin(distance / R) * Math.cos(lat1),
        Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2)
      );

      predictions.push({
        timestamp: new Date(track.lastUpdate.getTime() + t * 1000),
        latitude: lat2 * 180 / Math.PI,
        longitude: lon2 * 180 / Math.PI,
        altitude: alt ? alt + (track.velocity.climb || 0) * t : undefined,
        accuracy: track.position.accuracy * (1 + i * 0.2), // Uncertainty grows
        source: 'prediction'
      });
    }

    return predictions;
  }

  /**
   * Analyze movement patterns
   */
  analyzeMovement(trackId: string): MovementPattern | null {
    const track = this.tracks.get(trackId);
    if (!track || track.history.length < 3) return null;

    const history = track.history;
    let totalDistance = 0;
    let headings: number[] = [];

    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];

      totalDistance += this.calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );

      headings.push(this.calculateBearing(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      ));

      minLat = Math.min(minLat, curr.latitude);
      maxLat = Math.max(maxLat, curr.latitude);
      minLon = Math.min(minLon, curr.longitude);
      maxLon = Math.max(maxLon, curr.longitude);
    }

    const duration = (track.lastUpdate.getTime() - track.firstDetection.getTime()) / 1000;
    const avgSpeed = duration > 0 ? totalDistance / duration : 0;
    const avgHeading = headings.length > 0
      ? headings.reduce((a, b) => a + b, 0) / headings.length
      : 0;

    // Calculate heading variance
    const headingVariance = headings.length > 1
      ? headings.reduce((sum, h) => sum + Math.pow(h - avgHeading, 2), 0) / headings.length
      : 0;

    // Classify pattern
    let patternType: MovementPattern['patternType'] = 'unknown';
    if (avgSpeed < 0.5) {
      patternType = 'stationary';
    } else if (headingVariance < 100) {
      patternType = 'linear';
    } else if (headingVariance > 1000) {
      patternType = 'erratic';
    } else {
      // Check for circular pattern
      const boxSize = this.calculateDistance(minLat, minLon, maxLat, maxLon);
      if (boxSize < totalDistance * 0.3) {
        patternType = 'circular';
      }
    }

    return {
      id: uuid(),
      trackId,
      patternType,
      startTime: track.firstDetection,
      endTime: track.lastUpdate,
      characteristics: {
        averageSpeed: avgSpeed,
        averageHeading: avgHeading,
        headingVariance,
        distanceTraveled: totalDistance,
        boundingBox: { minLat, maxLat, minLon, maxLon }
      }
    };
  }

  /**
   * Find track by target ID
   */
  private findTrackByTarget(targetId: string): Track | undefined {
    for (const track of this.tracks.values()) {
      if (track.targetId === targetId && track.status !== 'deleted') {
        return track;
      }
    }
    return undefined;
  }

  /**
   * Find nearest track to location
   */
  private findNearestTrack(location: GeolocationResult): Track | undefined {
    let nearest: Track | undefined;
    let minDistance = Infinity;

    for (const track of this.tracks.values()) {
      if (track.status === 'deleted' || track.status === 'lost') continue;

      const distance = this.calculateDistance(
        track.position.latitude,
        track.position.longitude,
        location.latitude,
        location.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = track;
      }
    }

    return nearest;
  }

  /**
   * Check if location should associate with track
   */
  private shouldAssociate(track: Track, location: GeolocationResult): boolean {
    const distance = this.calculateDistance(
      track.position.latitude,
      track.position.longitude,
      location.latitude,
      location.longitude
    );

    // Factor in predicted position
    const timeDelta = (location.timestamp.getTime() - track.lastUpdate.getTime()) / 1000;
    const maxPredictedMovement = track.velocity.speed * timeDelta * 1.5; // Allow 50% margin

    const threshold = Math.max(
      this.config.associationThreshold,
      maxPredictedMovement,
      track.position.accuracy + location.accuracy.horizontal
    );

    return distance < threshold;
  }

  /**
   * Calculate distance between two points (Haversine)
   */
  private calculateDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Calculate bearing between two points
   */
  private calculateBearing(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const x = Math.sin(dLon) * Math.cos(lat2Rad);
    const y = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    let bearing = Math.atan2(x, y) * 180 / Math.PI;
    return (bearing + 360) % 360;
  }

  /**
   * Update track statuses (call periodically)
   */
  updateStatuses(): void {
    const now = Date.now();

    for (const track of this.tracks.values()) {
      if (track.status === 'deleted') continue;

      const age = (now - track.lastUpdate.getTime()) / 1000;

      if (age > this.config.trackTimeout) {
        track.status = 'lost';
      }
    }
  }

  getTracks(): Track[] {
    return Array.from(this.tracks.values());
  }

  getActiveTracks(): Track[] {
    return Array.from(this.tracks.values())
      .filter(t => t.status === 'confirmed' || t.status === 'tentative');
  }

  getTrack(id: string): Track | undefined {
    return this.tracks.get(id);
  }

  deleteTrack(id: string): void {
    const track = this.tracks.get(id);
    if (track) {
      track.status = 'deleted';
    }
  }
}
