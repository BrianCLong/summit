/**
 * Distance calculation utilities for geospatial analysis
 */

import { GeoPoint } from '../types/geospatial.js';

const EARTH_RADIUS_METERS = 6371000; // Earth's radius in meters

/**
 * Calculate Haversine distance between two points
 */
export function haversineDistance(point1: GeoPoint, point2: GeoPoint): number {
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLon = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculate Vincenty distance (more accurate for long distances)
 */
export function vincentyDistance(point1: GeoPoint, point2: GeoPoint): number {
  const a = 6378137.0; // WGS-84 semi-major axis
  const b = 6356752.314245; // WGS-84 semi-minor axis
  const f = 1 / 298.257223563; // WGS-84 flattening

  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  const lon1 = toRadians(point1.longitude);
  const lon2 = toRadians(point2.longitude);

  const L = lon2 - lon1;
  const U1 = Math.atan((1 - f) * Math.tan(lat1));
  const U2 = Math.atan((1 - f) * Math.tan(lat2));
  const sinU1 = Math.sin(U1);
  const cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2);
  const cosU2 = Math.cos(U2);

  let lambda = L;
  let lambdaP = 2 * Math.PI;
  let iterLimit = 100;
  let cosSqAlpha = 0;
  let sinSigma = 0;
  let cos2SigmaM = 0;
  let cosSigma = 0;
  let sigma = 0;

  while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0) {
    const sinLambda = Math.sin(lambda);
    const cosLambda = Math.cos(lambda);
    sinSigma = Math.sqrt(
      cosU2 * sinLambda * (cosU2 * sinLambda) +
        (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda)
    );

    if (sinSigma === 0) {
      return 0; // Co-incident points
    }

    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    const sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
    cosSqAlpha = 1 - sinAlpha * sinAlpha;
    cos2SigmaM = cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha;

    if (isNaN(cos2SigmaM)) {
      cos2SigmaM = 0; // Equatorial line
    }

    const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    lambdaP = lambda;
    lambda = L + (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
  }

  if (iterLimit === 0) {
    return haversineDistance(point1, point2); // Fallback to Haversine
  }

  const uSq = (cosSqAlpha * (a * a - b * b)) / (b * b);
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const deltaSigma =
    B *
    sinSigma *
    (cos2SigmaM +
      (B / 4) *
        (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
          (B / 6) * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));

  return b * A * (sigma - deltaSigma);
}

/**
 * Calculate distance with elevation consideration
 */
export function distance3D(point1: GeoPoint, point2: GeoPoint): number {
  const horizontalDistance = haversineDistance(point1, point2);
  const elevationDiff = (point2.elevation || 0) - (point1.elevation || 0);

  return Math.sqrt(horizontalDistance * horizontalDistance + elevationDiff * elevationDiff);
}

/**
 * Calculate bearing between two points (in degrees)
 */
export function bearing(point1: GeoPoint, point2: GeoPoint): number {
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  const deltaLon = toRadians(point2.longitude - point1.longitude);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  const bearingRad = Math.atan2(y, x);
  const bearingDeg = toDegrees(bearingRad);

  return (bearingDeg + 360) % 360;
}

/**
 * Calculate destination point given distance and bearing
 */
export function destination(start: GeoPoint, distance: number, bearingDeg: number): GeoPoint {
  const bearingRad = toRadians(bearingDeg);
  const lat1 = toRadians(start.latitude);
  const lon1 = toRadians(start.longitude);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distance / EARTH_RADIUS_METERS) +
      Math.cos(lat1) * Math.sin(distance / EARTH_RADIUS_METERS) * Math.cos(bearingRad)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(distance / EARTH_RADIUS_METERS) * Math.cos(lat1),
      Math.cos(distance / EARTH_RADIUS_METERS) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    latitude: toDegrees(lat2),
    longitude: toDegrees(lon2),
  };
}

/**
 * Calculate midpoint between two points
 */
export function midpoint(point1: GeoPoint, point2: GeoPoint): GeoPoint {
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  const lon1 = toRadians(point1.longitude);
  const deltaLon = toRadians(point2.longitude - point1.longitude);

  const Bx = Math.cos(lat2) * Math.cos(deltaLon);
  const By = Math.cos(lat2) * Math.sin(deltaLon);

  const lat3 = Math.atan2(Math.sin(lat1) + Math.sin(lat2), Math.sqrt((Math.cos(lat1) + Bx) * (Math.cos(lat1) + Bx) + By * By));
  const lon3 = lon1 + Math.atan2(By, Math.cos(lat1) + Bx);

  return {
    latitude: toDegrees(lat3),
    longitude: toDegrees(lon3),
  };
}

/**
 * Calculate the center point (centroid) of multiple points
 */
export function centroid(points: GeoPoint[]): GeoPoint {
  if (points.length === 0) {
    throw new Error('Cannot calculate centroid of empty array');
  }

  if (points.length === 1) {
    return points[0];
  }

  let x = 0;
  let y = 0;
  let z = 0;

  points.forEach((point) => {
    const lat = toRadians(point.latitude);
    const lon = toRadians(point.longitude);

    x += Math.cos(lat) * Math.cos(lon);
    y += Math.cos(lat) * Math.sin(lon);
    z += Math.sin(lat);
  });

  x /= points.length;
  y /= points.length;
  z /= points.length;

  const lon = Math.atan2(y, x);
  const hyp = Math.sqrt(x * x + y * y);
  const lat = Math.atan2(z, hyp);

  return {
    latitude: toDegrees(lat),
    longitude: toDegrees(lon),
  };
}

export const centroidFromPoints = centroid;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}
