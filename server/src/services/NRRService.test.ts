import { NRRService } from './NRRService';

describe('NRRService', () => {
  let service: NRRService;

  beforeEach(() => {
    // We can't easily reset the singleton instance state in this test setup without adding a reset method to the class,
    // but for these tests, we can use unique tenant IDs to ensure isolation.
    service = NRRService.getInstance();
  });

  test('should return NRR metrics', async () => {
    const metrics = await service.getNRRMetrics('tenant-1', '2023-Q1');
    expect(metrics).toBeDefined();
    expect(metrics.tenantId).toBe('tenant-1');
    expect(metrics.period).toBe('2023-Q1');
    expect(metrics.netArr).toBe(5000);
  });

  test('should return expansion levers', async () => {
    const levers = await service.getExpansionLevers();
    expect(levers.length).toBeGreaterThan(0);
    expect(levers[0].type).toBeDefined();
  });

  test('should return cohorts', async () => {
    const cohorts = await service.getCohorts();
    expect(cohorts.length).toBeGreaterThan(0);
    expect(cohorts[0].nrrTarget).toBeGreaterThan(0);
  });

  test('should create and retrieve customer growth plan', async () => {
    const tenantId = `tenant-test-${Date.now()}`;
    const plan = await service.createGrowthPlan({
      tenantId: tenantId,
      currentStage: 'Test Stage',
    });
    expect(plan.id).toBeDefined();
    expect(plan.tenantId).toBe(tenantId);
    expect(plan.currentStage).toBe('Test Stage');

    const retrievedPlan = await service.getGrowthPlan(tenantId);
    expect(retrievedPlan).toBeDefined();
    expect(retrievedPlan?.id).toBe(plan.id);
    expect(retrievedPlan?.currentStage).toBe('Test Stage');
  });

  test('should return null for non-existent growth plan', async () => {
    const retrievedPlan = await service.getGrowthPlan('non-existent-tenant');
    expect(retrievedPlan).toBeNull();
  });
});
