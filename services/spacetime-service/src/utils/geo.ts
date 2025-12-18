/**
 * Geographic Utility Functions
 *
 * All calculations use WGS84 (EPSG:4326) coordinate system.
 * Distances are in meters, bearings in degrees (0-360, clockwise from north).
 */

import type { Coordinate, GeoJsonGeometry } from '../types/index.js';
import type { Point, Polygon, MultiPolygon, Position } from 'geojson';

const EARTH_RADIUS_METERS = 6371000;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Convert degrees to radians
 */
export function toRadians(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

/**
 * Convert radians to degrees
 */
export function toDegrees(radians: number): number {
  return radians * RAD_TO_DEG;
}

/**
 * Calculate Haversine distance between two coordinates
 * @returns Distance in meters
 */
export function haversineDistance(a: Coordinate, b: Coordinate): number {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);

  const sinDeltaLat = Math.sin(deltaLat / 2);
  const sinDeltaLon = Math.sin(deltaLon / 2);

  const h =
    sinDeltaLat * sinDeltaLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDeltaLon * sinDeltaLon;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/**
 * Calculate bearing from point A to point B
 * @returns Bearing in degrees (0-360, clockwise from north)
 */
export function calculateBearing(from: Coordinate, to: Coordinate): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  let bearing = toDegrees(Math.atan2(y, x));
  bearing = (bearing + 360) % 360;

  return bearing;
}

/**
 * Calculate destination point given start, bearing, and distance
 */
export function destinationPoint(
  start: Coordinate,
  bearingDeg: number,
  distanceMeters: number,
): Coordinate {
  const lat1 = toRadians(start.latitude);
  const lon1 = toRadians(start.longitude);
  const bearing = toRadians(bearingDeg);
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    latitude: toDegrees(lat2),
    longitude: toDegrees(lon2),
    elevation: start.elevation,
  };
}

/**
 * Calculate centroid of multiple coordinates
 */
export function calculateCentroid(coordinates: Coordinate[]): Coordinate {
  if (coordinates.length === 0) {
    throw new Error('Cannot calculate centroid of empty array');
  }

  if (coordinates.length === 1) {
    return { ...coordinates[0] };
  }

  // Convert to Cartesian, average, convert back
  let x = 0;
  let y = 0;
  let z = 0;
  let elevationSum = 0;
  let elevationCount = 0;

  for (const coord of coordinates) {
    const lat = toRadians(coord.latitude);
    const lon = toRadians(coord.longitude);

    x += Math.cos(lat) * Math.cos(lon);
    y += Math.cos(lat) * Math.sin(lon);
    z += Math.sin(lat);

    if (coord.elevation !== undefined) {
      elevationSum += coord.elevation;
      elevationCount++;
    }
  }

  const n = coordinates.length;
  x /= n;
  y /= n;
  z /= n;

  const lon = Math.atan2(y, x);
  const hyp = Math.sqrt(x * x + y * y);
  const lat = Math.atan2(z, hyp);

  const result: Coordinate = {
    latitude: toDegrees(lat),
    longitude: toDegrees(lon),
  };

  if (elevationCount > 0) {
    result.elevation = elevationSum / elevationCount;
  }

  return result;
}

/**
 * Calculate bounding box for a set of coordinates
 */
export function calculateBoundingBox(
  coordinates: Coordinate[],
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  if (coordinates.length === 0) {
    throw new Error('Cannot calculate bounding box of empty array');
  }

  let minLat = 90;
  let maxLat = -90;
  let minLon = 180;
  let maxLon = -180;

  for (const coord of coordinates) {
    minLat = Math.min(minLat, coord.latitude);
    maxLat = Math.max(maxLat, coord.latitude);
    minLon = Math.min(minLon, coord.longitude);
    maxLon = Math.max(maxLon, coord.longitude);
  }

  return { minLat, maxLat, minLon, maxLon };
}

/**
 * Calculate total distance along a path of coordinates
 * @returns Total distance in meters
 */
export function calculatePathDistance(coordinates: Coordinate[]): number {
  if (coordinates.length < 2) {
    return 0;
  }

  let totalDistance = 0;
  for (let i = 1; i < coordinates.length; i++) {
    totalDistance += haversineDistance(coordinates[i - 1], coordinates[i]);
  }

  return totalDistance;
}

/**
 * Calculate speed between two timestamped coordinates
 * @returns Speed in m/s
 */
export function calculateSpeed(
  from: Coordinate & { timestamp: number },
  to: Coordinate & { timestamp: number },
): number {
  const distance = haversineDistance(from, to);
  const timeDelta = Math.abs(to.timestamp - from.timestamp) / 1000; // Convert ms to s

  if (timeDelta === 0) {
    return 0;
  }

  return distance / timeDelta;
}

/**
 * Check if a point is inside a polygon using ray casting
 */
export function pointInPolygon(
  point: Coordinate,
  polygon: Position[][],
): boolean {
  const x = point.longitude;
  const y = point.latitude;

  // Check against each ring (first is outer, rest are holes)
  let inside = false;

  for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (intersect) {
        inside = !inside;
      }
    }
  }

  return inside;
}

/**
 * Check if a point is inside a GeoJSON geometry
 */
export function pointInGeometry(
  point: Coordinate,
  geometry: GeoJsonGeometry,
): boolean {
  const geom = geometry as { type: string; coordinates: unknown };

  switch (geom.type) {
    case 'Point': {
      const coords = geom.coordinates as Position;
      return (
        Math.abs(point.longitude - coords[0]) < 1e-10 &&
        Math.abs(point.latitude - coords[1]) < 1e-10
      );
    }
    case 'Polygon': {
      const coords = geom.coordinates as Position[][];
      return pointInPolygon(point, coords);
    }
    case 'MultiPolygon': {
      const coords = geom.coordinates as Position[][][];
      return coords.some((poly) => pointInPolygon(point, poly));
    }
    default:
      return false;
  }
}

/**
 * Calculate area of a polygon in square meters (Shoelace formula with spherical correction)
 */
export function calculatePolygonArea(polygon: Position[][]): number {
  if (polygon.length === 0 || polygon[0].length < 4) {
    return 0;
  }

  const ring = polygon[0];
  let area = 0;

  for (let i = 0; i < ring.length - 1; i++) {
    const p1 = ring[i];
    const p2 = ring[i + 1];

    const lat1 = toRadians(p1[1]);
    const lat2 = toRadians(p2[1]);
    const lon1 = toRadians(p1[0]);
    const lon2 = toRadians(p2[0]);

    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = (Math.abs(area) * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2;

  // Subtract holes
  for (let h = 1; h < polygon.length; h++) {
    const hole = polygon[h];
    let holeArea = 0;

    for (let i = 0; i < hole.length - 1; i++) {
      const p1 = hole[i];
      const p2 = hole[i + 1];

      const lat1 = toRadians(p1[1]);
      const lat2 = toRadians(p2[1]);
      const lon1 = toRadians(p1[0]);
      const lon2 = toRadians(p2[0]);

      holeArea += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }

    area -=
      (Math.abs(holeArea) * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2;
  }

  return Math.abs(area);
}

/**
 * Calculate area of a GeoJSON geometry in square meters
 */
export function calculateGeometryArea(geometry: GeoJsonGeometry): number {
  const geom = geometry as { type: string; coordinates: unknown };

  switch (geom.type) {
    case 'Point':
      return 0;
    case 'Polygon':
      return calculatePolygonArea(geom.coordinates as Position[][]);
    case 'MultiPolygon': {
      const coords = geom.coordinates as Position[][][];
      return coords.reduce((sum, poly) => sum + calculatePolygonArea(poly), 0);
    }
    default:
      return 0;
  }
}

/**
 * Create a circular polygon (approximation) around a point
 * @param center Center coordinate
 * @param radiusMeters Radius in meters
 * @param segments Number of segments (default 32)
 */
export function createCircle(
  center: Coordinate,
  radiusMeters: number,
  segments: number = 32,
): Polygon {
  const coordinates: Position[] = [];

  for (let i = 0; i <= segments; i++) {
    const bearing = (360 / segments) * i;
    const point = destinationPoint(center, bearing, radiusMeters);
    coordinates.push([point.longitude, point.latitude]);
  }

  return {
    type: 'Polygon',
    coordinates: [coordinates],
  };
}

/**
 * Extract bounding box from GeoJSON geometry
 */
export function geometryBoundingBox(
  geometry: GeoJsonGeometry,
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  const geom = geometry as { type: string; coordinates: unknown };
  const coords: Coordinate[] = [];

  function extractCoords(c: unknown): void {
    if (Array.isArray(c)) {
      if (typeof c[0] === 'number') {
        coords.push({ longitude: c[0] as number, latitude: c[1] as number });
      } else {
        for (const item of c) {
          extractCoords(item);
        }
      }
    }
  }

  extractCoords(geom.coordinates);

  if (coords.length === 0) {
    throw new Error('Geometry has no coordinates');
  }

  return calculateBoundingBox(coords);
}

/**
 * Simplify a path using Ramer-Douglas-Peucker algorithm
 * @param points Array of coordinates
 * @param tolerance Tolerance in meters
 */
export function simplifyPath(
  points: Coordinate[],
  tolerance: number,
): Coordinate[] {
  if (points.length <= 2) {
    return points;
  }

  // Find the point with the maximum distance from the line between first and last
  let maxDist = 0;
  let maxIndex = 0;

  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDist > tolerance) {
    const leftPart = simplifyPath(points.slice(0, maxIndex + 1), tolerance);
    const rightPart = simplifyPath(points.slice(maxIndex), tolerance);

    return [...leftPart.slice(0, -1), ...rightPart];
  }

  return [first, last];
}

/**
 * Calculate perpendicular distance from a point to a line
 */
function perpendicularDistance(
  point: Coordinate,
  lineStart: Coordinate,
  lineEnd: Coordinate,
): number {
  // Use cross-track distance formula for spherical geometry
  const d13 = haversineDistance(lineStart, point);
  const bearing13 = toRadians(calculateBearing(lineStart, point));
  const bearing12 = toRadians(calculateBearing(lineStart, lineEnd));

  return Math.abs(
    Math.asin(
      Math.sin(d13 / EARTH_RADIUS_METERS) * Math.sin(bearing13 - bearing12),
    ) * EARTH_RADIUS_METERS,
  );
}

/**
 * Check if two bounding boxes intersect
 */
export function boundingBoxesIntersect(
  a: { minLat: number; maxLat: number; minLon: number; maxLon: number },
  b: { minLat: number; maxLat: number; minLon: number; maxLon: number },
): boolean {
  return !(
    a.maxLon < b.minLon ||
    a.minLon > b.maxLon ||
    a.maxLat < b.minLat ||
    a.minLat > b.maxLat
  );
}

/**
 * Expand a bounding box by a distance in meters
 */
export function expandBoundingBox(
  bbox: { minLat: number; maxLat: number; minLon: number; maxLon: number },
  distanceMeters: number,
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  // Approximate degrees per meter (varies with latitude)
  const avgLat = (bbox.minLat + bbox.maxLat) / 2;
  const latDegreesPerMeter = 1 / 111320;
  const lonDegreesPerMeter = 1 / (111320 * Math.cos(toRadians(avgLat)));

  const latExpand = distanceMeters * latDegreesPerMeter;
  const lonExpand = distanceMeters * lonDegreesPerMeter;

  return {
    minLat: Math.max(-90, bbox.minLat - latExpand),
    maxLat: Math.min(90, bbox.maxLat + latExpand),
    minLon: Math.max(-180, bbox.minLon - lonExpand),
    maxLon: Math.min(180, bbox.maxLon + lonExpand),
  };
}
