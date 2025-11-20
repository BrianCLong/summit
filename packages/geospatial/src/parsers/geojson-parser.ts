/**
 * GeoJSON parser for geospatial data ingestion
 */

import { FeatureCollection, Feature } from 'geojson';
import { IntelFeatureCollection, IntelFeature } from '../types/geospatial.js';

export class GeoJSONParser {
  /**
   * Parse GeoJSON string or object into IntelFeatureCollection
   */
  static parse(data: string | object): IntelFeatureCollection {
    let geojson: FeatureCollection;

    if (typeof data === 'string') {
      try {
        geojson = JSON.parse(data);
      } catch (error) {
        throw new Error(`Invalid GeoJSON string: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      geojson = data as FeatureCollection;
    }

    if (geojson.type !== 'FeatureCollection') {
      throw new Error('GeoJSON must be a FeatureCollection');
    }

    return {
      type: 'FeatureCollection',
      features: geojson.features.map((feature) => this.enrichFeature(feature)),
      metadata: {
        source: 'geojson',
        collectionDate: new Date().toISOString(),
      },
    };
  }

  /**
   * Enrich a GeoJSON feature with intelligence metadata
   */
  private static enrichFeature(feature: Feature): IntelFeature {
    return {
      ...feature,
      properties: {
        ...feature.properties,
        timestamp: feature.properties?.timestamp || new Date().toISOString(),
        confidence: feature.properties?.confidence || 1.0,
      },
    };
  }

  /**
   * Validate GeoJSON structure
   */
  static validate(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const obj = data as Record<string, unknown>;

    if (obj.type !== 'FeatureCollection') {
      return false;
    }

    if (!Array.isArray(obj.features)) {
      return false;
    }

    return obj.features.every((feature) => {
      return (
        typeof feature === 'object' &&
        feature !== null &&
        (feature as Record<string, unknown>).type === 'Feature' &&
        typeof (feature as Record<string, unknown>).geometry === 'object'
      );
    });
  }

  /**
   * Export IntelFeatureCollection to GeoJSON string
   */
  static export(collection: IntelFeatureCollection, pretty = false): string {
    return JSON.stringify(collection, null, pretty ? 2 : 0);
  }

  /**
   * Merge multiple feature collections
   */
  static merge(collections: IntelFeatureCollection[]): IntelFeatureCollection {
    return {
      type: 'FeatureCollection',
      features: collections.flatMap((c) => c.features),
      metadata: {
        source: 'merged',
        collectionDate: new Date().toISOString(),
      },
    };
  }
}
