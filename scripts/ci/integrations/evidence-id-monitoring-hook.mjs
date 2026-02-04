/**
 * Evidence ID Gate Integration Hook for SOC Dashboards
 * Provides evidence status metrics for compliance monitoring
 */

import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Get evidence ID consistency status for SOC dashboard
 */
export async function getEvidenceIdStatus(artifactPath = 'artifacts/governance/evidence-id-consistency') {
  try {
    // Get the most recent run directory
    const dirs = await fs.readdir(artifactPath, { withFileTypes: true });
    const runDirs = dirs
      .filter(d => d.isDirectory() && !d.name.startsWith('.'))
      .sort((a, b) => b.name.localeCompare(a.name)); // Sort by name descending (newest first)

    if (runDirs.length === 0) {
      throw new Error(`No runs found in ${artifactPath}`);
    }

    const latestRun = runDirs[0];
    const runPath = join(artifactPath, latestRun.name);
    
    // Load the report
    const reportPath = join(runPath, 'report.json');
    const reportContent = await fs.readFile(reportPath, 'utf8');
    const report = JSON.parse(reportContent);
    
    // Load metrics if available
    let metrics = null;
    const metricsPath = join(runPath, 'metrics.json');
    try {
      const metricsContent = await fs.readFile(metricsPath, 'utf8');
      metrics = JSON.parse(metricsContent);
    } catch (error) {
      // Metrics file may not exist, that's ok
    }

    // Calculate SOC-specific metrics
    const socMetrics = {
      timestamp: new Date().toISOString(),
      run_id: latestRun.name,
      report_sha: report.sha,
      gate_status: report.status,
      documents_analyzed: report.totals.documents_checked,
      evidence_ids_found: report.totals.evidence_ids_found,
      evidence_ids_registered: report.totals.evidence_ids_registered,
      violations_total: report.totals.violations,
      errors_count: report.totals.errors,
      warnings_count: report.totals.warnings,
      consistency_ratio: report.totals.documents_checked > 0 
        ? (report.totals.documents_checked - report.totals.errors) / report.totals.documents_checked 
        : 1,
      orphaned_evidence_count: report.totals.evidence_ids_orphaned,
      performance: metrics?.performance || null,
      configuration: metrics?.configuration || null,
      severity_breakdown: {
        errors: report.totals.errors,
        warnings: report.totals.warnings,
        infos: report.totals.infos
      }
    };

    return socMetrics;
  } catch (error) {
    console.error(`Failed to get evidence ID status: ${error.message}`);
    throw error;
  }
}

/**
 * Push evidence status to external monitoring system
 */
export async function pushEvidenceStatusToMonitoring(statusData) {
  // This would integrate with your actual monitoring system
  // For example, pushing to Prometheus, Datadog, or internal metrics system
  
  const metricsPayload = {
    metric: 'evidence_id_gate_health',
    timestamp: Date.now(),
    tags: {
      run_id: statusData.run_id,
      status: statusData.gate_status,
      generator: statusData.report_sha ? statusData.report_sha.substring(0, 8) : 'unknown'
    },
    fields: {
      documents_analyzed: statusData.documents_analyzed,
      evidence_ids_found: statusData.evidence_ids_found,
      violations_total: statusData.violations_total,
      errors_count: statusData.errors_count,
      warnings_count: statusData.warnings_count,
      consistency_ratio: statusData.consistency_ratio,
      orphaned_evidence_count: statusData.orphaned_evidence_count
    }
  };
  
  // In a real implementation, you would send this to your metrics system
  console.log(`[METRICS] Would push:`, JSON.stringify(metricsPayload, null, 2));
  
  return {
    success: true,
    payload: metricsPayload
  };
}

/**
 * Generate evidence compliance summary for release pipeline integration
 */
export async function generateEvidenceComplianceReport() {
  try {
    const status = await getEvidenceIdStatus();
    
    const complianceReport = {
      version: '1.0.0',
      generated_at: new Date().toISOString(),
      generator: 'evidence-id-gate-soc-integration',
      gate_version: status.report_sha?.substring(0, 8) || 'unknown',
      compliance_status: status.gate_status === 'pass' && status.errors_count === 0 ? 'compliant' : 'non_compliant',
      summary: {
        title: 'Evidence ID Consistency Compliance Report',
        description: 'Verification of Evidence-IDs consistency across governance documents',
        status: status.gate_status,
        run_id: status.run_id
      },
      metrics: {
        documents_analyzed: status.documents_analyzed,
        evidence_ids_tracked: status.evidence_ids_found,
        registry_completeness: status.evidence_ids_registered,
        violation_rate: status.violations_total / status.documents_analyzed,
        error_rate: status.errors_count / status.documents_analyzed,
        warning_rate: status.warnings_count / status.documents_analyzed
      },
      findings: {
        high_severity: status.errors_count,
        medium_severity: status.warnings_count,
        low_severity: status.infos || 0
      },
      recommendations: status.errors_count > 0
        ? [`Fix ${status.errors_count} high severity violations before release`]
        : status.warnings_count > 0
          ? [`Address ${status.warnings_count} warnings for optimal compliance`]
          : ['Evidence ID consistency is optimal']
    };
    
    return complianceReport;
  } catch (error) {
    console.error(`Failed to generate compliance report: ${error.message}`);
    return {
      error: error.message,
      compliance_status: 'unknown'
    };
  }
}