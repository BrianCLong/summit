git restore .
sed -i 's/"tsx scripts\/managed-migrate.ts up"/"npx tsx scripts\/managed-migrate.ts up"/g' server/package.json
sed -i 's/"tsx scripts\/managed-migrate.ts down"/"npx tsx scripts\/managed-migrate.ts down"/g' server/package.json
sed -i 's/"tsx scripts\/managed-migrate.ts status"/"npx tsx scripts\/managed-migrate.ts status"/g' server/package.json

sed -i 's/"test": "jest"/"test": "npx jest"/g' agents/multimodal/package.json
sed -i 's/"test:coverage": "jest \\"--coverage\\""/"test:coverage": "npx jest \\"--coverage\\""/g' agents/multimodal/package.json
