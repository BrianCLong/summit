# Fix registerCogGeoSchemas.ts (paths)
sed -i 's|\.\./|\./|g' packages/summit-coggeo/src/schemas/registerCogGeoSchemas.ts

# Fix duckdbClient.ts resolve issue
sed -i 's/resolve();/resolve(conn);/g' packages/summit-coggeo/src/storage/duckdb/duckdbClient.ts
