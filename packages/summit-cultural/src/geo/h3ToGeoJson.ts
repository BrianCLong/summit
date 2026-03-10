import { cellToBoundary } from "h3-js";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import type { DiffusionPoint } from "../types.js";

export function h3CellToPolygonCoordinates(cell: string): number[][][] {
  const boundary = cellToBoundary(cell);
  const ring = boundary.map(([lat, lng]) => [lng, lat]);

  if (ring.length > 0) {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push(first);
    }
  }

  return [ring];
}

export function diffusionPointsToGeoJson(points: DiffusionPoint[]): FeatureCollection<Polygon> {
  const features: Array<Feature<Polygon>> = [];

  for (const point of points) {
    for (const cell of point.h3Cells) {
      features.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: h3CellToPolygonCoordinates(cell)
        },
        properties: {
          cell,
          populationId: point.populationId,
          regionId: point.regionId,
          compatibilityScore: point.compatibilityScore,
          diffusionProbability: point.diffusionProbability,
          estimatedVelocity: point.estimatedVelocity,
          confidence: point.confidence,
          explanation: point.explanation
        }
      });
    }
  }

  return {
    type: "FeatureCollection",
    features
  };
}
