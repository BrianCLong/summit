import { EnterpriseSalesService } from '../EnterpriseSalesService.js';
import { InMemoryEnterpriseSalesRepository, EnterpriseSalesAccount } from '../enterpriseSalesRepository.js';

const baseAccount = (): EnterpriseSalesAccount => ({
  name: 'Acme Defense',
  icpFit: 5,
  arrPotential: 2500000,
  strategicValue: 5,
  accountGeneral: 'ae-1',
  stopLossRule: 'Exit if no champion by week 3',
  exitCriteria: 'No MAP or exec sponsor after 30 days',
  map: {
    owner: 'ae-1',
    nextStep: 'Schedule architecture workshop',
    milestones: [
      { name: 'Discovery', dueDate: new Date().toISOString(), status: 'in-progress' },
      { name: 'POC kickoff', dueDate: new Date().toISOString(), status: 'planned' },
    ],
  },
  dossier: {
    orgChart: ['CIO', 'CISO', 'VP Eng'],
    initiatives: ['Modernize intel stack'],
    stack: ['Snowflake', 'Neo4j'],
    pains: ['Slow investigations'],
    budgets: [{ amount: 500000, approved: true, window: 'Q1' }],
    timing: 'Q1',
  },
  winThemes: ['Faster POCs', 'Security evidence ready'],
  procurement: {
    fastLane: true,
    slaHours: 48,
    redlineGuardrails: ['Standard DPA'],
    controlEvidence: ['SOC2 lite'],
    pricingGuardrails: 'No more than 10% discount',
    slaBreaches: 0,
    avgCycleTimeDays: 7,
  },
  poc: {
    status: 'active',
    targetDays: 21,
    observability: ['logs'],
    benchmarks: ['p99 < 400ms'],
  },
  deployment: {
    sso: true,
    scim: true,
    rbacTemplates: true,
    auditLogs: true,
    drRpoHours: 4,
    drRtoHours: 2,
    siem: true,
  },
  renewal: {
    renewalDate: new Date().toISOString(),
    qbrCadence: 'quarterly',
    riskFlags: [],
    execSponsor: 'CEO',
  },
  expansion: {
    triggers: ['New team onboarded'],
    playbooks: ['Land and expand'],
    stickinessFeatures: ['approvals'],
  },
  riskRegister: [],
  metrics: {
    execTouches: 1,
    mapSigned: true,
    championStrength: 4,
    championEngagements: 1,
  },
  coverageScore: 0,
  predictiveScore: 0,
  overallScore: 0,
});

describe('EnterpriseSalesService', () => {
  it('calculates coverage and predictive scores on upsert', async () => {
    const repo = new InMemoryEnterpriseSalesRepository();
    const service = new EnterpriseSalesService(repo);
    const created = await service.upsertAccount(baseAccount());

    expect(created.coverageScore).toBeGreaterThan(50);
    expect(created.predictiveScore).toBeGreaterThan(50);
    expect(created.overallScore).toBeGreaterThan(created.predictiveScore / 10);
  });

  it('updates metrics when recording executive touch activity', async () => {
    const repo = new InMemoryEnterpriseSalesRepository();
    const service = new EnterpriseSalesService(repo);
    const created = await service.upsertAccount(baseAccount());

    const updated = await service.recordActivity({
      accountId: created.id!,
      type: 'EXEC_TOUCH',
      payload: { note: 'CIO meeting' },
    });

    expect(updated?.metrics.execTouches).toBe(2);
    expect(updated?.coverageScore).toBeGreaterThan(created.coverageScore - 0.1);
  });

  it('surfaces dashboard coverage and stop-loss data', async () => {
    const repo = new InMemoryEnterpriseSalesRepository();
    const service = new EnterpriseSalesService(repo);

    await service.upsertAccount(baseAccount());
    const weakAccount = baseAccount();
    weakAccount.name = 'Lagging Org';
    weakAccount.metrics.championStrength = 1;
    weakAccount.poc.status = 'at-risk';
    await service.upsertAccount(weakAccount);

    const dashboard = await service.dashboard();
    expect(dashboard.coverage).toBeGreaterThan(0);
    expect(dashboard.stopLossTriggered).toBeGreaterThan(0);
    expect(dashboard.pocHealth['at-risk']).toBe(1);
  });
});
