#!/usr/bin/env node
/**
 * RepoOS Control Console
 *
 * Unified operational dashboard for Stage 6/7 autonomous repository.
 * Provides real-time visibility into system health and evolution.
 *
 * Beyond FAANG Innovation: Operational cockpit for autonomous engineering systems
 *
 * Metrics displayed:
 *   - Frontier Entropy (real-time)
 *   - Router Accuracy (trend)
 *   - Patch Market Activity (queue depth)
 *   - Merge Throughput (capacity)
 *   - Genome Fitness (architecture health)
 *   - Agent Activity (output rates)
 *   - Stability Envelope (predictive)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Console color codes
 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Load stability metrics
 */
async function loadStabilityMetrics() {
  try {
    const reports = await fs.readdir('.repoos/stability-reports');
    if (reports.length === 0) return null;

    const latestReport = reports.sort().reverse()[0];
    const content = await fs.readFile(`.repoos/stability-reports/${latestReport}`, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Load patch market data
 */
async function loadPatchMarket() {
  try {
    const reports = await fs.readdir('.repoos/patch-market');
    if (reports.length === 0) return null;

    const latestReport = reports.sort().reverse()[0];
    const content = await fs.readFile(`.repoos/patch-market/${latestReport}`, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Load genome data
 */
async function loadGenome() {
  try {
    const content = await fs.readFile('.repoos/genome/architecture-genome.json', 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Load simulation data
 */
async function loadSimulation() {
  try {
    const content = await fs.readFile('.repoos/simulator/architecture-future-report.json', 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}


/**
 * Load launch engine artifacts
 */
async function loadLaunchEngine() {
  try {
    const [registryRaw, metricsRaw] = await Promise.all([
      fs.readFile('.repoos/launch/launch-registry.json', 'utf-8'),
      fs.readFile('.repoos/launch/launch-metrics.json', 'utf-8')
    ]);

    return {
      registry: JSON.parse(registryRaw),
      metrics: JSON.parse(metricsRaw)
    };
  } catch (error) {
    return null;
  }
}

/**
 * Format percentage bar
 */
function formatBar(value, width = 20, threshold = 0.8) {
  const filled = Math.floor(value * width);
  const empty = width - filled;

  const color = value < threshold ? COLORS.green : value < 0.9 ? COLORS.yellow : COLORS.red;

  return `${color}${'█'.repeat(filled)}${COLORS.dim}${'░'.repeat(empty)}${COLORS.reset}`;
}

/**
 * Format metric status
 */
function formatStatus(status) {
  const statusMap = {
    'EXCELLENT': `${COLORS.green}●${COLORS.reset} EXCELLENT`,
    'GOOD': `${COLORS.green}●${COLORS.reset} GOOD`,
    'ACCEPTABLE': `${COLORS.yellow}●${COLORS.reset} ACCEPTABLE`,
    'NORMAL': `${COLORS.yellow}●${COLORS.reset} NORMAL`,
    'STRESSED': `${COLORS.yellow}●${COLORS.reset} STRESSED`,
    'STRESSED': `${COLORS.red}●${COLORS.reset} STRESSED`,
    'CRITICAL': `${COLORS.red}●${COLORS.reset} CRITICAL`,
    'STABLE': `${COLORS.green}●${COLORS.reset} STABLE`,
    'UNSTABLE': `${COLORS.red}●${COLORS.reset} UNSTABLE`
  };

  return statusMap[status] || `${COLORS.dim}●${COLORS.reset} ${status}`;
}

/**
 * Display system health overview
 */
function displaySystemHealth(stability, genome, simulation) {
  console.log(`\n${COLORS.bright}═══════════════════════════════════════════════════════════════════${COLORS.reset}`);
  console.log(`${COLORS.bright}  REPOOS CONTROL CONSOLE${COLORS.reset}`);
  console.log(`${COLORS.bright}═══════════════════════════════════════════════════════════════════${COLORS.reset}\n`);

  // Overall health score
  let healthScore = 0.70;

  if (stability) {
    const assessment = stability.assessment || {};
    const avgScore = assessment.avgScore || 0;
    healthScore = avgScore / 4.0; // Convert 0-4 scale to 0-1
  }

  if (genome) {
    healthScore = (healthScore + (genome.health_score || 0.70)) / 2;
  }

  console.log(`${COLORS.bright}System Health:${COLORS.reset} ${(healthScore * 100).toFixed(0)}%`);
  console.log(`${formatBar(healthScore, 40, 0.75)}\n`);

  // Status indicator
  const overallStatus = healthScore >= 0.85 ? 'EXCELLENT' :
                        healthScore >= 0.70 ? 'GOOD' :
                        healthScore >= 0.50 ? 'ACCEPTABLE' : 'STRESSED';

  console.log(`Status: ${formatStatus(overallStatus)}\n`);
}

/**
 * Display stability metrics
 */
function displayStabilityMetrics(stability) {
  console.log(`${COLORS.bright}Stability Metrics${COLORS.reset}`);
  console.log(`─────────────────────────────────────────────────────────────────\n`);

  if (!stability || !stability.metrics) {
    console.log(`${COLORS.dim}No stability data available${COLORS.reset}\n`);
    return;
  }

  const metrics = stability.metrics;

  // Frontier Entropy
  if (metrics.frontier_entropy) {
    const fe = metrics.frontier_entropy;
    console.log(`${COLORS.cyan}Frontier Entropy${COLORS.reset}`);
    console.log(`  Value: ${(fe.fe * 100).toFixed(1)}% ${formatStatus(fe.status)}`);
    console.log(`  ${formatBar(fe.fe, 30, 0.4)}`);
    console.log(`  Cross-frontier: ${fe.crossFrontierPRs || 0} / ${fe.totalPRs || 0} PRs\n`);
  }

  // Router Accuracy
  if (metrics.router_misclassification) {
    const rmr = metrics.router_misclassification;
    const accuracy = 1 - rmr.rmr;
    console.log(`${COLORS.cyan}Router Accuracy${COLORS.reset}`);
    console.log(`  Accuracy: ${(accuracy * 100).toFixed(1)}% ${formatStatus(rmr.status)}`);
    console.log(`  ${formatBar(accuracy, 30, 0.9)}`);
    console.log(`  Misclassified: ${rmr.misclassified || 0} / ${rmr.totalRouted || 0} PRs\n`);
  }

  // Merge Throughput
  if (metrics.merge_throughput) {
    const mts = metrics.merge_throughput;
    console.log(`${COLORS.cyan}Merge Throughput${COLORS.reset}`);
    console.log(`  Throughput: ${(mts.mts * 100).toFixed(0)}% ${formatStatus(mts.status)}`);
    console.log(`  ${formatBar(mts.mts, 30, 0.9)}`);
    console.log(`  Merged: ${mts.merged || 0} / Opened: ${mts.opened || 0} (24h)\n`);
  }
}

/**
 * Display patch market activity
 */
function displayPatchMarket(market) {
  console.log(`${COLORS.bright}Patch Market${COLORS.reset}`);
  console.log(`─────────────────────────────────────────────────────────────────\n`);

  if (!market) {
    console.log(`${COLORS.dim}No patch market data available${COLORS.reset}\n`);
    return;
  }

  const summary = market.summary || {};

  console.log(`Total PRs: ${market.total_prs || 0}`);
  console.log(`  🔴 High Priority: ${summary.high || 0}`);
  console.log(`  🟡 Medium Priority: ${summary.medium || 0}`);
  console.log(`  🟢 Normal Priority: ${summary.normal || 0}`);
  console.log(`  ⚪ Low Priority: ${summary.low || 0}\n`);

  const avgPriority = market.queue?.reduce((sum, pr) => sum + pr.priority, 0) / (market.queue?.length || 1);
  console.log(`Average Priority: ${(avgPriority * 100).toFixed(0)}%\n`);
}

/**
 * Display genome fitness
 */
function displayGenomeFitness(genome) {
  console.log(`${COLORS.bright}Architectural Genome${COLORS.reset}`);
  console.log(`─────────────────────────────────────────────────────────────────\n`);

  if (!genome) {
    console.log(`${COLORS.dim}No genome data available${COLORS.reset}\n`);
    return;
  }

  console.log(`Version: ${genome.version || 'N/A'}`);
  console.log(`Health: ${((genome.health_score || 0) * 100).toFixed(0)}%`);
  console.log(`  ${formatBar(genome.health_score || 0, 30, 0.75)}\n`);

  console.log(`Modules: ${genome.modules?.length || 0}`);
  console.log(`Motifs: ${genome.motifs?.length || 0}`);

  if (genome.motifs && genome.motifs.length > 0) {
    console.log(`\nTop Motifs:`);
    for (const motif of genome.motifs.slice(0, 3)) {
      console.log(`  ${COLORS.dim}•${COLORS.reset} ${motif.name} (fitness: ${(motif.fitness * 100).toFixed(0)}%)`);
    }
  }

  console.log('');
}

/**
 * Display simulation forecast
 */
function displaySimulationForecast(simulation) {
  console.log(`${COLORS.bright}Evolution Forecast${COLORS.reset}`);
  console.log(`─────────────────────────────────────────────────────────────────\n`);

  if (!simulation) {
    console.log(`${COLORS.dim}No simulation data available${COLORS.reset}\n`);
    return;
  }

  const horizon = simulation.simulation_horizon_days || 180;
  const envelope = simulation.stability_envelope || {};

  console.log(`Horizon: ${horizon} days`);
  console.log(`Status: ${formatStatus(envelope.overall_status || 'UNKNOWN')}\n`);

  if (envelope.metrics) {
    console.log(`Projected Metrics (${horizon}d):`);
    console.log(`  Frontier Entropy: ${(envelope.metrics.fe * 100).toFixed(1)}%`);
    console.log(`  Dependency Density: ${(envelope.metrics.dd * 100).toFixed(1)}%`);
    console.log(`  Merge Utilization: ${(envelope.metrics.rho * 100).toFixed(0)}%`);
    console.log(`  Agent Pressure: ${(envelope.metrics.api * 100).toFixed(0)}%\n`);
  }

  if (simulation.interventions && simulation.interventions.length > 0) {
    console.log(`${COLORS.yellow}⚠️  Interventions Recommended: ${simulation.interventions.length}${COLORS.reset}`);
    for (const intervention of simulation.interventions.slice(0, 2)) {
      console.log(`  ${COLORS.dim}•${COLORS.reset} ${intervention.action}`);
    }
    console.log('');
  }
}


/**
 * Display launch dashboard
 */
function displayLaunchDashboard(launchEngine) {
  console.log(`${COLORS.bright}Ecosystem Launch Dashboard${COLORS.reset}`);
  console.log(`─────────────────────────────────────────────────────────────────\n`);

  if (!launchEngine) {
    console.log(`${COLORS.dim}No launch engine data available${COLORS.reset}\n`);
    return;
  }

  const launches = launchEngine.registry.launches || [];
  const activeLaunches = launches.filter(launch => launch.status !== 'completed');

  console.log(`Registered Launches: ${launches.length}`);
  console.log(`Active Launches: ${activeLaunches.length}`);

  if (activeLaunches.length > 0) {
    console.log('In-Flight Initiatives:');
    for (const launch of activeLaunches.slice(0, 3)) {
      console.log(`  ${COLORS.dim}•${COLORS.reset} ${launch.launch_id} (${launch.stage})`);
    }
  }

  const metrics = launchEngine.metrics.metrics;
  console.log('');
  console.log('Launch Metrics Snapshot:');
  console.log(
    `  Plugin Installs: ${metrics.plugin_installs.current} (target +${metrics.plugin_installs.target_delta_percent}%)`
  );
  console.log(
    `  API RPS: ${metrics.api_traffic_increase.current_rps} (target +${metrics.api_traffic_increase.target_delta_percent}%)`
  );
  console.log(
    `  Weekly Signups: ${metrics.developer_signups.current_weekly} (target +${metrics.developer_signups.target_delta_percent}%)`
  );
  console.log(
    `  Marketplace Tx: ${metrics.marketplace_activity.current_transactions} (target +${metrics.marketplace_activity.target_delta_percent}%)\n`
  );
}

/**
 * Display recent activity
 */
async function displayRecentActivity() {
  console.log(`${COLORS.bright}Recent Activity${COLORS.reset}`);
  console.log(`─────────────────────────────────────────────────────────────────\n`);

  try {
    // Check for recent governance decisions
    const ledger = await fs.readdir('.repoos/governance-ledger').catch(() => []);
    const recentDecisions = ledger.sort().reverse().slice(0, 3);

    if (recentDecisions.length > 0) {
      console.log('Recent Governance Decisions:');
      for (const file of recentDecisions) {
        const content = await fs.readFile(`.repoos/governance-ledger/${file}`, 'utf-8');
        const decision = JSON.parse(content);
        console.log(`  ${COLORS.dim}•${COLORS.reset} PR #${decision.pr_number}: ${decision.decision}`);
      }
      console.log('');
    }

    // Check for recent synthesis proposals
    const synthesis = await fs.readdir('.repoos/synthesis').catch(() => []);
    const recentSynthesis = synthesis.filter(f => f.endsWith('.json')).sort().reverse().slice(0, 2);

    if (recentSynthesis.length > 0) {
      console.log('Recent Synthesis Proposals:');
      for (const file of recentSynthesis) {
        console.log(`  ${COLORS.dim}•${COLORS.reset} ${file.replace('.json', '')}`);
      }
      console.log('');
    }

  } catch (error) {
    console.log(`${COLORS.dim}No recent activity${COLORS.reset}\n`);
  }
}

/**
 * Display footer
 */
function displayFooter() {
  console.log(`${COLORS.bright}═══════════════════════════════════════════════════════════════════${COLORS.reset}`);
  console.log(`${COLORS.dim}Beyond FAANG: Autonomous Engineering System${COLORS.reset}`);
  console.log(`${COLORS.dim}Refresh: node scripts/repoos/repoos-console.mjs${COLORS.reset}\n`);
}

/**
 * Main execution
 */
async function main() {
  // Clear screen
  console.clear();

  // Load all data
  const stability = await loadStabilityMetrics();
  const market = await loadPatchMarket();
  const genome = await loadGenome();
  const simulation = await loadSimulation();
  const launchEngine = await loadLaunchEngine();

  // Display console
  displaySystemHealth(stability, genome, simulation);
  displayStabilityMetrics(stability);
  displayPatchMarket(market);
  displayGenomeFitness(genome);
  displaySimulationForecast(simulation);
  displayLaunchDashboard(launchEngine);
  await displayRecentActivity();
  displayFooter();
}

main().catch(error => {
  console.error('\n❌ Console error:', error);
  process.exit(1);
});
