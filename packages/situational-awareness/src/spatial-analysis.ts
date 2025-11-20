import {
  SpatialAnalyzer,
  AssetMarker,
  PersonnelMarker,
  IncidentMarker,
  InfrastructureMarker,
} from './types';
import { Location } from '@intelgraph/crisis-detection';

export class GeoSpatialAnalyzer implements SpatialAnalyzer {
  private assets: Map<string, AssetMarker> = new Map();
  private personnel: Map<string, PersonnelMarker> = new Map();
  private incidents: Map<string, IncidentMarker> = new Map();
  private infrastructure: Map<string, InfrastructureMarker> = new Map();

  // Haversine formula for distance calculation
  calculateDistance(point1: Location, point2: Location): number {
    const R = 6371; // Earth's radius in kilometers

    const lat1 = this.toRadians(point1.latitude);
    const lat2 = this.toRadians(point2.latitude);
    const deltaLat = this.toRadians(point2.latitude - point1.latitude);
    const deltaLon = this.toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in kilometers
  }

  calculateBearing(point1: Location, point2: Location): number {
    const lat1 = this.toRadians(point1.latitude);
    const lat2 = this.toRadians(point2.latitude);
    const deltaLon = this.toRadians(point2.longitude - point1.longitude);

    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

    const bearing = Math.atan2(y, x);
    return (this.toDegrees(bearing) + 360) % 360;
  }

  findNearbyAssets(location: Location, radius: number): AssetMarker[] {
    const nearby: AssetMarker[] = [];

    for (const asset of this.assets.values()) {
      const distance = this.calculateDistance(location, asset.location);
      if (distance <= radius) {
        nearby.push(asset);
      }
    }

    return nearby.sort(
      (a, b) =>
        this.calculateDistance(location, a.location) -
        this.calculateDistance(location, b.location)
    );
  }

  findNearbyPersonnel(location: Location, radius: number): PersonnelMarker[] {
    const nearby: PersonnelMarker[] = [];

    for (const person of this.personnel.values()) {
      const distance = this.calculateDistance(location, person.location);
      if (distance <= radius) {
        nearby.push(person);
      }
    }

    return nearby.sort(
      (a, b) =>
        this.calculateDistance(location, a.location) -
        this.calculateDistance(location, b.location)
    );
  }

  findNearbyIncidents(location: Location, radius: number): IncidentMarker[] {
    const nearby: IncidentMarker[] = [];

    for (const incident of this.incidents.values()) {
      const distance = this.calculateDistance(location, incident.location);
      if (distance <= radius) {
        nearby.push(incident);
      }
    }

    return nearby.sort(
      (a, b) =>
        this.calculateDistance(location, a.location) -
        this.calculateDistance(location, b.location)
    );
  }

  findNearbyInfrastructure(
    location: Location,
    radius: number
  ): InfrastructureMarker[] {
    const nearby: InfrastructureMarker[] = [];

    for (const infra of this.infrastructure.values()) {
      const distance = this.calculateDistance(location, infra.location);
      if (distance <= radius) {
        nearby.push(infra);
      }
    }

    return nearby;
  }

  isWithinBounds(location: Location, bounds: any): boolean {
    return (
      location.latitude >= bounds.south &&
      location.latitude <= bounds.north &&
      location.longitude >= bounds.west &&
      location.longitude <= bounds.east
    );
  }

  calculateBounds(locations: Location[], padding: number = 0.1): any {
    if (locations.length === 0) {
      return { north: 90, south: -90, east: 180, west: -180 };
    }

    let north = -90;
    let south = 90;
    let east = -180;
    let west = 180;

    for (const loc of locations) {
      north = Math.max(north, loc.latitude);
      south = Math.min(south, loc.latitude);
      east = Math.max(east, loc.longitude);
      west = Math.min(west, loc.longitude);
    }

    // Add padding
    const latPadding = (north - south) * padding;
    const lonPadding = (east - west) * padding;

    return {
      north: Math.min(90, north + latPadding),
      south: Math.max(-90, south - latPadding),
      east: Math.min(180, east + lonPadding),
      west: Math.max(-180, west - lonPadding),
    };
  }

  calculateCenter(locations: Location[]): Location {
    if (locations.length === 0) {
      return { latitude: 0, longitude: 0 };
    }

    let totalLat = 0;
    let totalLon = 0;

    for (const loc of locations) {
      totalLat += loc.latitude;
      totalLon += loc.longitude;
    }

    return {
      latitude: totalLat / locations.length,
      longitude: totalLon / locations.length,
    };
  }

  isPointInPolygon(point: Location, polygon: Location[]): boolean {
    let inside = false;
    const x = point.longitude;
    const y = point.latitude;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].longitude;
      const yi = polygon[i].latitude;
      const xj = polygon[j].longitude;
      const yj = polygon[j].latitude;

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  }

  // Data management methods
  addAsset(asset: AssetMarker): void {
    this.assets.set(asset.id, asset);
  }

  removeAsset(assetId: string): void {
    this.assets.delete(assetId);
  }

  updateAsset(assetId: string, updates: Partial<AssetMarker>): void {
    const asset = this.assets.get(assetId);
    if (asset) {
      Object.assign(asset, updates);
    }
  }

  addPersonnel(person: PersonnelMarker): void {
    this.personnel.set(person.id, person);
  }

  removePersonnel(personId: string): void {
    this.personnel.delete(personId);
  }

  updatePersonnel(personId: string, updates: Partial<PersonnelMarker>): void {
    const person = this.personnel.get(personId);
    if (person) {
      Object.assign(person, updates);
    }
  }

  addIncident(incident: IncidentMarker): void {
    this.incidents.set(incident.id, incident);
  }

  removeIncident(incidentId: string): void {
    this.incidents.delete(incidentId);
  }

  addInfrastructure(infra: InfrastructureMarker): void {
    this.infrastructure.set(infra.id, infra);
  }

  removeInfrastructure(infraId: string): void {
    this.infrastructure.delete(infraId);
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  private toDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
  }
}

export class LocationTracker {
  private tracks: Map<string, LocationTrack> = new Map();
  private updateCallbacks: Map<string, Set<TrackUpdateCallback>> = new Map();

  startTracking(entityId: string, entityType: 'asset' | 'personnel'): void {
    if (!this.tracks.has(entityId)) {
      this.tracks.set(entityId, {
        entityId,
        entityType,
        history: [],
        startTime: new Date(),
      });
      this.updateCallbacks.set(entityId, new Set());
    }
  }

  stopTracking(entityId: string): void {
    this.tracks.delete(entityId);
    this.updateCallbacks.delete(entityId);
  }

  updateLocation(entityId: string, location: Location): void {
    const track = this.tracks.get(entityId);
    if (!track) {
      return;
    }

    const point: LocationPoint = {
      location,
      timestamp: new Date(),
    };

    track.history.push(point);

    // Keep only last 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    track.history = track.history.filter((p) => p.timestamp.getTime() > cutoff);

    // Notify callbacks
    const callbacks = this.updateCallbacks.get(entityId);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(entityId, point);
        } catch (error) {
          console.error('Error in track update callback:', error);
        }
      });
    }
  }

  getTrack(entityId: string): LocationTrack | undefined {
    return this.tracks.get(entityId);
  }

  getTrackHistory(
    entityId: string,
    startTime?: Date,
    endTime?: Date
  ): LocationPoint[] {
    const track = this.tracks.get(entityId);
    if (!track) {
      return [];
    }

    let history = track.history;

    if (startTime) {
      history = history.filter((p) => p.timestamp >= startTime);
    }

    if (endTime) {
      history = history.filter((p) => p.timestamp <= endTime);
    }

    return history;
  }

  subscribe(entityId: string, callback: TrackUpdateCallback): () => void {
    let callbacks = this.updateCallbacks.get(entityId);
    if (!callbacks) {
      callbacks = new Set();
      this.updateCallbacks.set(entityId, callbacks);
    }

    callbacks.add(callback);

    return () => {
      callbacks?.delete(callback);
    };
  }

  calculateSpeed(entityId: string, windowMinutes: number = 5): number {
    const track = this.tracks.get(entityId);
    if (!track || track.history.length < 2) {
      return 0;
    }

    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    const recentPoints = track.history.filter((p) => p.timestamp.getTime() > cutoff);

    if (recentPoints.length < 2) {
      return 0;
    }

    const analyzer = new GeoSpatialAnalyzer();
    const first = recentPoints[0];
    const last = recentPoints[recentPoints.length - 1];

    const distance = analyzer.calculateDistance(first.location, last.location);
    const timeHours =
      (last.timestamp.getTime() - first.timestamp.getTime()) / (1000 * 60 * 60);

    return distance / timeHours; // km/h
  }
}

interface LocationTrack {
  entityId: string;
  entityType: 'asset' | 'personnel';
  history: LocationPoint[];
  startTime: Date;
}

interface LocationPoint {
  location: Location;
  timestamp: Date;
}

type TrackUpdateCallback = (entityId: string, point: LocationPoint) => void;
