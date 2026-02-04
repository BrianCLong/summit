import { test } from 'node:test';
import assert from 'node:assert';
import { FederalIntelligenceIntegration } from '../IntelligenceIntegration.js';

test('FederalIntelligenceIntegration generates deterministic intelligence data', async () => {
  const integration = new FederalIntelligenceIntegration();
  // Initialize data sources
  await (integration as any).loadDataSources();
  
  const dataSource = Array.from((integration as any).dataSources.values())[0] as any;
  
  const data1 = await (integration as any).fetchIntelligenceData(dataSource);
  const data2 = await (integration as any).fetchIntelligenceData(dataSource);
  
  assert.deepStrictEqual(data1, data2);
  assert.ok(data1.length > 0);
});

test('FederalIntelligenceIntegration responds to environment variable overrides', async () => {
  const integration = new FederalIntelligenceIntegration();
  await (integration as any).loadDataSources();
  const dataSource = Array.from((integration as any).dataSources.values())[0] as any;
  
  const envKey = `FEDERAL_CONN_TEST_${dataSource.agency}_${dataSource.classification}`;
  
  process.env[envKey] = 'fail';
  assert.strictEqual(await (integration as any).testConnection(dataSource), false);
  
  process.env[envKey] = 'pass';
  assert.strictEqual(await (integration as any).testConnection(dataSource), true);
  
  delete process.env[envKey];
});

test('FederalIntelligenceIntegration generates deterministic entities and indicators', async () => {
  const integration = new FederalIntelligenceIntegration();
  await (integration as any).loadDataSources();
  const dataSource = Array.from((integration as any).dataSources.values())[0] as any;
  const seed = 'test-seed-123';
  
  const entity1 = (integration as any).createMockEntity(dataSource, seed);
  const entity2 = (integration as any).createMockEntity(dataSource, seed);
  
  assert.deepStrictEqual(entity1, entity2);
  
  const indicator1 = (integration as any).createMockIndicator(dataSource, seed);
  const indicator2 = (integration as any).createMockIndicator(dataSource, seed);
  
  assert.deepStrictEqual(indicator1, indicator2);
});
