import { buildBundle } from '../../server/src/services/ActiveLearningBundle.js';
import path from 'path';

const tenantId = process.argv[2] || 'demo';
const outDir = process.argv[3] || 'dist/bundles';

(async () => {
  const res = await buildBundle({ tenantId, since: new Date(0).toISOString(), outDir });
  console.log(`Bundle manifest at ${res.manifestPath}`);
})();
