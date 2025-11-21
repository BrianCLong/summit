/**
 * Shapefile parser for geospatial data ingestion
 * Uses shpjs library to parse shapefiles
 */

import shp from 'shpjs';
import { IntelFeatureCollection, IntelFeature } from '../types/geospatial.js';
import { FeatureCollection } from 'geojson';

export class ShapefileParser {
  /**
   * Parse shapefile from buffer or URL
   */
  static async parse(input: ArrayBuffer | string): Promise<IntelFeatureCollection> {
    try {
      const geojson = await shp(input);

      // shpjs can return a single FeatureCollection or an array
      const featureCollection = Array.isArray(geojson) ? geojson[0] : geojson;

      if (!featureCollection || featureCollection.type !== 'FeatureCollection') {
        throw new Error('Invalid shapefile: No FeatureCollection found');
      }

      return {
        type: 'FeatureCollection',
        features: featureCollection.features.map((feature) => this.enrichFeature(feature)),
        metadata: {
          source: 'shapefile',
          collectionDate: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to parse shapefile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse multiple shapefiles from a zip archive
   */
  static async parseZip(buffer: ArrayBuffer): Promise<IntelFeatureCollection[]> {
    try {
      const result = await shp(buffer);

      // When parsing a zip, shpjs returns an array of FeatureCollections
      const collections = Array.isArray(result) ? result : [result];

      return collections.map((fc) => ({
        type: 'FeatureCollection',
        features: fc.features.map((feature) => this.enrichFeature(feature)),
        metadata: {
          source: 'shapefile',
          collectionDate: new Date().toISOString(),
        },
      }));
    } catch (error) {
      throw new Error(`Failed to parse shapefile zip: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enrich feature with intelligence metadata
   */
  private static enrichFeature(feature: any): IntelFeature {
    return {
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        ...feature.properties,
        timestamp: feature.properties?.timestamp || new Date().toISOString(),
        confidence: feature.properties?.confidence || 1.0,
      },
    };
  }

  /**
   * Parse shapefile from file path (Node.js only)
   */
  static async parseFile(filePath: string): Promise<IntelFeatureCollection> {
    // This would require fs module, which should be imported dynamically
    throw new Error('parseFile not implemented - use parse() with a file URL instead');
  }

  /**
   * Validate shapefile structure
   */
  static async validate(buffer: ArrayBuffer): Promise<boolean> {
    try {
      const result = await shp(buffer);
      return !!result && (Array.isArray(result) ? result.length > 0 : result.type === 'FeatureCollection');
    } catch {
      return false;
    }
  }

  /**
   * Get shapefile metadata
   */
  static async getMetadata(buffer: ArrayBuffer): Promise<{
    featureCount: number;
    geometryType: string;
    bbox?: number[];
  }> {
    const collection = await this.parse(buffer);
    const geometryTypes = new Set(collection.features.map((f) => f.geometry.type));

    return {
      featureCount: collection.features.length,
      geometryType: geometryTypes.size === 1 ? Array.from(geometryTypes)[0] : 'Mixed',
      bbox: this.calculateBoundingBox(collection),
    };
  }

  /**
   * Calculate bounding box for feature collection
   */
  private static calculateBoundingBox(collection: IntelFeatureCollection): number[] | undefined {
    if (collection.features.length === 0) {
      return undefined;
    }

    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;

    collection.features.forEach((feature) => {
      const coords = this.extractCoordinates(feature.geometry);
      coords.forEach(([lon, lat]) => {
        minLon = Math.min(minLon, lon);
        minLat = Math.min(minLat, lat);
        maxLon = Math.max(maxLon, lon);
        maxLat = Math.max(maxLat, lat);
      });
    });

    return [minLon, minLat, maxLon, maxLat];
  }

  /**
   * Extract all coordinates from a geometry
   */
  private static extractCoordinates(geometry: any): number[][] {
    const coords: number[][] = [];

    const extract = (geom: any) => {
      if (geom.type === 'Point') {
        coords.push(geom.coordinates);
      } else if (geom.type === 'LineString' || geom.type === 'MultiPoint') {
        coords.push(...geom.coordinates);
      } else if (geom.type === 'Polygon' || geom.type === 'MultiLineString') {
        geom.coordinates.forEach((ring: number[][]) => coords.push(...ring));
      } else if (geom.type === 'MultiPolygon') {
        geom.coordinates.forEach((polygon: number[][][]) =>
          polygon.forEach((ring) => coords.push(...ring))
        );
      } else if (geom.type === 'GeometryCollection') {
        geom.geometries.forEach(extract);
      }
    };

    extract(geometry);
    return coords;
  }
}
