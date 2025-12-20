
import AdaptiveRouter from '../adaptive-router';

// Mock backend data for testing
import { Backend } from '../types';

const mockBackends: Backend[] = [
  { id: 'backend-1', address: '1.1.1.1', weight: 5, connections: 10, latency: 50, status: 'UP' },
  { id: 'backend-2', address: '2.2.2.2', weight: 2, connections: 20, latency: 100, status: 'UP' },
  { id: 'backend-3', address: '3.3.3.3', weight: 3, connections: 5, latency: 20, status: 'UP' },
  { id: 'backend-4', address: '4.4.4.4', weight: 1, connections: 15, latency: 80, status: 'DOWN' },
];

describe('AdaptiveRouter', () => {
  let router: typeof AdaptiveRouter;

  beforeEach(() => {
    router = AdaptiveRouter;
    router.updateBackends(JSON.parse(JSON.stringify(mockBackends))); // Deep copy to avoid test interference
  });

  test('weightedRoundRobin should distribute requests according to weights', () => {
    const selections: { [key: string]: number } = {
      'backend-1': 0,
      'backend-2': 0,
      'backend-3': 0,
    };
    const totalRequests = 10;
    for (let i = 0; i < totalRequests; i++) {
      const backend = router.weightedRoundRobin();
      if (backend) {
        selections[backend.id]++;
      }
    }
    expect(selections['backend-1']).toBe(5);
    expect(selections['backend-2']).toBe(2);
    expect(selections['backend-3']).toBe(3);
  });

  test('leastConnections should select the backend with the fewest connections', () => {
    const backend = router.leastConnections();
    expect(backend?.id).toBe('backend-3');
  });

  test('lowestLatency should select the backend with the lowest latency', () => {
    const backend = router.lowestLatency();
    expect(backend?.id).toBe('backend-3');
  });

  test('should not select unhealthy backends', () => {
    const unhealthyBackend = mockBackends.find(b => b.status === 'DOWN');
    const selectedBackendRR = router.weightedRoundRobin();
    expect(selectedBackendRR?.id).not.toBe(unhealthyBackend?.id);
    const selectedBackendLC = router.leastConnections();
    expect(selectedBackendLC?.id).not.toBe(unhealthyBackend?.id);
    const selectedBackendLL = router.lowestLatency();
    expect(selectedBackendLL?.id).not.toBe(unhealthyBackend?.id);
  });
});
