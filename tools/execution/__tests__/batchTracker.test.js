import fs from 'fs';
import path from 'path';
import {
  cli,
  generateDashboard,
  generateWeeklyReport,
  loadPlan,
  savePlan,
  updateBatch,
  updateMetrics,
  validatePlan,
} from '../batchTracker.js';

describe('batchTracker', () => {
  const tempDir = path.join(process.cwd(), 'tmp-test');
  const planPath = path.join(tempDir, 'plan.json');

  const basePlan = {
    batches: [
      {
        id: 'batch-1',
        name: 'Critical Blockers',
        priority: 'P0',
        status: 'not-started',
        progress: 0,
        targetDate: 'Week 1-2',
        blockers: [],
        owner: '',
        notes: '',
      },
    ],
    metrics: {
      prsMerged: 0,
      ciPassRate: 0,
      coverage: 0,
      productionIncidents: 0,
      deploymentMinutes: 0,
    },
  };

  beforeEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.mkdirSync(tempDir, { recursive: true });
    savePlan(basePlan, planPath);
  });

  it('loads and saves a plan', () => {
    const loaded = loadPlan(planPath);
    expect(loaded.batches).toHaveLength(1);
    expect(loaded.batches[0].name).toBe('Critical Blockers');
  });

  it('validates plan structure', () => {
    const plan = loadPlan(planPath);
    expect(() => validatePlan(plan)).not.toThrow();
    const invalid = { ...plan, batches: [] };
    expect(() => validatePlan(invalid)).toThrow('non-empty batches');
  });

  it('updates batch status, progress, and blockers', () => {
    const plan = loadPlan(planPath);
    const updated = updateBatch(plan, 'batch-1', {
      status: 'in-progress',
      progress: 50,
      owner: 'owner',
      blockers: ['batch-0'],
      targetDate: 'Week 2',
    });
    expect(updated.batches[0].status).toBe('in-progress');
    expect(updated.batches[0].progress).toBe(50);
    expect(updated.batches[0].owner).toBe('owner');
    expect(updated.batches[0].blockers).toContain('batch-0');
    expect(updated.batches[0].targetDate).toBe('Week 2');
  });

  it('rejects invalid status', () => {
    const plan = loadPlan(planPath);
    expect(() => updateBatch(plan, 'batch-1', { status: 'invalid' })).toThrow('Invalid status');
  });

  it('updates metrics', () => {
    const plan = loadPlan(planPath);
    const updated = updateMetrics(plan, { ciPassRate: 90, coverage: 85 });
    expect(updated.metrics.ciPassRate).toBe(90);
    expect(updated.metrics.coverage).toBe(85);
  });

  it('rejects invalid metrics', () => {
    const plan = loadPlan(planPath);
    expect(() => updateMetrics(plan, { coverage: -1 })).toThrow('non-negative');
  });

  it('generates dashboard markdown', () => {
    const plan = loadPlan(planPath);
    const dashboard = generateDashboard(plan);
    expect(dashboard).toContain('| Batch | Priority | Status | Progress | Target Date | Blockers |');
    expect(dashboard).toContain('Critical Blockers');
  });

  it('generates weekly report', () => {
    const plan = loadPlan(planPath);
    const report = generateWeeklyReport(plan, 'Week 1');
    expect(report).toContain('Weekly Progress Report - Week 1');
    expect(report).toContain('Current Batch: Critical Blockers');
  });

  it('updates plan via CLI', () => {
    process.env.EXECUTION_PLAN_PATH = planPath;
    cli(['update', 'batch-1', 'status=done', 'progress=100']);
    const updated = loadPlan(planPath);
    expect(updated.batches[0].status).toBe('done');
    expect(updated.batches[0].progress).toBe(100);
  });

  it('updates metrics via CLI', () => {
    process.env.EXECUTION_PLAN_PATH = planPath;
    cli(['metrics', 'ciPassRate=95', 'coverage=80', 'prsMerged=5']);
    const updated = loadPlan(planPath);
    expect(updated.metrics.ciPassRate).toBe(95);
    expect(updated.metrics.coverage).toBe(80);
    expect(updated.metrics.prsMerged).toBe(5);
  });
});
