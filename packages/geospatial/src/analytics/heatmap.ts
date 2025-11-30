import type { BoundingBox, GeoPoint, IntelFeature, IntelFeatureCollection, PolygonGeometry } from '../types/geospatial.js';
import { boundingBoxFromPoints, pointInGeometry, rectangularGrid } from '../utils/geometry.js';

export interface HeatmapOptions {
  cellSizeKm?: number;
  bbox?: BoundingBox;
}

export const generateHeatmap = (
  points: GeoPoint[],
  options: HeatmapOptions = {}
): IntelFeatureCollection => {
  const referenceBbox: BoundingBox = options.bbox || boundingBoxFromPoints(points);
  const grid = rectangularGrid(referenceBbox, options.cellSizeKm ?? 5);

  const features: IntelFeature[] = grid.map((cell, idx) => {
    const count = points.filter((p) => pointInGeometry(p, cell)).length;
    const properties = {
      id: `cell-${idx}`,
      count,
      intensity: count / Math.max(points.length, 1),
    } as IntelFeature['properties'];

    return {
      type: 'Feature',
      geometry: cell,
      properties,
    } satisfies IntelFeature;
  });

  return { type: 'FeatureCollection', features, bbox: referenceBbox };
};
