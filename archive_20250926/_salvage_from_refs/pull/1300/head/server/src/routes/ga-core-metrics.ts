/**
 * GA Core Metrics API Routes
 * Provides Go/No-Go dashboard data and Prometheus metrics endpoint
 */

import express from 'express';
import { gaCoreMetrics } from '../services/GACoremetricsService';
import { getPostgresPool } from '../config/database';
import logger from '../config/logger';

const router = express.Router();
const log = logger.child({ name: 'GACoreMetricsAPI' });

/**
 * Prometheus metrics endpoint for scraping
 */
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', gaCoreMetrics.getMetricsRegistry().contentType);
    res.end(await gaCoreMetrics.getMetricsRegistry().metrics());
  } catch (error) {
    log.error({ error: error.message }, 'Failed to serve Prometheus metrics');
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

/**
 * GA Core status endpoint for dashboards and APIs
 */
router.get('/status', async (req, res) => {
  try {
    const status = await gaCoreMetrics.getCurrentStatus();
    res.json(status);
  } catch (error) {
    log.error({ error: error.message }, 'Failed to get GA Core status');
    res.status(500).json({ error: 'Failed to get status' });
  }
});

/**
 * Detailed GA Core gate status
 */
router.get('/gates', async (req, res) => {
  try {
    const pool = getPostgresPool();
    
    // Get ER precision metrics
    const erMetrics = await pool.query(`
      SELECT 
        entity_type,
        precision,
        target_precision,
        meets_threshold
      FROM (
        SELECT 
          'PERSON' as entity_type,
          COALESCE(
            (SELECT precision FROM er_precision_metrics WHERE entity_type = 'PERSON' ORDER BY last_updated DESC LIMIT 1),
            1.0
          ) as precision,
          0.90 as target_precision,
          COALESCE(
            (SELECT precision FROM er_precision_metrics WHERE entity_type = 'PERSON' ORDER BY last_updated DESC LIMIT 1),
            1.0
          ) >= 0.90 as meets_threshold
        UNION ALL
        SELECT 
          'ORG' as entity_type,
          COALESCE(
            (SELECT precision FROM er_precision_metrics WHERE entity_type = 'ORG' ORDER BY last_updated DESC LIMIT 1),
            1.0
          ) as precision,
          0.88 as target_precision,
          COALESCE(
            (SELECT precision FROM er_precision_metrics WHERE entity_type = 'ORG' ORDER BY last_updated DESC LIMIT 1),
            1.0
          ) >= 0.88 as meets_threshold
      ) er_gates
    `);

    // Get appeal metrics
    const appealMetrics = await pool.query(`
      SELECT get_ga_appeal_metrics(7) as metrics
    `);

    // Get export metrics  
    const exportMetrics = await pool.query(`
      SELECT get_ga_export_metrics(7) as metrics
    `);

    // Get Copilot metrics
    const copilotMetrics = await pool.query(`
      SELECT 
        COUNT(CASE WHEN e.status = 'EXECUTED' THEN 1 END)::DECIMAL /
        NULLIF(COUNT(*), 0) as success_rate,
        AVG(t.confidence) as avg_confidence
      FROM nl_cypher_translations t
      LEFT JOIN nl_cypher_executions e ON t.id = e.translation_id
      WHERE t.created_at >= NOW() - INTERVAL '7 days'
    `);

    const gates = [
      ...erMetrics.rows.map(row => ({
        name: `ER_PRECISION_${row.entity_type}`,
        description: `Entity Resolution ${row.entity_type} precision`,
        currentValue: parseFloat(row.precision),
        threshold: parseFloat(row.target_precision),
        status: row.meets_threshold ? 'PASS' : 'FAIL',
        category: 'Entity Resolution'
      })),
      {
        name: 'APPEALS_SLA',
        description: 'Policy appeals SLA compliance',
        currentValue: parseFloat(appealMetrics.rows[0]?.metrics?.sla_compliance_rate || '0'),
        threshold: 0.90,
        status: parseFloat(appealMetrics.rows[0]?.metrics?.sla_compliance_rate || '0') >= 0.90 ? 'PASS' : 'FAIL',
        category: 'Policy & Appeals'
      },
      {
        name: 'EXPORT_INTEGRITY',
        description: 'Export manifest integrity rate',
        currentValue: parseFloat(exportMetrics.rows[0]?.metrics?.integrity_rate || '0'),
        threshold: 0.95,
        status: parseFloat(exportMetrics.rows[0]?.metrics?.integrity_rate || '0') >= 0.95 ? 'PASS' : 'FAIL',
        category: 'Export & Provenance'
      },
      {
        name: 'COPILOT_SUCCESS',
        description: 'Copilot NL→Cypher success rate',
        currentValue: parseFloat(copilotMetrics.rows[0]?.success_rate || '0'),
        threshold: 0.80,
        status: parseFloat(copilotMetrics.rows[0]?.success_rate || '0') >= 0.80 ? 'PASS' : 'FAIL',
        category: 'AI Copilot'
      }
    ];

    // Calculate overall status
    const passingGates = gates.filter(g => g.status === 'PASS').length;
    const totalGates = gates.length;
    
    let overallStatus: string;
    if (passingGates === totalGates) {
      overallStatus = 'GO';
    } else if (passingGates >= totalGates * 0.8) {
      overallStatus = 'CONDITIONAL_GO';
    } else {
      overallStatus = 'NO_GO';
    }

    res.json({
      overall: overallStatus,
      passingGates,
      totalGates,
      gates,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    log.error({ error: error.message }, 'Failed to get GA Core gates');
    res.status(500).json({ error: 'Failed to get gates' });
  }
});

/**
 * Historical trends for specific metrics
 */
router.get('/trends/:metric', async (req, res) => {
  try {
    const { metric } = req.params;
    const { days = 7 } = req.query;
    const pool = getPostgresPool();
    
    let query: string;
    let params: any[] = [days];

    switch (metric) {
      case 'er_precision':
        query = `
          SELECT 
            DATE(created_at) as date,
            entity_type,
            AVG(precision) as value
          FROM er_ci_metrics
          WHERE created_at >= NOW() - INTERVAL $1 || ' days'
          GROUP BY DATE(created_at), entity_type
          ORDER BY date DESC
        `;
        break;
        
      case 'appeal_sla':
        query = `
          SELECT 
            appeal_date as date,
            'appeals' as metric,
            sla_compliance_rate as value
          FROM policy_appeal_analytics
          WHERE appeal_date >= NOW() - INTERVAL $1 || ' days'
          ORDER BY appeal_date DESC
        `;
        break;
        
      case 'export_integrity':
        query = `
          SELECT 
            export_date as date,
            'integrity' as metric,
            bundle_integrity_rate as value
          FROM export_metrics_realtime
          WHERE export_date >= NOW() - INTERVAL $1 || ' days'
          ORDER BY export_date DESC
        `;
        break;
        
      default:
        return res.status(400).json({ error: 'Unknown metric' });
    }

    const result = await pool.query(query, params);
    
    res.json({
      metric,
      days: parseInt(days as string),
      data: result.rows,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    log.error({ error: error.message, metric: req.params.metric }, 'Failed to get metric trends');
    res.status(500).json({ error: 'Failed to get trends' });
  }
});

/**
 * Real-time dashboard summary
 */
router.get('/dashboard', async (req, res) => {
  try {
    const pool = getPostgresPool();
    
    // Get all key metrics in parallel
    const [erMetrics, appealMetrics, exportMetrics, copilotMetrics, systemMetrics] = await Promise.all([
      // ER precision
      pool.query(`
        SELECT 
          entity_type,
          precision,
          total_decisions,
          reviews_required
        FROM er_precision_metrics
        WHERE last_updated >= NOW() - INTERVAL '1 day'
        ORDER BY entity_type
      `),
      
      // Appeals
      pool.query(`
        SELECT 
          total_appeals,
          pending_appeals,
          sla_compliance_rate,
          avg_response_hours
        FROM policy_appeal_analytics
        WHERE appeal_date = CURRENT_DATE
        LIMIT 1
      `),
      
      // Exports
      pool.query(`
        SELECT 
          total_exports,
          bundle_exports,
          bundle_integrity_rate,
          avg_bundle_size_mb
        FROM export_metrics_realtime
        WHERE export_date = CURRENT_DATE
        LIMIT 1
      `),
      
      // Copilot
      pool.query(`
        SELECT 
          COUNT(*) as total_queries,
          COUNT(CASE WHEN e.status = 'EXECUTED' THEN 1 END) as successful_queries,
          AVG(t.confidence) as avg_confidence,
          COUNT(CASE WHEN t.requires_confirmation THEN 1 END) as high_risk_queries
        FROM nl_cypher_translations t
        LEFT JOIN nl_cypher_executions e ON t.id = e.translation_id
        WHERE t.created_at >= CURRENT_DATE
      `),
      
      // System performance
      pool.query(`
        SELECT 
          COUNT(*) as total_requests,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_response_time
        FROM merge_decisions
        WHERE created_at >= CURRENT_DATE
      `)
    ]);

    const dashboard = {
      timestamp: new Date().toISOString(),
      entityResolution: {
        personPrecision: erMetrics.rows.find(r => r.entity_type === 'PERSON')?.precision || 1.0,
        orgPrecision: erMetrics.rows.find(r => r.entity_type === 'ORG')?.precision || 1.0,
        totalDecisions: erMetrics.rows.reduce((sum, r) => sum + parseInt(r.total_decisions || '0'), 0),
        reviewsRequired: erMetrics.rows.reduce((sum, r) => sum + parseInt(r.reviews_required || '0'), 0)
      },
      policyAppeals: {
        totalAppeals: appealMetrics.rows[0]?.total_appeals || 0,
        pendingAppeals: appealMetrics.rows[0]?.pending_appeals || 0,
        slaCompliance: parseFloat(appealMetrics.rows[0]?.sla_compliance_rate || '1.0'),
        avgResponseHours: parseFloat(appealMetrics.rows[0]?.avg_response_hours || '0')
      },
      exports: {
        totalExports: exportMetrics.rows[0]?.total_exports || 0,
        bundleExports: exportMetrics.rows[0]?.bundle_exports || 0,
        integrityRate: parseFloat(exportMetrics.rows[0]?.bundle_integrity_rate || '1.0'),
        avgBundleSize: parseFloat(exportMetrics.rows[0]?.avg_bundle_size_mb || '0')
      },
      copilot: {
        totalQueries: copilotMetrics.rows[0]?.total_queries || 0,
        successfulQueries: copilotMetrics.rows[0]?.successful_queries || 0,
        successRate: copilotMetrics.rows[0]?.total_queries > 0 ? 
          copilotMetrics.rows[0].successful_queries / copilotMetrics.rows[0].total_queries : 0,
        avgConfidence: parseFloat(copilotMetrics.rows[0]?.avg_confidence || '0'),
        highRiskQueries: copilotMetrics.rows[0]?.high_risk_queries || 0
      },
      performance: {
        totalRequests: systemMetrics.rows[0]?.total_requests || 0,
        avgResponseTime: parseFloat(systemMetrics.rows[0]?.avg_response_time || '0')
      }
    };

    res.json(dashboard);

  } catch (error) {
    log.error({ error: error.message }, 'Failed to get dashboard data');
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

export default router;