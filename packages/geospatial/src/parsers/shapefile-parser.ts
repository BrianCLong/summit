import type { IntelFeature, IntelFeatureCollection } from '../types/geospatial.js';

const toUtf8String = (input: ArrayBuffer | string): string => {
  if (typeof input === 'string') return input;
  const bytes = new Uint8Array(input);
  let result = '';
  bytes.forEach((byte) => {
    result += String.fromCharCode(byte);
  });
  return result;
};

export class ShapefileParser {
  static async parse(input: ArrayBuffer | string): Promise<IntelFeatureCollection> {
    const content = toUtf8String(input);
    try {
      const parsed = JSON.parse(content) as { type?: string; features?: IntelFeature[] };
      if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
        return {
          type: 'FeatureCollection',
          features: parsed.features.map((f, idx) => this.enrichFeature(f, idx)),
          metadata: { source: 'shapefile', collectionDate: new Date().toISOString() },
        } satisfies IntelFeatureCollection;
      }
      throw new Error('Unsupported shapefile payload - expected GeoJSON FeatureCollection encoded as JSON');
    } catch (error) {
      throw new Error(`Failed to parse shapefile input: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async parseZip(buffer: ArrayBuffer): Promise<IntelFeatureCollection[]> {
    return [await this.parse(buffer)];
  }

  private static enrichFeature(feature: IntelFeature, idx: number): IntelFeature {
    return {
      ...feature,
      properties: {
        ...(feature.properties || {}),
        entityId: feature.properties?.entityId || `feature-${idx}`,
        timestamp: feature.properties?.timestamp || new Date().toISOString(),
        confidence: feature.properties?.confidence ?? 1,
      },
    };
  }

  static async validate(buffer: ArrayBuffer): Promise<boolean> {
    try {
      const parsed = JSON.parse(toUtf8String(buffer));
      return parsed.type === 'FeatureCollection' && Array.isArray(parsed.features);
    } catch {
      return false;
    }
  }

  static async getMetadata(buffer: ArrayBuffer): Promise<{ featureCount: number; geometryType: string; bbox?: number[] }>
  {
    const collection = await this.parse(buffer);
    const geometryTypes = new Set(collection.features.map((f) => f.geometry?.type || 'Unknown'));
    return {
      featureCount: collection.features.length,
      geometryType: geometryTypes.size === 1 ? Array.from(geometryTypes)[0] : 'Mixed',
      bbox: undefined,
    };
  }
}
