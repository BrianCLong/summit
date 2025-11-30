import type {
  BoundingBox,
  GeoPoint,
  Geometry,
  MultiPolygonGeometry,
  PolygonGeometry,
  Position,
} from '../types/geospatial.js';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const pointToPosition = (point: GeoPoint): Position => [point.longitude, point.latitude, point.elevation ?? 0];

export const boundingBoxFromPoints = (points: GeoPoint[]): BoundingBox => {
  if (!points.length) {
    throw new Error('Cannot derive bounding box from empty point array');
  }

  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  points.forEach((p) => {
    minLon = Math.min(minLon, p.longitude);
    maxLon = Math.max(maxLon, p.longitude);
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
  });

  return { minLon, minLat, maxLon, maxLat, crs: 'EPSG:4326' };
};

const flattenPositions = (geometry: Exclude<Geometry, null>): Position[] => {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates];
    case 'MultiPoint':
    case 'LineString':
      return geometry.coordinates;
    case 'MultiLineString':
    case 'Polygon':
      return geometry.coordinates.flat();
    case 'MultiPolygon':
      return geometry.coordinates.flat(2);
    case 'GeometryCollection':
      return geometry.geometries.filter(Boolean).flatMap((geom) => flattenPositions(geom as Exclude<Geometry, null>));
    default:
      return [];
  }
};

export const boundingBoxFromGeometry = (geometry: Geometry): BoundingBox | undefined => {
  if (!geometry) return undefined;
  const coords = flattenPositions(geometry);
  if (!coords.length) return undefined;

  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  coords.forEach(([lon, lat]) => {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  return { minLon, minLat, maxLon, maxLat, crs: 'EPSG:4326' };
};

const isPointInPolygonRing = (point: Position, ring: Position[]): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const pointInPolygon = (point: Position, polygon: PolygonGeometry | MultiPolygonGeometry): boolean => {
  const rings = polygon.type === 'Polygon' ? [polygon.coordinates] : polygon.coordinates;
  return rings.some((polyRings) => {
    const outer = polyRings[0];
    if (!outer || !isPointInPolygonRing(point, outer)) return false;
    // holes return false if point lies inside any inner ring
    return !polyRings.slice(1).some((hole) => isPointInPolygonRing(point, hole));
  });
};

export const pointInGeometry = (point: GeoPoint, geometry: Geometry): boolean => {
  if (!geometry) return false;
  if (geometry.type === 'Point') {
    return geometry.coordinates[0] === point.longitude && geometry.coordinates[1] === point.latitude;
  }
  if (geometry.type === 'MultiPoint') {
    return geometry.coordinates.some((coord) => coord[0] === point.longitude && coord[1] === point.latitude);
  }
  if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
    return pointInPolygon(pointToPosition(point), geometry);
  }
  if (geometry.type === 'LineString' || geometry.type === 'MultiLineString') {
    const positions = geometry.type === 'LineString' ? geometry.coordinates : geometry.coordinates.flat();
    return positions.some(([lon, lat]) => lon === point.longitude && lat === point.latitude);
  }
  if (geometry.type === 'GeometryCollection') {
    return geometry.geometries.filter(Boolean).some((geom) => pointInGeometry(point, geom));
  }
  return false;
};

export const centroidOfGeometry = (geometry: Geometry): GeoPoint => {
  if (!geometry) {
    return { latitude: 0, longitude: 0 };
  }
  const positions = flattenPositions(geometry);
  if (!positions.length) {
    return { latitude: 0, longitude: 0 };
  }

  const sum = positions.reduce(
    (acc, [lon, lat]) => {
      acc.lon += lon;
      acc.lat += lat;
      return acc;
    },
    { lon: 0, lat: 0 }
  );

  return { latitude: sum.lat / positions.length, longitude: sum.lon / positions.length };
};

export const simplifyRing = (ring: Position[], tolerance: number): Position[] => {
  if (ring.length <= 2) return ring;
  const simplified: Position[] = [ring[0]];
  for (let i = 1; i < ring.length - 1; i += 1) {
    const prev = simplified[simplified.length - 1];
    const current = ring[i];
    const dx = current[0] - prev[0];
    const dy = current[1] - prev[1];
    if (Math.hypot(dx, dy) >= tolerance) {
      simplified.push(current);
    }
  }
  simplified.push(ring[ring.length - 1]);
  return simplified;
};

export const clampBoundingBox = (bbox: BoundingBox, limits: BoundingBox): BoundingBox => ({
  minLon: clamp(bbox.minLon, limits.minLon, limits.maxLon),
  maxLon: clamp(bbox.maxLon, limits.minLon, limits.maxLon),
  minLat: clamp(bbox.minLat, limits.minLat, limits.maxLat),
  maxLat: clamp(bbox.maxLat, limits.minLat, limits.maxLat),
  crs: bbox.crs ?? limits.crs,
});

export const rectangularGrid = (bbox: BoundingBox, cellSizeKm: number): PolygonGeometry[] => {
  const cellLatSize = cellSizeKm / 110.574; // km per degree latitude
  const midLatRad = ((bbox.minLat + bbox.maxLat) / 2 / 180) * Math.PI;
  const metersPerDegreeLon = 111320 * Math.cos(midLatRad);
  const cellLonSize = cellSizeKm * 1000 / metersPerDegreeLon;

  const polygons: PolygonGeometry[] = [];
  for (let lat = bbox.minLat; lat < bbox.maxLat; lat += cellLatSize) {
    for (let lon = bbox.minLon; lon < bbox.maxLon; lon += cellLonSize) {
      const maxLat = Math.min(lat + cellLatSize, bbox.maxLat);
      const maxLon = Math.min(lon + cellLonSize, bbox.maxLon);
      polygons.push({
        type: 'Polygon',
        coordinates: [
          [
            [lon, lat],
            [maxLon, lat],
            [maxLon, maxLat],
            [lon, maxLat],
            [lon, lat],
          ],
        ],
      });
    }
  }
  return polygons;
};
