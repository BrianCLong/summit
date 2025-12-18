
import { AdaptiveRoutingService } from '../adaptive-routing';

describe('AdaptiveRoutingService', () => {
  let service: AdaptiveRoutingService;

  beforeEach(() => {
    service = new AdaptiveRoutingService();
    // Disable random exploration for deterministic tests
    (service as any).epsilon = 0;
  });

  it('should update profile and prefer better performing agent', () => {
    // Train Agent A (Good)
    for (let i = 0; i < 10; i++) {
        service.updateProfile('agent-a', 'code', 100, true, 0.01);
    }

    // Train Agent B (Bad: High latency, fails often)
    for (let i = 0; i < 10; i++) {
        service.updateProfile('agent-b', 'code', 2000, false, 0.05);
    }

    const choice = service.getBestAgent('code', ['agent-a', 'agent-b']);
    expect(choice).toBe('agent-a');
  });

  it('should handle cold start', () => {
    const choice = service.getBestAgent('unknown-task', ['agent-new-1', 'agent-new-2']);
    // Should default to first one if scores identical
    expect(choice).toBe('agent-new-1');
  });
});
