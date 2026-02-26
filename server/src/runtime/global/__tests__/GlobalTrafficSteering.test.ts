
import { describe, it, expect, beforeEach } from '@jest/globals';
import { GlobalTrafficSteering } from '../GlobalTrafficSteering';

describe('GlobalTrafficSteering', () => {
  let steering: GlobalTrafficSteering;

  beforeEach(() => {
    steering = new GlobalTrafficSteering({
      regions: [
        { name: 'us-east-1', priority: 1 },
        { name: 'eu-west-1', priority: 2 }
      ],
      strategy: 'priority'
    });
  });

  it('should route to highest priority healthy region', () => {
    const region = steering.routeRequest({ userId: '123', sourceIp: '1.1.1.1' });
    expect(region).toBe('us-east-1');
  });

  it('should failover when primary is unhealthy', () => {
    steering.updateHealth('us-east-1', false);
    const region = steering.routeRequest({ userId: '123', sourceIp: '1.1.1.1' });
    expect(region).toBe('eu-west-1');
  });

  it('should return null if all regions down', () => {
    steering.updateHealth('us-east-1', false);
    steering.updateHealth('eu-west-1', false);
    const region = steering.routeRequest({ userId: '123', sourceIp: '1.1.1.1' });
    expect(region).toBeNull();
  });
});
