"use strict";
/**
 * GeoJSON parser for geospatial data ingestion
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoJSONParser = void 0;
class GeoJSONParser {
    /**
     * Parse GeoJSON string or object into IntelFeatureCollection
     */
    static parse(data) {
        let geojson;
        if (typeof data === 'string') {
            try {
                geojson = JSON.parse(data);
            }
            catch (error) {
                throw new Error(`Invalid GeoJSON string: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        else {
            geojson = data;
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
    static enrichFeature(feature) {
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
    static validate(data) {
        if (typeof data !== 'object' || data === null) {
            return false;
        }
        const obj = data;
        if (obj.type !== 'FeatureCollection') {
            return false;
        }
        if (!Array.isArray(obj.features)) {
            return false;
        }
        return obj.features.every((feature) => {
            return (typeof feature === 'object' &&
                feature !== null &&
                feature.type === 'Feature' &&
                typeof feature.geometry === 'object');
        });
    }
    /**
     * Export IntelFeatureCollection to GeoJSON string
     */
    static export(collection, pretty = false) {
        return JSON.stringify(collection, null, pretty ? 2 : 0);
    }
    /**
     * Merge multiple feature collections
     */
    static merge(collections) {
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
exports.GeoJSONParser = GeoJSONParser;
