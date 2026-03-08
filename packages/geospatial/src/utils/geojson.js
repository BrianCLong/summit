"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geometryCentroid = exports.mergeCollections = exports.toFeatureCollection = exports.simplifyFeatures = exports.filterFeaturesByBBox = exports.computeBoundingBox = void 0;
const geometry_js_1 = require("./geometry.js");
const computeBoundingBox = (collection) => {
    const bounds = collection.features
        .map((feature) => (0, geometry_js_1.boundingBoxFromGeometry)(feature.geometry))
        .filter((bbox) => Boolean(bbox));
    if (!bounds.length) {
        throw new Error('Unable to compute bounding box for empty collection');
    }
    const minLon = Math.min(...bounds.map((b) => b.minLon));
    const minLat = Math.min(...bounds.map((b) => b.minLat));
    const maxLon = Math.max(...bounds.map((b) => b.maxLon));
    const maxLat = Math.max(...bounds.map((b) => b.maxLat));
    return { minLon, minLat, maxLon, maxLat, crs: bounds[0].crs };
};
exports.computeBoundingBox = computeBoundingBox;
const filterFeaturesByBBox = (collection, boundingBox) => {
    const features = collection.features.filter((feature) => {
        const derived = (0, geometry_js_1.boundingBoxFromGeometry)(feature.geometry);
        if (!derived)
            return false;
        return !(derived.minLon > boundingBox.maxLon ||
            derived.maxLon < boundingBox.minLon ||
            derived.minLat > boundingBox.maxLat ||
            derived.maxLat < boundingBox.minLat);
    });
    return {
        ...collection,
        features,
        metadata: {
            ...(collection.metadata || {}),
            bbox: boundingBox,
        },
    };
};
exports.filterFeaturesByBBox = filterFeaturesByBBox;
const simplifyFeatures = (collection, tolerance = 0.0001) => {
    const simplified = collection.features.map((feature) => {
        if (!feature.geometry || feature.geometry.type === 'Point') {
            return feature;
        }
        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            const coordinates = feature.geometry.type === 'Polygon' ? feature.geometry.coordinates : feature.geometry.coordinates.flat();
            const simplifiedRings = coordinates.map((ring) => (0, geometry_js_1.simplifyRing)(ring, tolerance));
            const geometry = feature.geometry.type === 'Polygon'
                ? { type: 'Polygon', coordinates: simplifiedRings }
                : { type: 'MultiPolygon', coordinates: [simplifiedRings] };
            return { ...feature, geometry };
        }
        return feature;
    });
    return { ...collection, features: simplified };
};
exports.simplifyFeatures = simplifyFeatures;
const toFeatureCollection = (points) => {
    return {
        type: 'FeatureCollection',
        features: points.map((p, idx) => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [p.longitude, p.latitude, p.elevation ?? 0],
            },
            properties: {
                entityId: `point-${idx}`,
                timestamp: p.timestamp?.toISOString() ?? new Date().toISOString(),
                accuracy: p.accuracy,
                ...p.metadata,
            },
        })),
        metadata: {
            source: 'generated',
            collectionDate: new Date().toISOString(),
            bbox: points.length ? (0, geometry_js_1.boundingBoxFromPoints)(points) : undefined,
        },
    };
};
exports.toFeatureCollection = toFeatureCollection;
const mergeCollections = (collections) => {
    const merged = {
        type: 'FeatureCollection',
        features: collections.flatMap((c) => c.features),
        metadata: {
            source: 'merged',
            collectionDate: new Date().toISOString(),
        },
    };
    const bbox = merged.features.length ? (0, exports.computeBoundingBox)(merged) : undefined;
    return {
        ...merged,
        metadata: {
            ...(merged.metadata || {}),
            bbox,
        },
    };
};
exports.mergeCollections = mergeCollections;
const geometryCentroid = (geometry) => (0, geometry_js_1.centroidOfGeometry)(geometry);
exports.geometryCentroid = geometryCentroid;
