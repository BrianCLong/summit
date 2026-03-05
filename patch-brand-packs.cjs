const fs = require('fs');
let file = fs.readFileSync('server/src/services/brand-packs/brand-pack.routes.ts', 'utf8');

file = file.replace(/const resolution = await service\.getBrandPack\(tenantId, partnerId\);/, 'const resolution = await service.getBrandPack(tenantId as string, partnerId);');
file = file.replace(/const resolution = await service\.applyBrandPack\(\s*tenantId,\s*payload\.packId,\s*payload\.partnerId,\s*\);/g, 'const resolution = await service.applyBrandPack(\n      tenantId as string,\n      payload.packId,\n      payload.partnerId,\n    );');

fs.writeFileSync('server/src/services/brand-packs/brand-pack.routes.ts', file);
