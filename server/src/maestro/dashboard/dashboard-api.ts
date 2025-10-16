import express from 'express';
import { runsRepo } from '../runs/runs-repo.js';
import { Pool } from 'pg';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';

const router = express.Router();
router.use(ensureAuthenticated); // Ensure all routes require authentication

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://maestro:maestro-dev-secret@localhost:5432/maestro',
});

// GET /summary - Dashboard overview data
router.get(
  '/summary',
  requirePermission('dashboard:read'),
  async (_req, res) => {
    try {
      // Get runs statistics
      const runsQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        AVG(duration_ms) as avg_duration,
        SUM(cost) as total_cost
      FROM runs 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY status
    `;
      const runsStats = await pool.query(runsQuery);

      // Calculate health metrics
      const totalRuns = runsStats.rows.reduce(
        (sum, row) => sum + parseInt(row.count),
        0,
      );
      const successfulRuns =
        runsStats.rows.find((row) => row.status === 'succeeded')?.count || 0;
      const successRate = totalRuns > 0 ? successfulRuns / totalRuns : 1.0;
      const avgDuration =
        runsStats.rows.find((row) => row.status === 'succeeded')
          ?.avg_duration || 180;
      const totalCost = runsStats.rows.reduce(
        (sum, row) => sum + parseFloat(row.total_cost || 0),
        0,
      );

      // Get recent runs for activity feed
      const recentRuns = await runsRepo.list(8);

      // Get recent approvals (mock for now)
      const approvals =
        totalRuns > 0 && successRate < 0.9
          ? [{ id: 'appr_1', reason: 'Low success rate detected' }]
          : [];

      // Generate mock activity feed
      const changes = [
        {
          at: new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleString(),
          title: `Budget update: Cost ceiling increased to $${Math.ceil(totalCost * 1.5)}/day`,
          by: 'system',
        },
        {
          at: new Date(Date.now() - 4 * 60 * 60 * 1000).toLocaleString(),
          title: 'Policy updated: Auto-rollback on >5% error rate',
          by: 'admin',
        },
      ];

      const summary = {
        autonomy: {
          level: successRate > 0.95 ? 4 : successRate > 0.9 ? 3 : 2,
          canary: 0.1,
        },
        health: {
          success: Number(successRate.toFixed(3)),
          p95: Math.round(avgDuration * 1.2), // Approximate P95 as 120% of average
          burn: successRate < 0.95 ? 2.5 : 0.5, // Error budget burn rate
        },
        budgets: {
          remaining: Math.max(0, 5000 - totalCost),
          cap: 5000,
        },
        runs: recentRuns.map((run) => ({
          id: run.id,
          status:
            run.status === 'succeeded'
              ? 'Succeeded'
              : run.status === 'failed'
                ? 'Failed'
                : run.status === 'running'
                  ? 'Running'
                  : 'Queued',
        })),
        approvals,
        changes,
      };

      res.json(summary);
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// GET /pipelines - Enhanced pipelines list with ownership info
router.get(
  '/pipelines',
  requirePermission('pipeline:read'),
  async (_req, res) => {
    try {
      const query = `
      SELECT p.id, p.name, p.spec, p.created_at,
             COUNT(r.id) as run_count,
             MAX(r.created_at) as last_run
      FROM pipelines p
      LEFT JOIN runs r ON p.id = r.pipeline_id
      GROUP BY p.id, p.name, p.spec, p.created_at
      ORDER BY p.created_at DESC
    `;

      const result = await pool.query(query);

      const pipelines = result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        version: '1.0.0', // Could be derived from spec or separate versioning
        owner: 'system', // Could be enhanced with user ownership
        run_count: parseInt(row.run_count),
        last_run: row.last_run,
      }));

      res.json(pipelines);
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// GET /autonomy - Autonomy configuration
router.get(
  '/autonomy',
  requirePermission('autonomy:read'),
  async (_req, res) => {
    try {
      // Calculate autonomy level based on system health
      const healthQuery = `
      SELECT 
        COUNT(*) as total_runs,
        COUNT(*) FILTER (WHERE status = 'succeeded') as successful_runs
      FROM runs 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `;
      const healthResult = await pool.query(healthQuery);
      const { total_runs, successful_runs } = healthResult.rows[0];

      const successRate = total_runs > 0 ? successful_runs / total_runs : 1.0;
      const autonomyLevel =
        successRate > 0.98
          ? 4
          : successRate > 0.95
            ? 3
            : successRate > 0.9
              ? 2
              : 1;

      const autonomyData = {
        level: autonomyLevel,
        policies: [
          { title: 'Change freeze on Fridays after 12:00', state: 'ON' },
          {
            title: 'Auto-rollback if error budget burn > 2%/h',
            state: successRate > 0.95 ? 'ON' : 'OFF',
          },
          { title: 'Dual-approval for risk score >= 7/10', state: 'ON' },
          { title: 'Cost ceiling $200/run', state: 'ON' },
        ],
      };

      res.json(autonomyData);
    } catch (error) {
      console.error('Error fetching autonomy data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// PUT /autonomy - Update autonomy level
router.put(
  '/autonomy',
  requirePermission('autonomy:update'),
  async (req, res) => {
    try {
      const { level } = req.body;

      if (typeof level !== 'number' || level < 1 || level > 4) {
        return res.status(400).json({ error: 'Invalid autonomy level' });
      }

      // In a real system, this would update configuration/policies
      // For now, return the requested level with appropriate policies
      const autonomyData = {
        level,
        policies: [
          {
            title: 'Change freeze on Fridays after 12:00',
            state: level >= 2 ? 'ON' : 'OFF',
          },
          {
            title: 'Auto-rollback if error budget burn > 2%/h',
            state: level >= 3 ? 'ON' : 'OFF',
          },
          {
            title: 'Dual-approval for risk score >= 7/10',
            state: level >= 2 ? 'ON' : 'OFF',
          },
          { title: 'Cost ceiling $200/run', state: 'ON' },
        ],
      };

      res.json(autonomyData);
    } catch (error) {
      console.error('Error updating autonomy:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// GET /recipes - Available recipes/templates
router.get('/recipes', requirePermission('recipe:read'), async (_req, res) => {
  try {
    const recipes = [
      { id: 'r1', name: 'Rapid Attribution', version: '1.0.0', verified: true },
      {
        id: 'r2',
        name: 'SLO Guard Enforcement',
        version: '1.2.0',
        verified: true,
      },
      { id: 'r3', name: 'Cost Clamp', version: '0.9.1', verified: false },
      {
        id: 'r4',
        name: 'Security Scan Pipeline',
        version: '2.1.0',
        verified: true,
      },
      {
        id: 'r5',
        name: 'Model Training Pipeline',
        version: '1.5.0',
        verified: true,
      },
    ];

    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
