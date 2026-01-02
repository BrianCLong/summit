/**
 * Explainability Exports API Routes
 *
 * Endpoints for exporting explainability data to external systems (SIEM, GRC, etc.)
 */

import { Router, Request, Response } from 'express';
import { ExplainabilityExplorerService } from '../explainability/ExplainabilityExplorerService';
import { SIEMExportService, SIEMConfig } from '../integrations/SIEMExportService';
import { ExplainableRun } from '../explainability/types';

const router = Router();
const explorerService = ExplainabilityExplorerService.getInstance();
const siemService = SIEMExportService.getInstance();

/**
 * POST /api/explainability/export/siem
 *
 * Export runs to SIEM system.
 * Body:
 *   - provider: 'splunk' | 'datadog' | 'elastic' | 'sumologic' | 'custom'
 *   - endpoint: SIEM endpoint URL
 *   - apiKey: API key for authentication
 *   - run_ids: Array of run IDs to export (optional, exports all if omitted)
 *   - filter: ListRunsFilter (optional, used if run_ids omitted)
 *   - batch_size: Batch size for chunked export (default: 100)
 */
router.post('/siem', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;
    const requesterId = (req as any).user?.id || 'anonymous';

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        errors: [
          {
            code: 'TENANT_REQUIRED',
            message: 'Tenant context required for this operation',
          },
        ],
      });
    }

    const {
      provider,
      endpoint,
      apiKey,
      run_ids,
      filter,
      batch_size = 100,
      sourceType,
      index,
      tags,
    } = req.body;

    if (!provider || !endpoint || !apiKey) {
      return res.status(400).json({
        success: false,
        errors: [
          {
            code: 'INVALID_PARAMS',
            message: 'provider, endpoint, and apiKey are required',
          },
        ],
      });
    }

    const config: SIEMConfig = {
      provider,
      endpoint,
      apiKey,
      sourceType,
      index,
      tags,
    };

    let runs: ExplainableRun[] = [];

    // Fetch runs to export
    if (run_ids && Array.isArray(run_ids)) {
      // Export specific runs
      for (const runId of run_ids) {
        const response = await explorerService.getRun(runId, tenantId, requesterId);
        if (response.success && response.data) {
          runs.push(response.data);
        }
      }
    } else {
      // Export based on filter
      const response = await explorerService.listRuns(tenantId, filter || {}, requesterId);
      if (response.success && response.data) {
        runs = response.data;
      }
    }

    if (runs.length === 0) {
      return res.status(404).json({
        success: false,
        errors: [
          {
            code: 'NO_RUNS_FOUND',
            message: 'No runs found to export',
          },
        ],
      });
    }

    // Export to SIEM
    const result = await siemService.batchExport(runs, config, batch_size);

    return res.status(result.success ? 200 : 500).json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      errors: [
        {
          code: 'EXPORT_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    });
  }
});

/**
 * POST /api/explainability/export/json
 *
 * Export runs as JSON file.
 * Body:
 *   - run_ids: Array of run IDs to export
 *   - filter: ListRunsFilter (optional, used if run_ids omitted)
 */
router.post('/json', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;
    const requesterId = (req as any).user?.id || 'anonymous';

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        errors: [
          {
            code: 'TENANT_REQUIRED',
            message: 'Tenant context required for this operation',
          },
        ],
      });
    }

    const { run_ids, filter } = req.body;
    let runs: ExplainableRun[] = [];

    // Fetch runs to export
    if (run_ids && Array.isArray(run_ids)) {
      for (const runId of run_ids) {
        const response = await explorerService.getRun(runId, tenantId, requesterId);
        if (response.success && response.data) {
          runs.push(response.data);
        }
      }
    } else {
      const response = await explorerService.listRuns(tenantId, filter || {}, requesterId);
      if (response.success && response.data) {
        runs = response.data;
      }
    }

    if (runs.length === 0) {
      return res.status(404).json({
        success: false,
        errors: [
          {
            code: 'NO_RUNS_FOUND',
            message: 'No runs found to export',
          },
        ],
      });
    }

    // Return JSON with proper headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="explainability-export-${new Date().toISOString()}.json"`
    );

    return res.status(200).json({
      export_metadata: {
        export_timestamp: new Date().toISOString(),
        tenant_id: tenantId,
        exported_by: requesterId,
        count: runs.length,
        version: '1.0.0',
      },
      runs,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      errors: [
        {
          code: 'EXPORT_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    });
  }
});

/**
 * POST /api/explainability/export/csv
 *
 * Export runs as CSV file (simplified format).
 * Body:
 *   - run_ids: Array of run IDs to export
 *   - filter: ListRunsFilter (optional, used if run_ids omitted)
 */
router.post('/csv', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;
    const requesterId = (req as any).user?.id || 'anonymous';

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        errors: [
          {
            code: 'TENANT_REQUIRED',
            message: 'Tenant context required for this operation',
          },
        ],
      });
    }

    const { run_ids, filter } = req.body;
    let runs: ExplainableRun[] = [];

    // Fetch runs to export
    if (run_ids && Array.isArray(run_ids)) {
      for (const runId of run_ids) {
        const response = await explorerService.getRun(runId, tenantId, requesterId);
        if (response.success && response.data) {
          runs.push(response.data);
        }
      }
    } else {
      const response = await explorerService.listRuns(tenantId, filter || {}, requesterId);
      if (response.success && response.data) {
        runs = response.data;
      }
    }

    if (runs.length === 0) {
      return res.status(404).json({
        success: false,
        errors: [
          {
            code: 'NO_RUNS_FOUND',
            message: 'No runs found to export',
          },
        ],
      });
    }

    // Build CSV
    const headers = [
      'run_id',
      'run_type',
      'actor_name',
      'started_at',
      'duration_ms',
      'confidence',
      'explanation_summary',
      'capabilities_used',
      'policy_decisions',
    ];

    const csvRows = [headers.join(',')];

    for (const run of runs) {
      const row = [
        run.run_id,
        run.run_type,
        run.actor.actor_name,
        run.started_at,
        run.duration_ms?.toString() || '',
        run.confidence.overall_confidence.toString(),
        `"${run.explanation.summary.replace(/"/g, '""')}"`,
        `"${run.capabilities_used.join(', ')}"`,
        `"${run.policy_decisions.map((pd) => `${pd.policy_name}:${pd.decision}`).join(', ')}"`,
      ];

      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');

    // Return CSV with proper headers for download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="explainability-export-${new Date().toISOString()}.csv"`
    );

    return res.status(200).send(csv);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      errors: [
        {
          code: 'EXPORT_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    });
  }
});

export default router;
