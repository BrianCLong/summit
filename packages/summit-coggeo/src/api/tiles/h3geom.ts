import { cellToBoundary } from "h3-js";

export type GeoJsonPosition = [number, number]; // [lon, lat]
export type GeoJsonPolygon = { type: "Polygon"; coordinates: GeoJsonPosition[][] };

<<<<<<< HEAD
=======
/**
 * Convert an H3 cell to a GeoJSON Polygon.
 * h3-js returns boundary as [lat, lon] if geoJson=true.
 * We swap to [lon, lat] for GeoJSON compliance.
 */
>>>>>>> origin/main
export function h3ToPolygon(h3: string): GeoJsonPolygon {
  const boundary = cellToBoundary(h3, true) as Array<[number, number]>; // [lat, lon]
  const ring: GeoJsonPosition[] = boundary.map(([lat, lon]) => [lon, lat]);

<<<<<<< HEAD
=======
  // Ensure closed ring
>>>>>>> origin/main
  if (ring.length && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
    ring.push([ring[0][0], ring[0][1]]);
  }

  return { type: "Polygon", coordinates: [ring] };
}

<<<<<<< HEAD
export function polygonIntersectsBBox(poly: GeoJsonPolygon, bbox: { west: number; south: number; east: number; north: number }): boolean {
  const ring = poly.coordinates[0] || [];
  if (ring.length === 0) return false;
=======
/**
 * Minimal bbox intersection: compute polygon bbox and compare.
 * Good enough for laptop demo; replace with robust polygon intersection later if needed.
 */
export function polygonIntersectsBBox(poly: GeoJsonPolygon, bbox: { west: number; south: number; east: number; north: number }): boolean {
  const ring = poly.coordinates[0];
>>>>>>> origin/main
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    minLon = Math.min(minLon, lon);
    minLat = Math.min(minLat, lat);
    maxLon = Math.max(maxLon, lon);
    maxLat = Math.max(maxLat, lat);
  }

<<<<<<< HEAD
=======
  // bbox overlap test
>>>>>>> origin/main
  const overlap =
    minLon <= bbox.east &&
    maxLon >= bbox.west &&
    minLat <= bbox.north &&
    maxLat >= bbox.south;

  return overlap;
}
