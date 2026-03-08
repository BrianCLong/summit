"use strict";
/**
 * Geographic Utility Functions
 *
 * All calculations use WGS84 (EPSG:4326) coordinate system.
 * Distances are in meters, bearings in degrees (0-360, clockwise from north).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toRadians = toRadians;
exports.toDegrees = toDegrees;
exports.haversineDistance = haversineDistance;
exports.calculateBearing = calculateBearing;
exports.destinationPoint = destinationPoint;
exports.calculateCentroid = calculateCentroid;
exports.calculateBoundingBox = calculateBoundingBox;
exports.calculatePathDistance = calculatePathDistance;
exports.calculateSpeed = calculateSpeed;
exports.pointInPolygon = pointInPolygon;
exports.pointInGeometry = pointInGeometry;
exports.calculatePolygonArea = calculatePolygonArea;
exports.calculateGeometryArea = calculateGeometryArea;
exports.createCircle = createCircle;
exports.geometryBoundingBox = geometryBoundingBox;
exports.simplifyPath = simplifyPath;
exports.boundingBoxesIntersect = boundingBoxesIntersect;
exports.expandBoundingBox = expandBoundingBox;
const EARTH_RADIUS_METERS = 6371000;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
    return degrees * DEG_TO_RAD;
}
/**
 * Convert radians to degrees
 */
function toDegrees(radians) {
    return radians * RAD_TO_DEG;
}
/**
 * Calculate Haversine distance between two coordinates
 * @returns Distance in meters
 */
function haversineDistance(a, b) {
    const lat1 = toRadians(a.latitude);
    const lat2 = toRadians(b.latitude);
    const deltaLat = toRadians(b.latitude - a.latitude);
    const deltaLon = toRadians(b.longitude - a.longitude);
    const sinDeltaLat = Math.sin(deltaLat / 2);
    const sinDeltaLon = Math.sin(deltaLon / 2);
    const h = sinDeltaLat * sinDeltaLat +
        Math.cos(lat1) * Math.cos(lat2) * sinDeltaLon * sinDeltaLon;
    return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}
/**
 * Calculate bearing from point A to point B
 * @returns Bearing in degrees (0-360, clockwise from north)
 */
function calculateBearing(from, to) {
    const lat1 = toRadians(from.latitude);
    const lat2 = toRadians(to.latitude);
    const deltaLon = toRadians(to.longitude - from.longitude);
    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
    let bearing = toDegrees(Math.atan2(y, x));
    bearing = (bearing + 360) % 360;
    return bearing;
}
/**
 * Calculate destination point given start, bearing, and distance
 */
function destinationPoint(start, bearingDeg, distanceMeters) {
    const lat1 = toRadians(start.latitude);
    const lon1 = toRadians(start.longitude);
    const bearing = toRadians(bearingDeg);
    const angularDistance = distanceMeters / EARTH_RADIUS_METERS;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angularDistance) +
        Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing));
    const lon2 = lon1 +
        Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1), Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2));
    return {
        latitude: toDegrees(lat2),
        longitude: toDegrees(lon2),
        elevation: start.elevation,
    };
}
/**
 * Calculate centroid of multiple coordinates
 */
function calculateCentroid(coordinates) {
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
    const result = {
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
function calculateBoundingBox(coordinates) {
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
function calculatePathDistance(coordinates) {
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
function calculateSpeed(from, to) {
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
function pointInPolygon(point, polygon) {
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
            const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
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
function pointInGeometry(point, geometry) {
    const geom = geometry;
    switch (geom.type) {
        case 'Point': {
            const coords = geom.coordinates;
            return (Math.abs(point.longitude - coords[0]) < 1e-10 &&
                Math.abs(point.latitude - coords[1]) < 1e-10);
        }
        case 'Polygon': {
            const coords = geom.coordinates;
            return pointInPolygon(point, coords);
        }
        case 'MultiPolygon': {
            const coords = geom.coordinates;
            return coords.some((poly) => pointInPolygon(point, poly));
        }
        default:
            return false;
    }
}
/**
 * Calculate area of a polygon in square meters (Shoelace formula with spherical correction)
 */
function calculatePolygonArea(polygon) {
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
function calculateGeometryArea(geometry) {
    const geom = geometry;
    switch (geom.type) {
        case 'Point':
            return 0;
        case 'Polygon':
            return calculatePolygonArea(geom.coordinates);
        case 'MultiPolygon': {
            const coords = geom.coordinates;
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
function createCircle(center, radiusMeters, segments = 32) {
    const coordinates = [];
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
function geometryBoundingBox(geometry) {
    const geom = geometry;
    const coords = [];
    function extractCoords(c) {
        if (Array.isArray(c)) {
            if (typeof c[0] === 'number') {
                coords.push({ longitude: c[0], latitude: c[1] });
            }
            else {
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
function simplifyPath(points, tolerance) {
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
function perpendicularDistance(point, lineStart, lineEnd) {
    // Use cross-track distance formula for spherical geometry
    const d13 = haversineDistance(lineStart, point);
    const bearing13 = toRadians(calculateBearing(lineStart, point));
    const bearing12 = toRadians(calculateBearing(lineStart, lineEnd));
    return Math.abs(Math.asin(Math.sin(d13 / EARTH_RADIUS_METERS) * Math.sin(bearing13 - bearing12)) * EARTH_RADIUS_METERS);
}
/**
 * Check if two bounding boxes intersect
 */
function boundingBoxesIntersect(a, b) {
    return !(a.maxLon < b.minLon ||
        a.minLon > b.maxLon ||
        a.maxLat < b.minLat ||
        a.minLat > b.maxLat);
}
/**
 * Expand a bounding box by a distance in meters
 */
function expandBoundingBox(bbox, distanceMeters) {
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
