import { cellToBoundary } from "h3-js";

export type GeoJsonPosition = [number, number]; // [lon, lat]
export type GeoJsonPolygon = { type: "Polygon"; coordinates: GeoJsonPosition[][] };

export function h3ToPolygon(h3: string): GeoJsonPolygon {
  const boundary = cellToBoundary(h3, true) as Array<[number, number]>; // [lat, lon]
  const ring: GeoJsonPosition[] = boundary.map(([lat, lon]) => [lon, lat]);

  if (ring.length && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
    ring.push([ring[0][0], ring[0][1]]);
  }

  return { type: "Polygon", coordinates: [ring] };
}

export function polygonIntersectsBBox(poly: GeoJsonPolygon, bbox: { west: number; south: number; east: number; north: number }): boolean {
  const ring = poly.coordinates[0] || [];
  if (ring.length === 0) return false;
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    minLon = Math.min(minLon, lon);
    minLat = Math.min(minLat, lat);
    maxLon = Math.max(maxLon, lon);
    maxLat = Math.max(maxLat, lat);
  }

  const overlap =
    minLon <= bbox.east &&
    maxLon >= bbox.west &&
    minLat <= bbox.north &&
    maxLat >= bbox.south;

  return overlap;
}
