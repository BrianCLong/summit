import { AutoScalingPolicyGenerator, ServiceMetrics } from './autoscaling';

describe('AutoScalingPolicyGenerator', () => {
  let generator: AutoScalingPolicyGenerator;
  const mockDate = new Date('2023-01-01T00:00:00Z');

  beforeEach(() => {
    generator = new AutoScalingPolicyGenerator();
  });

  it('should generate default policies for low traffic', () => {
    const metrics: ServiceMetrics = {
      cpuUsagePercent: 20,
      memoryUsageBytes: 1024 * 1024 * 50, // 50MB
      requestRateRPS: 10,
      p95LatencyMs: 50,
      errorRatePercent: 0,
      timestamp: mockDate,
    };

    const policies = generator.generatePolicies('test-service', metrics);

    expect(policies.hpa.spec.maxReplicas).toBe(10); // Default max
    expect(policies.hpa.spec.minReplicas).toBe(2);
    expect(policies.vpa.spec.updatePolicy.updateMode).toBe('Auto');
    expect(policies.recommendationReason).toContain('Metrics within normal ranges');
  });

  it('should increase max replicas for high traffic', () => {
    const metrics: ServiceMetrics = {
      cpuUsagePercent: 80,
      memoryUsageBytes: 1024 * 1024 * 50,
      requestRateRPS: 1000, // High RPS
      p95LatencyMs: 100,
      errorRatePercent: 0,
      timestamp: mockDate,
    };

    const policies = generator.generatePolicies('test-service', metrics);

    // 1000 RPS / 50 = 20 replicas + 2 = 22
    expect(policies.hpa.spec.maxReplicas).toBeGreaterThan(10);
    expect(policies.recommendationReason).toContain('High CPU usage');
    expect(policies.recommendationReason).toContain('High Request Rate');
  });

  it('should adjust VPA min memory for high memory usage', () => {
    const metrics: ServiceMetrics = {
      cpuUsagePercent: 50,
      memoryUsageBytes: 1024 * 1024 * 300, // 300MB
      requestRateRPS: 50,
      p95LatencyMs: 100,
      errorRatePercent: 0,
      timestamp: mockDate,
    };

    const policies = generator.generatePolicies('test-service', metrics);

    const memoryPolicy = policies.vpa.spec.resourcePolicy?.containerPolicies[0].minAllowed?.memory;
    expect(memoryPolicy).toBe('256Mi');
    expect(policies.recommendationReason).toContain('High Memory usage');
  });

  it('should scale up for high latency', () => {
     const metrics: ServiceMetrics = {
      cpuUsagePercent: 50,
      memoryUsageBytes: 1024 * 1024 * 50,
      requestRateRPS: 50,
      p95LatencyMs: 1000, // 1000ms latency
      errorRatePercent: 0,
      timestamp: mockDate,
    };

    const policies = generator.generatePolicies('test-service', metrics);

    // Default max is 10. Latency > 500ms triggers 1.5x multiplier.
    // So 10 * 1.5 = 15.
    expect(policies.hpa.spec.maxReplicas).toBe(15);
    expect(policies.recommendationReason).toContain('High Latency');
  });
});
