
import { Neo4jGraphAnalyticsService } from '../src/services/GraphAnalyticsService';

// Define the mock delay and delay function
const MOCK_DB_DELAY_MS = 10;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Testable subclass
class TestableGraphAnalyticsService extends Neo4jGraphAnalyticsService {
  public setMocks(mockGetDriver: any, mockRunCypher: any) {
    this.deps = {
      getDriver: mockGetDriver,
      runCypher: mockRunCypher
    };
  }
}

async function runBenchmark() {
  console.log('Initializing benchmark...');
  // Since getInstance returns the singleton, we need to cast or just create a new one for testing
  // But the singleton is standard.
  // We can create a new instance of TestableGraphAnalyticsService directly since we are extending it.

  const service = new TestableGraphAnalyticsService();

  // Create manual mocks
  const mockGetDriver = () => ({
    session: () => ({
      run: async () => {
        await delay(MOCK_DB_DELAY_MS);
        return {
          records: [{
            get: (key: string) => {
              if (key === 'p') {
                return {
                  length: 1,
                  segments: [{
                    start: { properties: { id: '1' } },
                    end: { properties: { id: '2' } },
                    relationship: { type: 'RELATED', properties: { id: 'r1' } }
                  }]
                };
              }
              return null;
            }
          }]
        };
      },
      close: async () => {}
    })
  });

  const mockRunCypher = async () => {
    await delay(MOCK_DB_DELAY_MS);
    return [{
      nodes: [{ id: '1', labels: ['Entity'], properties: {} }],
      edges: [{ id: 'e1', type: 'RELATED', properties: {}, fromEntityId: '1', toEntityId: '2' }]
    }];
  };

  // Inject mocks
  service.setMocks(mockGetDriver, mockRunCypher);

  const iterations = 50;

  // Benchmark shortestPath
  console.log('Starting shortestPath benchmark...');
  const startShortest = Date.now();
  for (let i = 0; i < iterations; i++) {
    try {
      await service.shortestPath({
        tenantId: 'tenant-1',
        from: '1',
        to: '2'
      });
    } catch (e) {
      console.error('Error in shortestPath:', e);
      throw e;
    }
  }
  const endShortest = Date.now();
  const durationShortest = endShortest - startShortest;
  const rpsShortest = (iterations / durationShortest) * 1000;

  // Benchmark kHopNeighborhood
  console.log('Starting kHopNeighborhood benchmark...');
  const startKHop = Date.now();
  for (let i = 0; i < iterations; i++) {
    try {
      await service.kHopNeighborhood({
        tenantId: 'tenant-1',
        seedIds: ['1'],
        depth: 2
      });
    } catch (e) {
       console.error('Error in kHopNeighborhood:', e);
       throw e;
    }
  }
  const endKHop = Date.now();
  const durationKHop = endKHop - startKHop;
  const rpsKHop = (iterations / durationKHop) * 1000;

  console.log(`\n=== BENCHMARK RESULTS (Baseline) ===`);
  console.log(`shortestPath: ${iterations} iterations in ${durationShortest}ms -> ${rpsShortest.toFixed(2)} RPS`);
  console.log(`kHopNeighborhood: ${iterations} iterations in ${durationKHop}ms -> ${rpsKHop.toFixed(2)} RPS`);
  console.log(`====================================\n`);
}

runBenchmark().catch(console.error);
