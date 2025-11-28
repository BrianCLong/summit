import type { BoundingBox, GeoPoint, Geofence, SpatialQueryOptions } from '../types/geospatial.js';

export interface QueryConfig {
  text: string;
  values: Array<string | number | Date>;
}

const envelope = (bbox: BoundingBox, srid = 4326): string =>
  `ST_MakeEnvelope(${bbox.minLon}, ${bbox.minLat}, ${bbox.maxLon}, ${bbox.maxLat}, ${srid})`;

export const buildSpatialQuery = (
  table: string,
  geometryColumn: string,
  options: SpatialQueryOptions & { srid?: number }
): QueryConfig => {
  const clauses: string[] = [];
  const values: Array<string | number | Date> = [];
  const srid = options.srid ?? 4326;

  if (options.bbox) {
    clauses.push(`ST_Intersects(${geometryColumn}, ${envelope(options.bbox, srid)})`);
  }

  if (options.maxDistance && options.filters?.origin) {
    const origin = options.filters.origin as GeoPoint;
    values.push(origin.longitude, origin.latitude, options.maxDistance);
    clauses.push(`ST_DWithin(${geometryColumn}, ST_SetSRID(ST_Point($${values.length - 1}, $${values.length}), ${srid}), $${values.length + 1})`);
  }

  if (options.timeRange) {
    values.push(options.timeRange.start, options.timeRange.end);
    clauses.push(`observed_at BETWEEN $${values.length - 1} AND $${values.length}`);
  }

  if (options.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      if (key === 'origin') return;
      values.push(value as string | number);
      clauses.push(`${key} = $${values.length}`);
    });
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = options.limit ? `LIMIT ${options.limit}` : '';
  const offset = options.offset ? `OFFSET ${options.offset}` : '';

  return {
    text: `SELECT * FROM ${table} ${where} ${limit} ${offset}`.trim(),
    values,
  };
};

export const buildGeofenceQuery = (
  table: string,
  geometryColumn: string,
  geofence: Geofence,
  srid = 4326
): QueryConfig => {
  const values: Array<string | number | Date> = [JSON.stringify(geofence.geometry)];
  const clause = `ST_Intersects(${geometryColumn}, ST_SetSRID(ST_GeomFromGeoJSON($1), ${srid}))`;
  const enabled = geofence.enabled ? 'TRUE' : 'FALSE';
  return {
    text: `SELECT * FROM ${table} WHERE ${clause} AND ${enabled}`,
    values,
  };
};

export const buildRouteMatchQuery = (
  table: string,
  geometryColumn: string,
  route: GeoPoint[],
  toleranceMeters: number,
  srid = 4326
): QueryConfig => {
  const values: Array<string | number> = [
    JSON.stringify({ type: 'LineString', coordinates: route.map((p) => [p.longitude, p.latitude]) }),
    toleranceMeters,
  ];
  const clause = `ST_DWithin(${geometryColumn}, ST_SetSRID(ST_GeomFromGeoJSON($1), ${srid}), $2)`;
  return {
    text: `SELECT * FROM ${table} WHERE ${clause}`,
    values,
  };
};

export const buildTemporalHeatmapQuery = (
  table: string,
  geometryColumn: string,
  bboxFilter: BoundingBox,
  timeBucket: string = '1 hour',
  srid = 4326
): QueryConfig => {
  const values: Array<string | number> = [];
  const spatialClause = `ST_Intersects(${geometryColumn}, ${envelope(bboxFilter, srid)})`;
  const text = `SELECT time_bucket('${timeBucket}', observed_at) AS bucket, ST_SnapToGrid(${geometryColumn}, 0.01, 0.01) AS cell, COUNT(*) as count
FROM ${table}
WHERE ${spatialClause}
GROUP BY bucket, cell
ORDER BY bucket;`;
  return { text, values };
};
