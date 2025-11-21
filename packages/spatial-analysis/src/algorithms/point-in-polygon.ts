/**
 * Point-in-polygon and geometric query algorithms
 */

import { GeoPoint } from '@intelgraph/geospatial';
import { Position, Polygon, MultiPolygon } from 'geojson';
import * as turf from '@turf/turf';

/**
 * Ray casting algorithm for point-in-polygon test
 */
export function pointInPolygon(point: GeoPoint, polygon: Position[][]): boolean {
  const x = point.longitude;
  const y = point.latitude;
  const ring = polygon[0]; // Exterior ring

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }

  // Check holes (interior rings)
  for (let h = 1; h < polygon.length; h++) {
    const hole = polygon[h];
    let inHole = false;
    for (let i = 0, j = hole.length - 1; i < hole.length; j = i++) {
      const xi = hole[i][0];
      const yi = hole[i][1];
      const xj = hole[j][0];
      const yj = hole[j][1];

      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) {
        inHole = !inHole;
      }
    }
    if (inHole) {
      inside = false;
      break;
    }
  }

  return inside;
}

/**
 * Check if point is within a polygon using Turf.js
 */
export function isPointInPolygon(point: GeoPoint, polygonCoords: Position[][]): boolean {
  const turfPoint = turf.point([point.longitude, point.latitude]);
  const turfPolygon = turf.polygon(polygonCoords);
  return turf.booleanPointInPolygon(turfPoint, turfPolygon);
}

/**
 * Check if point is within any polygon in a MultiPolygon
 */
export function isPointInMultiPolygon(point: GeoPoint, multiPolygonCoords: Position[][][]): boolean {
  return multiPolygonCoords.some((polygonCoords) => isPointInPolygon(point, polygonCoords));
}

/**
 * Find all points within a polygon
 */
export function pointsInPolygon(points: GeoPoint[], polygonCoords: Position[][]): GeoPoint[] {
  return points.filter((point) => isPointInPolygon(point, polygonCoords));
}

/**
 * Find all points within a given distance of a target point
 */
export function pointsWithinRadius(
  points: GeoPoint[],
  center: GeoPoint,
  radiusMeters: number
): GeoPoint[] {
  const turfCenter = turf.point([center.longitude, center.latitude]);
  const circle = turf.circle(turfCenter, radiusMeters / 1000, { units: 'kilometers' });

  return points.filter((point) => {
    const turfPoint = turf.point([point.longitude, point.latitude]);
    return turf.booleanPointInPolygon(turfPoint, circle);
  });
}

/**
 * Calculate the area of a polygon in square meters
 */
export function polygonArea(polygonCoords: Position[][]): number {
  const turfPolygon = turf.polygon(polygonCoords);
  return turf.area(turfPolygon);
}

/**
 * Calculate the perimeter of a polygon in meters
 */
export function polygonPerimeter(polygonCoords: Position[][]): number {
  const turfPolygon = turf.polygon(polygonCoords);
  return turf.length(turf.polygonToLine(turfPolygon), { units: 'meters' });
}

/**
 * Check if two polygons intersect
 */
export function polygonsIntersect(polygon1: Position[][], polygon2: Position[][]): boolean {
  const turfPoly1 = turf.polygon(polygon1);
  const turfPoly2 = turf.polygon(polygon2);
  const intersection = turf.intersect(turf.featureCollection([turfPoly1, turfPoly2]));
  return intersection !== null;
}

/**
 * Calculate the intersection area between two polygons
 */
export function polygonIntersectionArea(polygon1: Position[][], polygon2: Position[][]): number {
  const turfPoly1 = turf.polygon(polygon1);
  const turfPoly2 = turf.polygon(polygon2);
  const intersection = turf.intersect(turf.featureCollection([turfPoly1, turfPoly2]));
  return intersection ? turf.area(intersection) : 0;
}

/**
 * Create a buffer around a polygon
 */
export function bufferPolygon(polygonCoords: Position[][], radiusMeters: number): Position[][] {
  const turfPolygon = turf.polygon(polygonCoords);
  const buffered = turf.buffer(turfPolygon, radiusMeters / 1000, { units: 'kilometers' });
  return buffered ? (buffered.geometry as Polygon).coordinates : polygonCoords;
}

/**
 * Simplify a polygon by reducing the number of points
 */
export function simplifyPolygon(polygonCoords: Position[][], tolerance = 0.01): Position[][] {
  const turfPolygon = turf.polygon(polygonCoords);
  const simplified = turf.simplify(turfPolygon, { tolerance, highQuality: true });
  return (simplified.geometry as Polygon).coordinates;
}

/**
 * Calculate the centroid of a polygon
 */
export function polygonCentroid(polygonCoords: Position[][]): GeoPoint {
  const turfPolygon = turf.polygon(polygonCoords);
  const centroid = turf.centroid(turfPolygon);
  const [longitude, latitude] = centroid.geometry.coordinates;
  return { latitude, longitude };
}

/**
 * Check if a polygon is convex
 */
export function isConvexPolygon(polygonCoords: Position[][]): boolean {
  const ring = polygonCoords[0];
  if (ring.length < 4) return true; // Triangle is always convex

  let sign = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const p1 = ring[i];
    const p2 = ring[(i + 1) % (ring.length - 1)];
    const p3 = ring[(i + 2) % (ring.length - 1)];

    const crossProduct = (p2[0] - p1[0]) * (p3[1] - p2[1]) - (p2[1] - p1[1]) * (p3[0] - p2[0]);

    if (crossProduct !== 0) {
      const currentSign = crossProduct > 0 ? 1 : -1;
      if (sign === 0) {
        sign = currentSign;
      } else if (sign !== currentSign) {
        return false;
      }
    }
  }

  return true;
}
