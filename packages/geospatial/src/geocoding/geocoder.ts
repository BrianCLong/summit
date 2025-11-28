import { normalizePoint } from '../utils/projections.js';
import { haversineDistance } from '../utils/distance.js';
import type { BoundingBox, GeoPoint } from '../types/geospatial.js';

export interface GazetteerEntry {
  id: string;
  name: string;
  center: GeoPoint;
  bbox?: BoundingBox;
  aliases?: string[];
}

export interface RankedMatch {
  location: GeoPoint;
  confidence: number;
  label: string;
}

export interface GeocodingResponse {
  query: string;
  matches: RankedMatch[];
}

export interface ReverseGeocodingResponse {
  location: GeoPoint;
  nearest: { label: string; distanceMeters: number }[];
}

export interface GeocoderProvider {
  geocode: (query: string, bbox?: BoundingBox) => Promise<GeocodingResponse>;
  reverseGeocode: (point: GeoPoint) => Promise<ReverseGeocodingResponse>;
}

export class InMemoryGeocoder implements GeocoderProvider {
  constructor(private readonly entries: GazetteerEntry[]) {}

  async geocode(query: string, bbox?: BoundingBox): Promise<GeocodingResponse> {
    const normalized = query.trim().toLowerCase();
    const matches = this.entries
      .filter((entry) => {
        if (!bbox || !entry.bbox) return true;
        return (
          entry.bbox.minLon <= bbox.maxLon &&
          entry.bbox.maxLon >= bbox.minLon &&
          entry.bbox.minLat <= bbox.maxLat &&
          entry.bbox.maxLat >= bbox.minLat
        );
      })
      .map((entry) => {
        const names = [entry.name, ...(entry.aliases || [])].map((n) => n.toLowerCase());
        const hit = names.find((n) => n.includes(normalized));
        const confidence = hit ? Math.min(1, normalized.length / (hit.length + 1)) : 0;
        return { entry, confidence };
      })
      .filter((candidate) => candidate.confidence > 0.2)
      .sort((a, b) => b.confidence - a.confidence)
      .map((candidate) => ({
        location: normalizePoint(candidate.entry.center),
        confidence: Number(candidate.confidence.toFixed(3)),
        label: candidate.entry.name,
      }));

    return { query, matches };
  }

  async reverseGeocode(point: GeoPoint): Promise<ReverseGeocodingResponse> {
    const normalized = normalizePoint(point);
    const nearest = this.entries
      .map((entry) => {
        const distance = haversineDistance(normalized, entry.center);
        return { label: entry.name, distanceMeters: distance };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 3);

    return { location: normalized, nearest };
  }
}

export class GeocodingEngine {
  private cache = new Map<string, GeocodingResponse>();

  constructor(private readonly provider: GeocoderProvider) {}

  async geocode(query: string, bbox?: BoundingBox): Promise<GeocodingResponse> {
    const cacheKey = `${query}-${bbox ? JSON.stringify(bbox) : 'global'}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    const result = await this.provider.geocode(query, bbox);
    this.cache.set(cacheKey, result);
    return result;
  }

  async reverseGeocode(point: GeoPoint): Promise<ReverseGeocodingResponse> {
    return this.provider.reverseGeocode(point);
  }
}
