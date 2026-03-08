"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShapefileParser = void 0;
const toUtf8String = (input) => {
    if (typeof input === 'string')
        return input;
    const bytes = new Uint8Array(input);
    let result = '';
    bytes.forEach((byte) => {
        result += String.fromCharCode(byte);
    });
    return result;
};
class ShapefileParser {
    static async parse(input) {
        const content = toUtf8String(input);
        try {
            const parsed = JSON.parse(content);
            if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
                return {
                    type: 'FeatureCollection',
                    features: parsed.features.map((f, idx) => this.enrichFeature(f, idx)),
                    metadata: { source: 'shapefile', collectionDate: new Date().toISOString() },
                };
            }
            throw new Error('Unsupported shapefile payload - expected GeoJSON FeatureCollection encoded as JSON');
        }
        catch (error) {
            throw new Error(`Failed to parse shapefile input: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    static async parseZip(buffer) {
        return [await this.parse(buffer)];
    }
    static enrichFeature(feature, idx) {
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
    static async validate(buffer) {
        try {
            const parsed = JSON.parse(toUtf8String(buffer));
            return parsed.type === 'FeatureCollection' && Array.isArray(parsed.features);
        }
        catch {
            return false;
        }
    }
    static async getMetadata(buffer) {
        const collection = await this.parse(buffer);
        const geometryTypes = new Set(collection.features.map((f) => f.geometry?.type || 'Unknown'));
        return {
            featureCount: collection.features.length,
            geometryType: geometryTypes.size === 1 ? Array.from(geometryTypes)[0] : 'Mixed',
            bbox: undefined,
        };
    }
}
exports.ShapefileParser = ShapefileParser;
