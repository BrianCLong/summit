"use strict";
/**
 * Point-in-polygon and geometric query algorithms
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.pointInPolygon = pointInPolygon;
exports.isPointInPolygon = isPointInPolygon;
exports.isPointInMultiPolygon = isPointInMultiPolygon;
exports.pointsInPolygon = pointsInPolygon;
exports.pointsWithinRadius = pointsWithinRadius;
exports.polygonArea = polygonArea;
exports.polygonPerimeter = polygonPerimeter;
exports.polygonsIntersect = polygonsIntersect;
exports.polygonIntersectionArea = polygonIntersectionArea;
exports.bufferPolygon = bufferPolygon;
exports.simplifyPolygon = simplifyPolygon;
exports.polygonCentroid = polygonCentroid;
exports.isConvexPolygon = isConvexPolygon;
const turf = __importStar(require("@turf/turf"));
/**
 * Ray casting algorithm for point-in-polygon test
 */
function pointInPolygon(point, polygon) {
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
function isPointInPolygon(point, polygonCoords) {
    const turfPoint = turf.point([point.longitude, point.latitude]);
    const turfPolygon = turf.polygon(polygonCoords);
    return turf.booleanPointInPolygon(turfPoint, turfPolygon);
}
/**
 * Check if point is within any polygon in a MultiPolygon
 */
function isPointInMultiPolygon(point, multiPolygonCoords) {
    return multiPolygonCoords.some((polygonCoords) => isPointInPolygon(point, polygonCoords));
}
/**
 * Find all points within a polygon
 */
function pointsInPolygon(points, polygonCoords) {
    return points.filter((point) => isPointInPolygon(point, polygonCoords));
}
/**
 * Find all points within a given distance of a target point
 */
function pointsWithinRadius(points, center, radiusMeters) {
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
function polygonArea(polygonCoords) {
    const turfPolygon = turf.polygon(polygonCoords);
    return turf.area(turfPolygon);
}
/**
 * Calculate the perimeter of a polygon in meters
 */
function polygonPerimeter(polygonCoords) {
    const turfPolygon = turf.polygon(polygonCoords);
    return turf.length(turf.polygonToLine(turfPolygon), { units: 'meters' });
}
/**
 * Check if two polygons intersect
 */
function polygonsIntersect(polygon1, polygon2) {
    const turfPoly1 = turf.polygon(polygon1);
    const turfPoly2 = turf.polygon(polygon2);
    const intersection = turf.intersect(turf.featureCollection([turfPoly1, turfPoly2]));
    return intersection !== null;
}
/**
 * Calculate the intersection area between two polygons
 */
function polygonIntersectionArea(polygon1, polygon2) {
    const turfPoly1 = turf.polygon(polygon1);
    const turfPoly2 = turf.polygon(polygon2);
    const intersection = turf.intersect(turf.featureCollection([turfPoly1, turfPoly2]));
    return intersection ? turf.area(intersection) : 0;
}
/**
 * Create a buffer around a polygon
 */
function bufferPolygon(polygonCoords, radiusMeters) {
    const turfPolygon = turf.polygon(polygonCoords);
    const buffered = turf.buffer(turfPolygon, radiusMeters / 1000, { units: 'kilometers' });
    return buffered ? buffered.geometry.coordinates : polygonCoords;
}
/**
 * Simplify a polygon by reducing the number of points
 */
function simplifyPolygon(polygonCoords, tolerance = 0.01) {
    const turfPolygon = turf.polygon(polygonCoords);
    const simplified = turf.simplify(turfPolygon, { tolerance, highQuality: true });
    return simplified.geometry.coordinates;
}
/**
 * Calculate the centroid of a polygon
 */
function polygonCentroid(polygonCoords) {
    const turfPolygon = turf.polygon(polygonCoords);
    const centroid = turf.centroid(turfPolygon);
    const [longitude, latitude] = centroid.geometry.coordinates;
    return { latitude, longitude };
}
/**
 * Check if a polygon is convex
 */
function isConvexPolygon(polygonCoords) {
    const ring = polygonCoords[0];
    if (ring.length < 4)
        return true; // Triangle is always convex
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
            }
            else if (sign !== currentSign) {
                return false;
            }
        }
    }
    return true;
}
