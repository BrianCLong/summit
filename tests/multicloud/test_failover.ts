import { ProviderRouter } from '../../src/resilience/provider-router';
import { CloudProvider, SummitQuery, Result } from '../../src/providers/cloud-provider';

// Mock Provider implementations for testing
class MockProvider implements CloudProvider {
  name: string;
  isHealthy: boolean;
  shouldFailQuery: boolean;

  constructor(name: string, isHealthy: boolean = true, shouldFailQuery: boolean = false) {
    this.name = name;
    this.isHealthy = isHealthy;
    this.shouldFailQuery = shouldFailQuery;
  }

  async health(): Promise<boolean> {
    return this.isHealthy;
  }

  async query(q: SummitQuery): Promise<Result> {
    if (this.shouldFailQuery) {
      throw new Error(`Query failed on ${this.name}`);
    }
    return {
      status: 'success',
      data: { message: `Query resolved on ${this.name}` },
      provider: this.name,
    };
  }
}

describe('ProviderRouter Multi-Cloud Failover', () => {
  const dummyQuery: SummitQuery = { id: 'q1', type: 'GraphRAG', payload: { text: 'find info' } };

  it('Scenario 1: AWS vector store down -> fallback to GCP', async () => {
    const awsProvider = new MockProvider('aws', false); // Unhealthy
    const gcpProvider = new MockProvider('gcp', true);  // Healthy

    const router = new ProviderRouter([awsProvider, gcpProvider]);

    const result = await router.routeQuery(dummyQuery);

    expect(result.provider).toBe('gcp');
    expect(result.status).toBe('success');
  });

  it('Scenario 2: Redis (Azure) unavailable -> fallback to alternative (AWS)', async () => {
    const azureProvider = new MockProvider('azure', false); // Unhealthy
    const awsProvider = new MockProvider('aws', true);    // Healthy

    const router = new ProviderRouter([azureProvider, awsProvider]);

    const result = await router.routeQuery(dummyQuery);

    expect(result.provider).toBe('aws');
  });

  it('Scenario 3: GraphRAG query still resolves despite multiple failures', async () => {
    const awsProvider = new MockProvider('aws', false); // Unhealthy
    const gcpProvider = new MockProvider('gcp', true, true); // Healthy but fails query
    const azureProvider = new MockProvider('azure', true); // Healthy and succeeds

    const router = new ProviderRouter([awsProvider, gcpProvider, azureProvider]);

    const result = await router.routeQuery(dummyQuery);

    expect(result.provider).toBe('azure');
    expect(result.status).toBe('success');
  });

  it('Should throw an error if all providers are unavailable or fail', async () => {
    const awsProvider = new MockProvider('aws', false);
    const gcpProvider = new MockProvider('gcp', false);

    const router = new ProviderRouter([awsProvider, gcpProvider]);

    await expect(router.routeQuery(dummyQuery)).rejects.toThrow("All providers unavailable");
  });
});
