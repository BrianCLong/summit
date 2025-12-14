import type {
  BoundingBox,
  FeatureCollection,
  Geometry,
  IntelFeature,
  IntelFeatureCollection,
  GeoPoint,
} from '../types/geospatial.js';
import { boundingBoxFromGeometry, boundingBoxFromPoints, centroidOfGeometry, simplifyRing } from './geometry.js';

export const computeBoundingBox = (collection: FeatureCollection): BoundingBox => {
  const bounds = collection.features
    .map((feature) => boundingBoxFromGeometry(feature.geometry))
    .filter((bbox): bbox is BoundingBox => Boolean(bbox));

  if (!bounds.length) {
    throw new Error('Unable to compute bounding box for empty collection');
  }

  const minLon = Math.min(...bounds.map((b) => b.minLon));
  const minLat = Math.min(...bounds.map((b) => b.minLat));
  const maxLon = Math.max(...bounds.map((b) => b.maxLon));
  const maxLat = Math.max(...bounds.map((b) => b.maxLat));

  return { minLon, minLat, maxLon, maxLat, crs: bounds[0].crs };
};

export const filterFeaturesByBBox = (
  collection: IntelFeatureCollection,
  boundingBox: BoundingBox
): IntelFeatureCollection => {
  const features = collection.features.filter((feature) => {
    const derived = boundingBoxFromGeometry(feature.geometry);
    if (!derived) return false;
    return !(
      derived.minLon > boundingBox.maxLon ||
      derived.maxLon < boundingBox.minLon ||
      derived.minLat > boundingBox.maxLat ||
      derived.maxLat < boundingBox.minLat
    );
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

export const simplifyFeatures = (
  collection: IntelFeatureCollection,
  tolerance: number = 0.0001
): IntelFeatureCollection => {
  const simplified = collection.features.map((feature) => {
    if (!feature.geometry || feature.geometry.type === 'Point') {
      return feature;
    }

    if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      const coordinates = feature.geometry.type === 'Polygon' ? feature.geometry.coordinates : feature.geometry.coordinates.flat();
      const simplifiedRings = coordinates.map((ring) => simplifyRing(ring, tolerance));
      const geometry: Geometry = feature.geometry.type === 'Polygon'
        ? { type: 'Polygon', coordinates: simplifiedRings }
        : { type: 'MultiPolygon', coordinates: [simplifiedRings] };
      return { ...feature, geometry };
    }

    return feature;
  });

  return { ...collection, features: simplified };
};

export const toFeatureCollection = (points: GeoPoint[]): IntelFeatureCollection => {
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
      bbox: points.length ? boundingBoxFromPoints(points) : undefined,
    },
  };
};

export const mergeCollections = (collections: IntelFeatureCollection[]): IntelFeatureCollection => {
  const merged: IntelFeatureCollection = {
    type: 'FeatureCollection',
    features: collections.flatMap((c) => c.features),
    metadata: {
      source: 'merged',
      collectionDate: new Date().toISOString(),
    },
  };
  const bbox = merged.features.length ? computeBoundingBox(merged) : undefined;
  return {
    ...merged,
    metadata: {
      ...(merged.metadata || {}),
      bbox,
    },
  };
};

export const geometryCentroid = (geometry: Geometry): GeoPoint => centroidOfGeometry(geometry);
