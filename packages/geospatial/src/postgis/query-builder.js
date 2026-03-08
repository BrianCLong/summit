"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTemporalHeatmapQuery = exports.buildRouteMatchQuery = exports.buildGeofenceQuery = exports.buildSpatialQuery = void 0;
const envelope = (bbox, srid = 4326) => `ST_MakeEnvelope(${bbox.minLon}, ${bbox.minLat}, ${bbox.maxLon}, ${bbox.maxLat}, ${srid})`;
const buildSpatialQuery = (table, geometryColumn, options) => {
    const clauses = [];
    const values = [];
    const srid = options.srid ?? 4326;
    if (options.bbox) {
        clauses.push(`ST_Intersects(${geometryColumn}, ${envelope(options.bbox, srid)})`);
    }
    if (options.maxDistance && options.filters?.origin) {
        const origin = options.filters.origin;
        values.push(origin.longitude, origin.latitude, options.maxDistance);
        clauses.push(`ST_DWithin(${geometryColumn}, ST_SetSRID(ST_Point($${values.length - 1}, $${values.length}), ${srid}), $${values.length + 1})`);
    }
    if (options.timeRange) {
        values.push(options.timeRange.start, options.timeRange.end);
        clauses.push(`observed_at BETWEEN $${values.length - 1} AND $${values.length}`);
    }
    if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
            if (key === 'origin')
                return;
            values.push(value);
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
exports.buildSpatialQuery = buildSpatialQuery;
const buildGeofenceQuery = (table, geometryColumn, geofence, srid = 4326) => {
    const values = [JSON.stringify(geofence.geometry)];
    const clause = `ST_Intersects(${geometryColumn}, ST_SetSRID(ST_GeomFromGeoJSON($1), ${srid}))`;
    const enabled = geofence.enabled ? 'TRUE' : 'FALSE';
    return {
        text: `SELECT * FROM ${table} WHERE ${clause} AND ${enabled}`,
        values,
    };
};
exports.buildGeofenceQuery = buildGeofenceQuery;
const buildRouteMatchQuery = (table, geometryColumn, route, toleranceMeters, srid = 4326) => {
    const values = [
        JSON.stringify({ type: 'LineString', coordinates: route.map((p) => [p.longitude, p.latitude]) }),
        toleranceMeters,
    ];
    const clause = `ST_DWithin(${geometryColumn}, ST_SetSRID(ST_GeomFromGeoJSON($1), ${srid}), $2)`;
    return {
        text: `SELECT * FROM ${table} WHERE ${clause}`,
        values,
    };
};
exports.buildRouteMatchQuery = buildRouteMatchQuery;
const buildTemporalHeatmapQuery = (table, geometryColumn, bboxFilter, timeBucket = '1 hour', srid = 4326) => {
    const values = [];
    const spatialClause = `ST_Intersects(${geometryColumn}, ${envelope(bboxFilter, srid)})`;
    const text = `SELECT time_bucket('${timeBucket}', observed_at) AS bucket, ST_SnapToGrid(${geometryColumn}, 0.01, 0.01) AS cell, COUNT(*) as count
FROM ${table}
WHERE ${spatialClause}
GROUP BY bucket, cell
ORDER BY bucket;`;
    return { text, values };
};
exports.buildTemporalHeatmapQuery = buildTemporalHeatmapQuery;
