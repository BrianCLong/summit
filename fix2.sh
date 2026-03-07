# Fix registerCogGeoSchemas.ts (import assertions to import attributes)
sed -i 's/assert { type: "json" }/with { type: "json" }/g' packages/summit-schemas/src/coggeo/ajv/registerCogGeoSchemas.ts

# Fix validateWritesetWithCogGeo.ts (rootDir issue)
# Copy registerCogGeoSchemas.ts into the package to avoid rootDir issues
mkdir -p packages/summit-coggeo/src/schemas
cp packages/summit-schemas/src/coggeo/ajv/registerCogGeoSchemas.ts packages/summit-coggeo/src/schemas/registerCogGeoSchemas.ts
cp packages/summit-schemas/src/coggeo/*.schema.json packages/summit-coggeo/src/schemas/

# Update import in validateWritesetWithCogGeo.ts
sed -i 's|../../../summit-schemas/src/coggeo/ajv/registerCogGeoSchemas.js|../schemas/registerCogGeoSchemas.js|g' packages/summit-coggeo/src/graph/validateWritesetWithCogGeo.ts

# Fix storage/duckdb/duckdbClient.ts
sed -i 's/resolve(conn as any);/resolve();/g' packages/summit-coggeo/src/storage/duckdb/duckdbClient.ts
