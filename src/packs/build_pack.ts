import { createHash } from 'crypto';
import { DeployPackSpecSchema } from './spec.js';

export async function buildPack(spec: unknown) {
  const validated = DeployPackSpecSchema.parse(spec);

  const stableSpec = sortObjectKeys(validated);
  const hash = createHash('sha256').update(JSON.stringify(stableSpec)).digest('hex');

  const manifest = {
    ...stableSpec,
    build_id: `PACK-${hash.substring(0, 12)}`,
    build_hash: hash,
    built_at: "2026-01-23T00:00:00Z",
  };

  return manifest;
}

function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  return Object.keys(obj).sort().reduce((acc: any, key) => {
    acc[key] = sortObjectKeys(obj[key]);
    return acc;
  }, {});
}
