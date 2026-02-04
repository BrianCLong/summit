import { readFileSync, existsSync } from 'node:fs';

const REGISTRY_PATH = 'governance/registry.json';

try {
  console.log('🔍 Verifying Data Governance Registry...');

  if (!existsSync(REGISTRY_PATH)) {
    throw new Error(`Registry file not found at ${REGISTRY_PATH}`);
  }

  const content = readFileSync(REGISTRY_PATH, 'utf8');
  const registry = JSON.parse(content);

  if (!registry.assets || !Array.isArray(registry.assets)) {
    throw new Error('Registry missing "assets" array.');
  }

  let errors = [];

  registry.assets.forEach((asset, index) => {
    const ctx = `Asset #${index} (${asset.id || 'unknown'})`;

    // Check required fields
    if (!asset.id) errors.push(`${ctx}: Missing ID`);
    if (!asset.path) errors.push(`${ctx}: Missing path`);
    if (!asset.owner) errors.push(`${ctx}: Missing owner`);
    if (!asset.classification) errors.push(`${ctx}: Missing classification`);

    // Check file existence
    if (asset.path && !existsSync(asset.path)) {
      errors.push(`${ctx}: File not found at ${asset.path}`);
    }

    // Check owner format
    if (asset.owner && !asset.owner.startsWith('@')) {
      errors.push(`${ctx}: Owner must be a handle starting with @ (got ${asset.owner})`);
    }

    // Check classification enum (basic check)
    const validClassifications = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];
    if (asset.classification && !validClassifications.includes(asset.classification)) {
        errors.push(`${ctx}: Invalid classification '${asset.classification}'. Must be one of: ${validClassifications.join(', ')}`);
    }
  });

  if (errors.length > 0) {
    console.error('❌ Data Registry Verification Failed:');
    errors.forEach(e => console.error(`   - ${e}`));
    process.exit(1);
  }

  console.log(`✅ Verified ${registry.assets.length} governed data assets.`);
  process.exit(0);

} catch (e) {
  console.error(`❌ Fatal Error: ${e.message}`);
  process.exit(1);
}
