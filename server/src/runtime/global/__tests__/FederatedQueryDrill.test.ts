
import { describe, it, expect } from '@jest/globals';
import { federatedQueryPlanner } from '../FederatedQueryPlanner.js';

describe('Federated Mesh Query Drill (Task #111)', () => {
  const tenantId = 'global-investigator';

  it('should decompose a global search query into multiple regional sub-queries', async () => {
    const query = 'MATCH (n:Person) WHERE n.name = "BadActor" RETURN n';
    
    const plan = await federatedQueryPlanner.planQuery(query, tenantId, { globalSearch: true });

    expect(plan.subQueries.length).toBeGreaterThan(1);
    expect(plan.mergeStrategy).toBe('UNION');

    // Verify push-down logic
    for (const sub of plan.subQueries) {
      expect(sub.pushedDownFilters).toContain('tenant_isolation');
      expect(sub.query).toContain(sub.region);
    }
  });

  it('should use AGGREGATE strategy for count queries', async () => {
    const query = 'MATCH (n:Event) RETURN count(n)';
    
    const plan = await federatedQueryPlanner.planQuery(query, tenantId);

    expect(plan.mergeStrategy).toBe('AGGREGATE');
  });

  it('should correctly identify push-down filters from WHERE clauses', async () => {
    const query = 'MATCH (e:Entity) WHERE e.type = "indicator" RETURN e';
    
    const plan = await federatedQueryPlanner.planQuery(query, tenantId);
    
    expect(plan.subQueries[0].pushedDownFilters).toContain('temporal_filter');
  });
});
