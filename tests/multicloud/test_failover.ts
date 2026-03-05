import { AwsProvider } from '../../src/providers/aws-provider';
import { GcpProvider } from '../../src/providers/gcp-provider';
import { SummitQuery } from '../../src/providers/cloud-provider';
import { ProviderRouter } from '../../src/resilience/provider-router';

async function runTests() {
  const aws = new AwsProvider();
  const gcp = new GcpProvider();
  const router = new ProviderRouter([aws, gcp]);

  const q: SummitQuery = { id: 'test-1', payload: {} };

  // Test 1: AWS healthy
  let result = await router.routeQuery(q);
  if (result.provider !== 'AWS') throw new Error('Expected AWS');
  console.log('Test 1 Passed: Routed to AWS');

  // Test 2: AWS down, fallback to GCP
  aws.setHealthy(false);
  result = await router.routeQuery(q);
  if (result.provider !== 'GCP') throw new Error('Expected GCP fallback');
  console.log('Test 2 Passed: Fallback to GCP successful');

  // Test 3: Both down
  gcp.setHealthy(false);
  try {
    await router.routeQuery(q);
    throw new Error('Should have thrown');
  } catch (e) {
    if ((e as Error).message === 'All providers unavailable') {
      console.log('Test 3 Passed: Both down handled correctly');
    } else {
      throw e;
    }
  }
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
