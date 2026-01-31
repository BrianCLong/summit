/**
 * Release Pipeline Integration for Evidence ID Gate
 * Hooks into release evidence packaging and provenance
 */

import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

/**
 * Integrate evidence ID consistency check results into release evidence bundle
 */
export async function addEvidenceIdResultsToReleaseBundle(releaseBundlePath, evidenceRunPath = 'artifacts/governance/evidence-id-consistency') {
  try {
    const latestRun = await findLatestEvidenceRun(evidenceRunPath);
    if (!latestRun) {
      throw new Error(`No evidence ID consistency runs found at ${evidenceRunPath}`);
    }

    const runPath = join(evidenceRunPath, latestRun);
    
    // Read evidence gate artifacts
    const reportPath = join(runPath, 'report.json');
    const stampPath = join(runPath, 'stamp.json');
    const metricsPath = join(runPath, 'metrics.json');
    
    const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
    const stamp = JSON.parse(await fs.readFile(stampPath, 'utf8'));
    let metrics = null;
    try {
      metrics = JSON.parse(await fs.readFile(metricsPath, 'utf8'));
    } catch {
      // Metrics file may not exist
    }

    // Create evidence verification record for the bundle
    const evidenceRecord = {
      id: 'evidence-id-consistency-verification',
      generator: 'evidence-id-consistency-gate',
      version: report.version,
      generated_at: report.generated_at || new Date().toISOString(),
      generator_version: report.generator,
      run_sha: report.sha,
      run_timestamp: stamp.timestamp,
      status: report.status,
      artifacts: {
        report_sha: createHash('sha256').update(JSON.stringify(report)).digest('hex'),
        report_path: `artifacts/governance/evidence-id-consistency/${latestRun}/report.json`,
        stamp_path: `artifacts/governance/evidence-id-consistency/${latestRun}/stamp.json`,
        metrics_path: metrics ? `artifacts/governance/evidence-id-consistency/${latestRun}/metrics.json` : null
      },
      totals: report.totals,
      configuration: metrics?.configuration,
      performance: metrics?.performance
    };

    // Add to release bundle manifest
    const bundleManifestPath = join(releaseBundlePath, 'evidence-bundle.manifest.json');
    let bundleManifest = { version: '1.0.0', evidence: [] };
    
    if (await fileExists(bundleManifestPath)) {
      bundleManifest = JSON.parse(await fs.readFile(bundleManifestPath, 'utf8'));
    }
    
    // Add or update evidence record
    const existingIndex = bundleManifest.evidence.findIndex(e => e.id === evidenceRecord.id);
    if (existingIndex >= 0) {
      bundleManifest.evidence[existingIndex] = evidenceRecord;  // Update existing
    } else {
      bundleManifest.evidence.push(evidenceRecord);  // Add new
    }
    
    // Write updated manifest
    await fs.writeFile(bundleManifestPath, JSON.stringify(bundleManifest, null, 2), 'utf8');
    
    // Also copy the actual artifacts to the release bundle
    const destDir = join(releaseBundlePath, 'evidence-verification');
    await fs.mkdir(destDir, { recursive: true });
    
    await copyFileIfExists(reportPath, join(destDir, 'report.json'));
    await copyFileIfExists(stampPath, join(destDir, 'stamp.json'));
    if (metrics) {
      await copyFileIfExists(metricsPath, join(destDir, 'metrics.json'));
    }
    
    return {
      success: true,
      evidence_record: evidenceRecord,
      bundle_updated: true,
      destination: destDir
    };
  } catch (error) {
    console.error(`Failed to add evidence ID results to release bundle: ${error.message}`);
    throw error;
  }
}

/**
 * Verify evidence consistency before allowing release sign-off
 */
export async function verifyEvidenceIdComplianceForRelease(minimumComplianceRate = 0.95) {
  try {
    const latestRun = await findLatestEvidenceRun('artifacts/governance/evidence-id-consistency');
    if (!latestRun) {
      throw new Error('No evidence ID consistency run found for verification');
    }
    
    const runPath = join('artifacts/governance/evidence-id-consistency', latestRun);
    const reportPath = join(runPath, 'report.json');
    const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
    
    const documentsChecked = report.totals.documents_checked;
    const errorsCount = report.totals.errors;
    
    const complianceRate = documentsChecked > 0 ? (documentsChecked - errorsCount) / documentsChecked : 1.0;
    const isCompliant = complianceRate >= minimumComplianceRate;
    
    const verificationResult = {
      is_compliant: isCompliant,
      compliance_rate: complianceRate,
      minimum_required: minimumComplianceRate,
      documents_analyzed: documentsChecked,
      violations_count: report.totals.violations,
      errors_count: errorsCount,
      warnings_count: report.totals.warnings,
      report_sha: report.sha,
      status_message: isCompliant 
        ? `Compliant at ${complianceRate.toFixed(3)} (${errorsCount}/${documentsChecked} errors)` 
        : `Non-compliant at ${complianceRate.toFixed(3)} (${errorsCount}/${documentsChecked} errors), below minimum ${minimumComplianceRate}`
    };
    
    return verificationResult;
  } catch (error) {
    console.error(`Evidence ID compliance verification failed: ${error.message}`);
    return {
      is_compliant: false,
      compliance_rate: 0,
      error: error.message,
      status_message: `Verification failed: ${error.message}`
    };
  }
}

/**
 * Find the latest evidence run directory
 */
async function findLatestEvidenceRun(basePath) {
  try {
    const entries = await fs.readdir(basePath, { withFileTypes: true });
    const directories = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort((a, b) => b.localeCompare(a)); // Sort reverse chronologically by name
      
    return directories.length > 0 ? directories[0] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy file if it exists
 */
async function copyFileIfExists(srcPath, dstPath) {
  if (await fileExists(srcPath)) {
    const content = await fs.readFile(srcPath);
    await fs.writeFile(dstPath, content);
  }
}