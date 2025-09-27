
import { admitJob, JobRequest } from './admission-controller';

// Mock QoS configuration for testing
const mockQoSConfig = {
  tiers: {
    default: {
      default: { cap_exploration_percent: 10 },
    },
    team: {
      default: { cap_exploration_percent: 5 },
      experts: {
        rag_retrieval: { cap_exploration_percent: 8 },
      },
    },
    business: {
      default: { cap_exploration_percent: 12 },
    },
    enterprise: {
      default: { cap_exploration_percent: 15 },
      experts: {
        osint_analysis: { cap_exploration_percent: 5 }, // Stricter cap for sensitive expert
      },
    },
  },
};

describe('Admission Controller: admitJob', () => {

  it('should allow a job with exploration percent under the cap', () => {
    const job: JobRequest = {
      tenantId: 'tenant-1',
      tenant_tier: 'team',
      expert: 'rag_retrieval',
      exploration_percent: 7,
      payload: {},
    };
    const decision = admitJob(mockQoSConfig, job);
    expect(decision.allowed).toBe(true);
    expect(decision.mutated).toBeUndefined();
  });

  it('should cap exploration percent when it exceeds the expert-specific limit', () => {
    const job: JobRequest = {
      tenantId: 'tenant-1',
      tenant_tier: 'team',
      expert: 'rag_retrieval',
      exploration_percent: 10,
      payload: {},
    };
    const decision = admitJob(mockQoSConfig, job);
    expect(decision.allowed).toBe(true);
    expect(decision.mutated?.exploration_percent).toBe(8);
    expect(decision.reason).toContain('capped from 10% → 8%');
  });

  it('should cap exploration percent based on the tier default if no expert-specific cap exists', () => {
    const job: JobRequest = {
      tenantId: 'tenant-2',
      tenant_tier: 'team',
      expert: 'some_other_expert',
      exploration_percent: 10,
      payload: {},
    };
    const decision = admitJob(mockQoSConfig, job);
    expect(decision.allowed).toBe(true);
    expect(decision.mutated?.exploration_percent).toBe(5);
    expect(decision.reason).toContain('capped from 10% → 5%');
  });

  it('should use the global default cap for a tier without a specific configuration', () => {
    const job: JobRequest = {
      tenantId: 'tenant-3',
      tenant_tier: 'free', // This tier is not in the config
      expert: 'any_expert',
      exploration_percent: 15,
      payload: {},
    };
    const decision = admitJob(mockQoSConfig, job);
    expect(decision.allowed).toBe(true);
    expect(decision.mutated?.exploration_percent).toBe(10);
    expect(decision.reason).toContain('capped from 15% → 10%');
  });

  it('should handle jobs with no exploration percent specified (defaults to 0)', () => {
    const job: JobRequest = {
      tenantId: 'tenant-4',
      tenant_tier: 'enterprise',
      expert: 'osint_analysis',
      payload: {},
    };
    const decision = admitJob(mockQoSConfig, job);
    expect(decision.allowed).toBe(true);
    expect(decision.mutated).toBeUndefined();
  });

  it('should apply a stricter cap for a specific expert in a high tier', () => {
    const job: JobRequest = {
      tenantId: 'tenant-5',
      tenant_tier: 'enterprise',
      expert: 'osint_analysis',
      exploration_percent: 20,
      payload: {},
    };
    const decision = admitJob(mockQoSConfig, job);
    expect(decision.allowed).toBe(true);
    expect(decision.mutated?.exploration_percent).toBe(5);
    expect(decision.reason).toContain('capped from 20% → 5%');
  });

  it('should use the tier default for an expert without a specific cap in a high tier', () => {
    const job: JobRequest = {
      tenantId: 'tenant-6',
      tenant_tier: 'enterprise',
      expert: 'general_expert',
      exploration_percent: 20,
      payload: {},
    };
    const decision = admitJob(mockQoSConfig, job);
    expect(decision.allowed).toBe(true);
    expect(decision.mutated?.exploration_percent).toBe(15);
    expect(decision.reason).toContain('capped from 20% → 15%');
  });

  it('should return no mutation and no reason if the exploration percent is exactly the cap', () => {
    const job: JobRequest = {
      tenantId: 'tenant-7',
      tenant_tier: 'team',
      expert: 'rag_retrieval',
      exploration_percent: 8,
      payload: {},
    };
    const decision = admitJob(mockQoSConfig, job);
    expect(decision.allowed).toBe(true);
    expect(decision.mutated).toBeUndefined();
    expect(decision.reason).toBeUndefined();
  });
});
