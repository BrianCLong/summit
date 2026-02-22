import { CatalogStore } from '../../src/connectors/osint-catalog/catalogStore';
import { OsintAsset } from '../../src/connectors/osint-catalog/types';

async function runTest() {
  console.log('Starting OSINT Catalog Test...');
  const store = new CatalogStore();
  let failures = 0;

  const asset1: any = {
    asset_id: 'test-asset-1',
    name: 'Test Asset',
    license: { name: 'CC0' },
    provenance: { source: 'test', method: 'manual' },
    privacy: { has_pii: false },
    shareability: 'public',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['test', 'osint']
  };

  const asset2: any = {
    asset_id: 'test-asset-2',
    name: 'Private Asset',
    license: { name: 'Proprietary' },
    provenance: { source: 'internal', method: 'api' },
    privacy: { has_pii: true, retention_policy: 'restricted' },
    shareability: 'internal',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['internal']
  };

  try {
    // Test Add
    await store.addAsset(asset1);
    await store.addAsset(asset2);
    console.log('✅ Assets added successfully');

    // Test Duplicate
    try {
      await store.addAsset(asset1);
      console.error('❌ Duplicate asset add passed (should fail)');
      failures++;
    } catch (e) {
      console.log('✅ Duplicate asset add failed as expected');
    }

    // Test Search
    const results = await store.searchAssets({ tag: 'test' });
    if (results.length === 1 && results[0].asset_id === 'test-asset-1') {
      console.log('✅ Search by tag passed');
    } else {
      console.error('❌ Search by tag failed');
      failures++;
    }

    const internalResults = await store.searchAssets({ shareability: 'internal' });
    if (internalResults.length === 1 && internalResults[0].asset_id === 'test-asset-2') {
      console.log('✅ Search by shareability passed');
    } else {
      console.error('❌ Search by shareability failed');
      failures++;
    }

  } catch (e) {
    console.error('❌ Unexpected error:', e);
    failures++;
  }

  if (failures > 0) {
    console.error(`\n❌ Catalog Tests Failed with ${failures} errors.`);
    process.exit(1);
  } else {
    console.log('\n✅ All Catalog Tests Passed');
  }
}

runTest();
