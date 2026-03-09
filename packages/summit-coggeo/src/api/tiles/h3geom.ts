import { cellToBoundary } from "h3-js";

export type GeoJsonPosition = [number, number]; // [lon, lat]
export type GeoJsonPolygon = { type: "Polygon"; coordinates: GeoJsonPosition[][] };

/**
 * Convert an H3 cell to a GeoJSON Polygon.
 * h3-js returns boundary as [lat, lon] if geoJson=true.
 * We swap to [lon, lat] for GeoJSON compliance.
 */
export function h3ToPolygon(h3: string): GeoJsonPolygon {
  const boundary = cellToBoundary(h3, true) as Array<[number, number]>; // [lat, lon]
  const ring: GeoJsonPosition[] = boundary.map(([lat, lon]) => [lon, lat]);

  // Ensure closed ring
  if (ring.length && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
    ring.push([ring[0][0], ring[0][1]]);
  }

  return { type: "Polygon", coordinates: [ring] };
}

/**
 * Minimal bbox intersection: compute polygon bbox and compare.
 * Good enough for laptop demo; replace with robust polygon intersection later if needed.
 */
export function polygonIntersectsBBox(poly: GeoJsonPolygon, bbox: { west: number; south: number; east: number; north: number }): boolean {
  const ring = poly.coordinates[0];
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    minLon = Math.min(minLon, lon);
    minLat = Math.min(minLat, lat);
    maxLon = Math.max(maxLon, lon);
    maxLat = Math.max(maxLat, lat);
  }

  // bbox overlap test
  const overlap =
    minLon <= bbox.east &&
    maxLon >= bbox.west &&
    minLat <= bbox.north &&
    maxLat >= bbox.south;

  return overlap;
}
