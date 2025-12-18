# Geospatial Intelligence System Deep Plan

## 1) Requirements Expansion
- **Explicit requirements**: Advanced GEOINT toolkit covering MGRS/UTM handling, GeoJSON processing, PostGIS spatial queries, geocoding/reverse-geocoding, route optimization, geofencing, heatmaps, 3D terrain, satellite imagery, projection conversion, spatial clustering, movement analysis, geo-temporal tracking, and comprehensive tests.
- **Implied requirements**: Deterministic math for coordinate transforms, CRS normalization, bbox/proximity query safety, stable clustering thresholds, geofence state machines (entry/exit/dwell), routing graph validation, catalog deduplication, and documented APIs for downstream services.
- **Non-goals**: No persistence layer migrations, no hosted map tiles, no live sensor ingestion, no UI.

## 2) Design
- **Selected design**: Library-first TypeScript module exposing composable utilities with pure functions and minimal stateful components (geocoder catalog + routing graph) to maximize reuse across Node services.
- **Data structures**: Core types in `src/types/geospatial.ts`; GeoJSON helpers in `src/utils/geojson.ts`; projection types in `src/utils/projections.ts`; query builders in `src/postgis/query-builder.ts`; analytics modules under `src/analytics/*`; routing in `src/routing/optimizer.ts`; imagery catalog in `src/imagery/catalog.ts`.
- **Interfaces & invariants**: All public functions consume `GeoPoint` objects (lat, lon in WGS84). Projection converters clamp latitude to [-80,84] to align with UTM validity. PostGIS builders parameterize values instead of interpolating to avoid SQL injection. Routing graph requires nodes before edges; optimizer validates paths. Heatmap/clustering accept tunable radii/epsilon with sane defaults.

## 3) Implementation Plan
- Solidify projection helpers with band/grid validation and normalization (already implemented in `utils/projections.ts`).
- Keep query builders parameterized; ensure filters coerce points to WGS84.
- Maintain geocoder catalog with prefix and spatial ranking; expose async API for service integration (`geocoder.ts`).
- Provide deterministic analytics (geofencing, clustering, heatmap, trajectory) with configurable thresholds.
- Document usage patterns and test hooks (outlined below) to keep coverage high.

## 4) Tests
- **Unit**: Coordinate round-trips (lat/lon ↔ UTM/MGRS), projection normalization, query-builder parameter counts, geocoder ranking, routing path validation, geofence events, clustering/heatmap density, terrain mesh, imagery catalog selection. See `tests/geo-capabilities.test.ts`.
- **How to run**: `npm --prefix packages/geospatial test -- --runInBand` (Jest). Type checks: `npm --prefix packages/geospatial run typecheck`. Build: `npm --prefix packages/geospatial run build`.

## 5) Documentation
- Public API surface exported via `src/index.ts` with inline JSDoc. Usage examples live in `README.md`. This doc provides architecture view for maintainers and should be updated when modules change.

## 6) CI & Quality
- Uses Jest for unit tests and TypeScript for typing. Ensure `npm install` in `packages/geospatial` before running. Avoid networked geocoding/tiling; tests remain deterministic/offline. Security: parameterized SQL, no secrets stored.

## 7) Future Enhancements
- Add optional `proj4` definition registry for custom CRS caching.
- Integrate incremental spatial indexing (R*-tree) for geocoder and heatmap aggregation.
- Provide PostGIS migration helpers for generated indexes based on query-builder usage.
- Add property-based tests for trajectory analytics and clustering stability.
