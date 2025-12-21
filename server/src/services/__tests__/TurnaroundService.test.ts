import os from 'os';
import path from 'path';
import { mkdtemp } from 'fs/promises';
import TurnaroundService from '../TurnaroundService.js';

describe('TurnaroundService', () => {
  const createService = async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'turnaround-'));
    const statePath = path.join(tempDir, 'state.json');
    const service = new TurnaroundService(statePath);
    await service.ready();
    return service;
  };

  it('builds a 13-week forecast with variance summary', async () => {
    const service = await createService();
    const forecast = await service.getForecast();
    expect(forecast.weeks).toHaveLength(13);
    expect(forecast.varianceSummary.overBudgetWeeks).toBeDefined();
  });

  it('requires CFO and GC approvals for procurement requests', async () => {
    const service = await createService();
    const request = await service.createProcurementRequest({
      vendor: 'Critical SaaS',
      description: 'Renewal for collaboration suite',
      recurring: true,
      monthlyAmount: 42000,
      requestedBy: 'requester-1',
    });

    expect(request.status).toBe('pending_approval');
    await service.approveProcurement(request.id, 'cfo');
    const afterCfo = (await service.listProcurements())[0];
    expect(afterCfo.status).toBe('pending_approval');
    await service.approveProcurement(request.id, 'gc');
    const approved = (await service.listProcurements())[0];
    expect(approved.status).toBe('approved');
  });

  it('auto-creates anomaly tickets when weekly variance breaches threshold', async () => {
    const service = await createService();
    await service.recordActuals(1, 1_000_000, 2_200_000, 'Variance review week 1');
    const tickets = await service.detectCostAnomalies();
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets[0].autoTicket).toBe(true);
  });

  it('applies savings dividend and reduces projected burn on positive variance', async () => {
    const service = await createService();
    await service.recordActuals(1, 2_200_000, 1_600_000, 'Positive variance');
    const { dividend } = await service.reviewWeekAndApplyDividend(1);
    expect(dividend.banked).toBeGreaterThan(0);
    const dashboard = await service.getDashboard();
    expect(dashboard.metrics.projectedBurnRate).toBeLessThan(1_750_000);
  });

  it('tracks seat reclamations and cloud rightsizing', async () => {
    const service = await createService();
    const seat = await service.reclaimShelfware({
      application: 'CollabSuite',
      seatsReclaimed: 25,
      monthlyCostPerSeat: 50,
      owner: 'ITOps',
    });
    expect(seat.monthlySavings).toBe(1250);

    const cloud = await service.applyCloudRightsizing({
      description: 'Cap autoscaling for staging',
      monthlySavings: 5000,
      owner: 'SRE',
    });
    expect(cloud.id).toBeDefined();

    const dashboard = await service.getDashboard();
    expect(dashboard.cloudRightsizing.length).toBe(1);
    expect(dashboard.seatReclamations.length).toBe(1);
  });
});
