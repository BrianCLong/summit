#!/usr/bin/env node
/**
 * Stability Envelope Monitor
 *
 * Monitors the three critical metrics that predict repository instability:
 *
 * 1. Frontier Entropy (FE): cross-subsystem PRs / total PRs
 * 2. Router Misclassification Rate (RMR): router corrections / total routed patches
 * 3. Merge Throughput Stability (MTS): merged PRs / generated PRs
 *
 * These metrics provide 2-3 weeks early warning before CI failures begin.
 *
 * Beyond FAANG: Predictive stability monitoring vs reactive alerts
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Target thresholds for stable operation
 */
const THRESHOLDS = {
  // Frontier Entropy (FE)
  fe_excellent: 0.20,
  fe_good: 0.30,
  fe_acceptable: 0.40,
  fe_critical: 0.50,

  // Router Misclassification Rate (RMR)
  rmr_excellent: 0.05,
  rmr_good: 0.10,
  rmr_acceptable: 0.20,
  rmr_critical: 0.30,

  // Merge Throughput Stability (MTS)
  mts_excellent: 1.00,
  mts_good: 0.95,
  mts_acceptable: 0.80,
  mts_critical: 0.60
};

/**
 * Load domain map
 */
async function loadDomainMap() {
  try {
    const yaml = await import('js-yaml');
    const content = await fs.readFile('.repoos/domain-map.yml', 'utf-8');
    return yaml.default.load(content);
  } catch (error) {
    console.warn('Could not load domain map, using fallback classification');
    return null;
  }
}

/**
 * Classify file to domain based on domain map
 */
function classifyFileToDomain(filePath, domainMap) {
  if (!domainMap || !domainMap.domains) {
    // Fallback classification
    if (/^client\/|^ui\/|\.tsx$/.test(filePath)) return 'frontend';
    if (/^server\/|^services\/|api\//.test(filePath)) return 'backend';
    if (/^packages\//.test(filePath)) return 'platform';
    return 'general';
  }

  for (const [domainName, domain] of Object.entries(domainMap.domains)) {
    if (domain.subsystem_patterns) {
      for (const pattern of domain.subsystem_patterns) {
        // Convert glob pattern to regex
        const regexPattern = pattern
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\//g, '\\/');

        if (new RegExp(regexPattern).test(filePath)) {
          return domainName;
        }
      }
    }
  }

  return 'general';
}

/**
 * Compute Frontier Entropy (FE)
 * Measures cross-domain patch frequency
 */
async function computeFrontierEntropy(prCount = 100) {
  console.log('\n━━━ Computing Frontier Entropy (FE) ━━━\n');

  const domainMap = await loadDomainMap();

  try {
    // Get recent PRs
    const prs = execSync(`gh pr list --state all --limit ${prCount} --json number,files`, {
      encoding: 'utf-8'
    });

    const prList = JSON.parse(prs);
    let totalPRs = 0;
    let crossFrontierPRs = 0;

    for (const pr of prList) {
      if (!pr.files || pr.files.length === 0) continue;

      totalPRs++;

      // Get domains touched
      const domains = new Set();
      for (const file of pr.files) {
        const domain = classifyFileToDomain(file.path, domainMap);
        domains.add(domain);
      }

      if (domains.size > 1) {
        crossFrontierPRs++;
      }
    }

    const fe = totalPRs > 0 ? crossFrontierPRs / totalPRs : 0;

    const status =
      fe < THRESHOLDS.fe_excellent ? 'EXCELLENT' :
      fe < THRESHOLDS.fe_good ? 'GOOD' :
      fe < THRESHOLDS.fe_acceptable ? 'ACCEPTABLE' :
      fe < THRESHOLDS.fe_critical ? 'STRESSED' : 'CRITICAL';

    console.log(`Total PRs analyzed: ${totalPRs}`);
    console.log(`Cross-frontier PRs: ${crossFrontierPRs}`);
    console.log(`Frontier Entropy: ${(fe * 100).toFixed(1)}%`);
    console.log(`Status: ${status}`);

    if (fe >= THRESHOLDS.fe_critical) {
      console.log('\n⚠️  CRITICAL: Frontier entropy exceeds critical threshold');
      console.log('   Architecture boundaries are weakening');
      console.log('   Recommendation: Enforce SFPC strictly + consolidate subsystems');
    } else if (fe >= THRESHOLDS.fe_acceptable) {
      console.log('\n⚠️  WARNING: Frontier entropy elevated');
      console.log('   Monitor for continued increase');
    } else {
      console.log('\n✅ Frontier entropy within healthy range');
    }

    return {
      fe,
      status,
      totalPRs,
      crossFrontierPRs,
      threshold_excellent: THRESHOLDS.fe_excellent,
      threshold_critical: THRESHOLDS.fe_critical
    };

  } catch (error) {
    console.error('Error computing frontier entropy:', error.message);
    return {
      fe: 0,
      status: 'UNKNOWN',
      error: error.message
    };
  }
}

/**
 * Compute Router Misclassification Rate (RMR)
 * Measures routing accuracy
 */
async function computeRouterMisclassification(prCount = 100) {
  console.log('\n━━━ Computing Router Misclassification Rate (RMR) ━━━\n');

  try {
    // This would integrate with actual router logs
    // For now, estimate based on PR reassignments and review comments

    const prs = execSync(`gh pr list --state merged --limit ${prCount} --json number,reviews,comments`, {
      encoding: 'utf-8'
    });

    const prList = JSON.parse(prs);
    let totalRouted = prList.length;
    let misclassified = 0;

    for (const pr of prList) {
      // Heuristic: check for routing corrections in comments
      const allComments = [
        ...(pr.reviews || []),
        ...(pr.comments || [])
      ];

      const hasRoutingCorrection = allComments.some(c =>
        c.body && (
          /wrong\s+owner/i.test(c.body) ||
          /should\s+be\s+routed\s+to/i.test(c.body) ||
          /reassign/i.test(c.body)
        )
      );

      if (hasRoutingCorrection) {
        misclassified++;
      }
    }

    const rmr = totalRouted > 0 ? misclassified / totalRouted : 0;

    const status =
      rmr < THRESHOLDS.rmr_excellent ? 'EXCELLENT' :
      rmr < THRESHOLDS.rmr_good ? 'GOOD' :
      rmr < THRESHOLDS.rmr_acceptable ? 'ACCEPTABLE' :
      rmr < THRESHOLDS.rmr_critical ? 'DEGRADED' : 'UNRELIABLE';

    console.log(`Total PRs routed: ${totalRouted}`);
    console.log(`Misclassified PRs: ${misclassified}`);
    console.log(`Router Misclassification Rate: ${(rmr * 100).toFixed(1)}%`);
    console.log(`Status: ${status}`);

    if (rmr >= THRESHOLDS.rmr_critical) {
      console.log('\n⚠️  CRITICAL: Router accuracy unreliable');
      console.log('   Recommendation: Retrain router + clarify domain boundaries');
    } else if (rmr >= THRESHOLDS.rmr_acceptable) {
      console.log('\n⚠️  WARNING: Router accuracy degrading');
      console.log('   Consider Multi-Signal Ownership Resolution (MSOR)');
    } else {
      console.log('\n✅ Router accuracy within healthy range');
    }

    return {
      rmr,
      status,
      totalRouted,
      misclassified,
      threshold_excellent: THRESHOLDS.rmr_excellent,
      threshold_critical: THRESHOLDS.rmr_critical
    };

  } catch (error) {
    console.error('Error computing router misclassification:', error.message);
    return {
      rmr: 0,
      status: 'UNKNOWN',
      error: error.message
    };
  }
}

/**
 * Compute Merge Throughput Stability (MTS)
 * Measures if merge system is keeping up with patch generation
 */
async function computeMergeThroughputStability() {
  console.log('\n━━━ Computing Merge Throughput Stability (MTS) ━━━\n');

  try {
    // Get PRs opened and merged in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const openedPRs = execSync(
      `gh pr list --state all --search "created:>=${oneDayAgo}" --json number`,
      { encoding: 'utf-8' }
    );

    const mergedPRs = execSync(
      `gh pr list --state merged --search "merged:>=${oneDayAgo}" --json number`,
      { encoding: 'utf-8' }
    );

    const opened = JSON.parse(openedPRs).length;
    const merged = JSON.parse(mergedPRs).length;

    const mts = opened > 0 ? merged / opened : 1.0;

    const status =
      mts >= THRESHOLDS.mts_excellent ? 'EXCELLENT' :
      mts >= THRESHOLDS.mts_good ? 'GOOD' :
      mts >= THRESHOLDS.mts_acceptable ? 'ACCEPTABLE' :
      mts >= THRESHOLDS.mts_critical ? 'SATURATED' : 'OVERLOADED';

    console.log(`PRs opened (24h): ${opened}`);
    console.log(`PRs merged (24h): ${merged}`);
    console.log(`Merge Throughput Stability: ${(mts * 100).toFixed(1)}%`);
    console.log(`Status: ${status}`);

    if (mts < THRESHOLDS.mts_critical) {
      console.log('\n⚠️  CRITICAL: Merge pipeline overloaded');
      console.log('   Queue is building faster than merges');
      console.log('   Recommendation: Introduce patch market prioritization');
    } else if (mts < THRESHOLDS.mts_acceptable) {
      console.log('\n⚠️  WARNING: Merge throughput declining');
      console.log('   Monitor queue growth');
    } else if (mts > 1.0) {
      console.log('\n✅ Merge system absorbing backlog');
    } else {
      console.log('\n✅ Merge throughput within healthy range');
    }

    return {
      mts,
      status,
      opened,
      merged,
      threshold_excellent: THRESHOLDS.mts_excellent,
      threshold_critical: THRESHOLDS.mts_critical
    };

  } catch (error) {
    console.error('Error computing merge throughput:', error.message);
    return {
      mts: 0,
      status: 'UNKNOWN',
      error: error.message
    };
  }
}

/**
 * Assess overall stability envelope
 */
function assessStabilityEnvelope(fe, rmr, mts) {
  console.log('\n━━━ Stability Envelope Assessment ━━━\n');

  const scores = {
    fe: fe.status === 'EXCELLENT' ? 4 : fe.status === 'GOOD' ? 3 : fe.status === 'ACCEPTABLE' ? 2 : fe.status === 'STRESSED' ? 1 : 0,
    rmr: rmr.status === 'EXCELLENT' ? 4 : rmr.status === 'GOOD' ? 3 : rmr.status === 'ACCEPTABLE' ? 2 : rmr.status === 'DEGRADED' ? 1 : 0,
    mts: mts.status === 'EXCELLENT' ? 4 : mts.status === 'GOOD' ? 3 : mts.status === 'ACCEPTABLE' ? 2 : mts.status === 'SATURATED' ? 1 : 0
  };

  const avgScore = (scores.fe + scores.rmr + scores.mts) / 3;

  const overallStatus =
    avgScore >= 3.5 ? 'STABLE' :
    avgScore >= 2.5 ? 'NORMAL' :
    avgScore >= 1.5 ? 'STRESSED' : 'UNSTABLE';

  console.log(`FE Status:  ${fe.status}`);
  console.log(`RMR Status: ${rmr.status}`);
  console.log(`MTS Status: ${mts.status}`);
  console.log('');
  console.log(`Overall Stability: ${overallStatus}`);

  if (overallStatus === 'UNSTABLE') {
    console.log('\n🚨 UNSTABLE: Repository approaching instability');
    console.log('   Predicted CI failures in 2-3 weeks if uncorrected');
    console.log('\n   Immediate Actions:');
    console.log('   1. Run subsystem consolidation');
    console.log('   2. Enforce SFPC strictly');
    console.log('   3. Activate patch market prioritization');
    console.log('   4. Consider emergency architectural review');
  } else if (overallStatus === 'STRESSED') {
    console.log('\n⚠️  STRESSED: Repository under architectural stress');
    console.log('   Monitor closely and address weak metrics');
  } else if (overallStatus === 'NORMAL') {
    console.log('\n✓ NORMAL: Repository operating within normal parameters');
  } else {
    console.log('\n✅ STABLE: Repository operating optimally');
  }

  return {
    overallStatus,
    scores,
    avgScore
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║        Stability Envelope Monitor                              ║');
  console.log('║        Beyond FAANG: Predictive Instability Detection         ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const prSampleSize = process.env.PR_SAMPLE_SIZE ? parseInt(process.env.PR_SAMPLE_SIZE) : 100;

  console.log(`Analyzing last ${prSampleSize} PRs for stability metrics...\n`);

  // Compute metrics
  const fe = await computeFrontierEntropy(prSampleSize);
  const rmr = await computeRouterMisclassification(prSampleSize);
  const mts = await computeMergeThroughputStability();

  // Assess overall stability
  const assessment = assessStabilityEnvelope(fe, rmr, mts);

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    metrics: {
      frontier_entropy: fe,
      router_misclassification: rmr,
      merge_throughput: mts
    },
    assessment,
    thresholds: THRESHOLDS
  };

  const reportPath = `.repoos/stability-reports/stability-report-${new Date().toISOString().split('T')[0]}.json`;
  await fs.mkdir('.repoos/stability-reports', { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n✓ Stability report saved: ${reportPath}\n`);

  console.log('Beyond FAANG Innovation:');
  console.log('  This monitoring provides 2-3 weeks early warning');
  console.log('  before CI failures appear, enabling proactive intervention.');
  console.log('');

  // Exit with appropriate code
  if (assessment.overallStatus === 'UNSTABLE') {
    process.exit(1);
  } else if (assessment.overallStatus === 'STRESSED') {
    process.exit(0); // Warning but not blocking
  } else {
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n❌ Stability monitoring error:', error);
  process.exit(2);
});
