import path from 'path';
import { fileURLToPath } from 'url';
import { calculateBurnReport, loadBudget, loadMetrics } from '../calc-burn';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const budgetPath = path.resolve(__dirname, '../../ops/error-budgets/mvp4ga.yaml');
const metricsPath = path.resolve(__dirname, 'fixtures/metrics.mvp4ga.json');

describe('calc-burn parser', () => {
  it('loads the error budget definition with expected objectives', () => {
    const budget = loadBudget(budgetPath);

    expect(budget.service).toBe('mvp4ga');
    expect(budget.slos).toHaveLength(2);
    expect(budget.slos[0]).toMatchObject({ name: 'api-availability', objective: 0.995, window_days: 28 });
    expect(budget.slos[1]).toMatchObject({ name: 'api-latency', objective: 0.975, window_days: 28 });
    expect(budget.slos[0].alert_windows?.[0]).toEqual({ window: '1h', burn_rate: 2 });
  });
});

describe('calc-burn report generation', () => {
  it('returns deterministic burn rates and aggregates per SLO', () => {
    const budget = loadBudget(budgetPath);
    const metrics = loadMetrics(metricsPath);

    const report = calculateBurnReport(budget, metrics);
    expect(report.service).toBe('mvp4ga');
    expect(report.slos).toHaveLength(2);

    const availability = report.slos.find((slo) => slo.name === 'api-availability');
    expect(availability?.windows.map((w) => w.window)).toEqual(['1h', '6h']);
    expect(availability?.windows[0].burnRate).toBeCloseTo(1.1111, 3);
    expect(availability?.windows[1].burnRate).toBeCloseTo(1.8518, 3);
    expect(availability?.aggregate.errorRate).toBeCloseTo(0.00873, 5);
    expect(availability?.aggregate.burnRate).toBeCloseTo(1.746, 3);
    expect(availability?.aggregate.budgetRemaining).toBe(0);

    const latency = report.slos.find((slo) => slo.name === 'api-latency');
    expect(latency?.windows.map((w) => w.window)).toEqual(['1h', '24h']);
    expect(latency?.windows[0].burnRate).toBeCloseTo(2.222, 3);
    expect(latency?.windows[1].burnRate).toBeCloseTo(1.733, 3);
    expect(latency?.aggregate.errorRate).toBeCloseTo(0.044025, 5);
    expect(latency?.aggregate.burnRate).toBeCloseTo(1.761, 3);
    expect(latency?.aggregate.budgetRemaining).toBe(0);
  });
});
