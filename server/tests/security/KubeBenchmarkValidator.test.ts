import { kubeBenchmarkValidator } from '../src/security/KubeBenchmarkValidator.js';

describe('KubeBenchmarkValidator', () => {
  it('should run CIS benchmark simulation when tools are missing', async () => {
    const result = await kubeBenchmarkValidator.runCisBenchmark();
    expect(result.tool).toBe('kube-bench');
    expect(result.status).toBe('fail'); // Simulated result has a failure
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('should run NSA benchmark simulation when tools are missing', async () => {
    const result = await kubeBenchmarkValidator.runNsaBenchmark();
    expect(result.tool).toBe('kubescape');
    expect(result.status).toBe('fail'); // Simulated result has a failure
    expect(result.items.length).toBeGreaterThan(0);
  });
});
