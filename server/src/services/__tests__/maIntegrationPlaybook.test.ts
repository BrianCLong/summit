import { maIntegrationPlaybook, type IntegrationState, type IntegrationSignal } from '../integration/maIntegrationPlaybook.js';

describe('MaIntegrationPlaybook', () => {
  it('builds 99 tasks aligned to nine epics', () => {
    const tasks = maIntegrationPlaybook.listTasks();
    expect(tasks).toHaveLength(99);
    const countsByEpic = tasks.reduce<Record<number, number>>((acc, task) => {
      acc[task.epicNumber] = (acc[task.epicNumber] || 0) + 1;
      return acc;
    }, {});

    for (let epic = 1; epic <= 9; epic += 1) {
      expect(countsByEpic[epic]).toBe(11);
    }
  });

  it('evaluates red lines and reports failures with remediation', () => {
    const failingState: IntegrationState = {
      securityPostureScore: 0.7,
      ssoEnabled: false,
      mfaEnabled: false,
      criticalVulnBacklog: 2,
      ipChainValidated: false,
      outstandingLiabilities: 100000,
      dataResidencyMapped: false,
      incidentResponseTested: false,
    };

    const report = maIntegrationPlaybook.evaluateRedLines(failingState);
    expect(report.passed).toBe(false);
    expect(report.failures).toEqual(
      expect.arrayContaining([
        expect.stringContaining('security-posture'),
        expect.stringContaining('ip-chain'),
        expect.stringContaining('liabilities'),
        expect.stringContaining('operational-discipline'),
      ]),
    );

    const passingState: IntegrationState = {
      securityPostureScore: 0.95,
      ssoEnabled: true,
      mfaEnabled: true,
      criticalVulnBacklog: 0,
      ipChainValidated: true,
      outstandingLiabilities: 0,
      dataResidencyMapped: true,
      incidentResponseTested: true,
    };

    const passingReport = maIntegrationPlaybook.evaluateRedLines(passingState);
    expect(passingReport.passed).toBe(true);
    expect(passingReport.failures).toHaveLength(0);
  });

  it('tracks success metrics with tolerance and stage awareness', () => {
    const actuals = {
      'Day-0': { retention: 0.995, uptime: 0.999, arrStability: 1, costEfficiency: 1.04 },
      'Day-30': { retention: 0.991, uptime: 0.998, arrStability: 1.015, costEfficiency: 1.03 },
      'Day-90': { retention: 0.989, uptime: 0.9997, arrStability: 1.05, costEfficiency: 0.93 },
    };

    const reports = maIntegrationPlaybook.evaluateSuccessMetrics(actuals);
    const statuses = Object.fromEntries(reports.map((r) => [r.metricId, r.status]));

    expect(statuses['retention-day0']).toBe('on_track');
    expect(statuses['uptime-day30']).toBe('at_risk');
    expect(statuses['cost-day30']).toBe('at_risk');
    expect(statuses['cost-day90']).toBe('on_track');
    expect(statuses['retention-day90']).toBe('off_track');
  });

  it('flags stop-line criteria when operational risk exceeds thresholds', () => {
    const riskySignal: IntegrationSignal = {
      securityIncidentOpen: true,
      uptime: 0.991,
      churnRate: 0.03,
      customerEscalations: 4,
      drTestHoursSince: 900,
      errorBudgetConsumed: 0.6,
      churnBaseline: 0.01,
      financeControlFailure: true,
    };

    const report = maIntegrationPlaybook.evaluateStopLines(riskySignal);
    expect(report.triggered).toBe(true);
    expect(report.reasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining('open security incident'),
        expect.stringContaining('uptime'),
        expect.stringContaining('churn'),
      ]),
    );
  });

  it('requires future-dated exceptions and prunes expired entries', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);

    const record = maIntegrationPlaybook.registerException({
      reason: 'Temporary billing system overlap',
      owner: 'FinOps Lead',
      expiresAt: futureDate,
      scope: 'billing',
      deviation: 'Dual invoicing for migrated customers',
      risk: 'Revenue leakage and duplicate charges',
      mitigation: 'Shadow invoice reconciliation weekly',
      reviewCadenceDays: 7,
    });

    expect(record.id).toBeDefined();

    const snapshot = maIntegrationPlaybook.listExceptions();
    expect(snapshot.find((entry) => entry.id === record.id)).toBeDefined();

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    expect(() =>
      maIntegrationPlaybook.registerException({
        reason: 'Missing expiry should fail',
        owner: 'Test',
        expiresAt: pastDate,
        scope: 'test',
        deviation: 'test deviation',
        risk: 'test risk',
        mitigation: 'test mitigation',
        reviewCadenceDays: 3,
      }),
    ).toThrow('Exception expiry must be in the future.');

    const pruned = maIntegrationPlaybook.listExceptions(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    expect(pruned.find((entry) => entry.id === record.id)).toBeUndefined();
  });

  it('scores synergy hypotheses based on provided actuals', () => {
    const reports = maIntegrationPlaybook.evaluateSynergies({
      nrrLift: 1.04,
      costSynergy: 0.9,
      workflowCoverage: 2,
    });

    const byId = Object.fromEntries(reports.map((r) => [r.id, r.status]));
    expect(byId['synergy-nrr-lift']).toBe('at_risk');
    expect(byId['synergy-cost']).toBe('at_risk');
    expect(byId['synergy-workflows']).toBe('off_track');
  });

  it('simulates pre-close tabletop and returns actionable gaps', () => {
    const tabletop = maIntegrationPlaybook.runTabletop({
      changeFreezeActive: false,
      crossOrgAccessValidated: false,
      runbookTested: true,
      backupRestoreVerifiedHoursAgo: 200,
      scenario: 'billing-rollback',
      billingRollbackTested: false,
    });

    expect(tabletop.triggered).toBe(true);
    expect(tabletop.reasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Change freeze'),
        expect.stringContaining('Cross-org access'),
        expect.stringContaining('Backups'),
        expect.stringContaining('Billing rollback'),
      ]),
    );
  });

  it('evaluates specific tabletop scenarios including auth and vendor failover gaps', () => {
    const tabletop = maIntegrationPlaybook.runTabletop({
      changeFreezeActive: true,
      crossOrgAccessValidated: true,
      runbookTested: true,
      backupRestoreVerifiedHoursAgo: 24,
      scenario: 'auth-cutover',
      authFallbackTested: false,
      vendorFailoverTested: false,
      billingRollbackTested: true,
      dataIntegrityChecksEnabled: true,
    });

    expect(tabletop.triggered).toBe(true);
    expect(tabletop.reasons).toEqual(expect.arrayContaining([expect.stringContaining('Authentication fallback')]));
  });
});
