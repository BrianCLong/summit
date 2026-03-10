#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

const REGISTRY_PATH = '.repoos/launch/launch-registry.json';
const TIMELINE_PATH = '.repoos/launch/launch-timeline.json';
const METRICS_PATH = '.repoos/launch/launch-metrics.json';
const EVIDENCE_PATH = '.repoos/evidence/launch-engine-report.json';
const PACKAGE_DIR = '.repoos/launch/packages';

const STAGES = [
  'planning',
  'integration_readiness',
  'documentation_preparation',
  'public_announcement',
  'post_launch_monitoring'
];

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJSON(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

async function writeJSON(filePath, data) {
  const normalized = JSON.stringify(data, null, 2) + '\n';
  await fs.writeFile(filePath, normalized, 'utf-8');
}

function usage() {
  console.log('Usage: node scripts/repoos/launch-engine.mjs <command> [args]');
  console.log('Commands:');
  console.log('  list');
  console.log('  create <launch_id>');
  console.log('  status <launch_id>');
  console.log('  build <launch_id>');
  console.log('  report');
}

function findLaunch(registry, launchId) {
  return registry.launches.find(launch => launch.launch_id === launchId);
}

function calculateMetricDelta(baseline, current) {
  if (baseline === 0) {
    return 0;
  }
  return Number((((current - baseline) / baseline) * 100).toFixed(2));
}

function buildLaunchPackage(launch) {
  return {
    schema_version: '1.0',
    launch_id: launch.launch_id,
    title: launch.title,
    package_assets: {
      plugin_releases: launch.components.plugin_launches,
      integration_demos: launch.components.partner_integrations,
      documentation_updates: [
        'developer-portal-release-notes',
        'integration-quickstart-guides',
        'marketplace-listing-refresh'
      ],
      demo_gallery_updates: [
        'launch-scenario-overview',
        'partner-integration-walkthrough',
        'plugin-value-showcase'
      ]
    }
  };
}

async function commandList() {
  const registry = await readJSON(REGISTRY_PATH);
  for (const launch of registry.launches) {
    console.log(`${launch.launch_id}\t${launch.stage}\t${launch.status}\t${launch.target_window}`);
  }
}

async function commandCreate(launchId) {
  if (!launchId) {
    throw new Error('launch_id is required for create command');
  }

  const registry = await readJSON(REGISTRY_PATH);
  const existing = findLaunch(registry, launchId);
  if (existing) {
    console.log(`Launch ${launchId} already exists.`);
    return;
  }

  const entry = {
    launch_id: launchId,
    title: `Summit Ecosystem Launch ${launchId}`,
    status: 'planning',
    stage: 'planning',
    target_window: 'unassigned',
    owners: ['ecosystem-platform'],
    components: {
      plugin_launches: [],
      partner_integrations: [],
      ecosystem_announcements: []
    },
    artifacts: {
      timeline: TIMELINE_PATH,
      metrics: METRICS_PATH,
      package: `${PACKAGE_DIR}/${launchId}-package.json`
    }
  };

  registry.launches.push(entry);
  registry.launches.sort((a, b) => a.launch_id.localeCompare(b.launch_id));
  await writeJSON(REGISTRY_PATH, registry);
  console.log(`Created launch ${launchId}`);
}

async function commandStatus(launchId) {
  if (!launchId) {
    throw new Error('launch_id is required for status command');
  }

  const [registry, timeline] = await Promise.all([readJSON(REGISTRY_PATH), readJSON(TIMELINE_PATH)]);
  const launch = findLaunch(registry, launchId);

  if (!launch) {
    throw new Error(`Launch ${launchId} not found`);
  }

  const stageOrder = STAGES.indexOf(launch.stage);
  const readiness = timeline.stages.map(stage => ({
    stage: stage.name,
    complete: STAGES.indexOf(stage.name) <= stageOrder
  }));

  const status = {
    launch_id: launch.launch_id,
    title: launch.title,
    stage: launch.stage,
    status: launch.status,
    readiness
  };

  console.log(JSON.stringify(status, null, 2));
}

async function commandBuild(launchId) {
  if (!launchId) {
    throw new Error('launch_id is required for build command');
  }

  const registry = await readJSON(REGISTRY_PATH);
  const launch = findLaunch(registry, launchId);

  if (!launch) {
    throw new Error(`Launch ${launchId} not found`);
  }

  await ensureDir(PACKAGE_DIR);
  const launchPackage = buildLaunchPackage(launch);
  const outPath = path.join(PACKAGE_DIR, `${launchId}-package.json`);
  await writeJSON(outPath, launchPackage);

  console.log(`Launch package generated at ${outPath}`);
}

async function commandReport() {
  const [registry, metrics] = await Promise.all([readJSON(REGISTRY_PATH), readJSON(METRICS_PATH)]);
  const launches = registry.launches;

  const metricSummary = {
    plugin_installs_delta_percent: calculateMetricDelta(
      metrics.metrics.plugin_installs.baseline,
      metrics.metrics.plugin_installs.current
    ),
    api_traffic_delta_percent: calculateMetricDelta(
      metrics.metrics.api_traffic_increase.baseline_rps,
      metrics.metrics.api_traffic_increase.current_rps
    ),
    developer_signups_delta_percent: calculateMetricDelta(
      metrics.metrics.developer_signups.baseline_weekly,
      metrics.metrics.developer_signups.current_weekly
    ),
    marketplace_activity_delta_percent: calculateMetricDelta(
      metrics.metrics.marketplace_activity.baseline_transactions,
      metrics.metrics.marketplace_activity.current_transactions
    )
  };

  const stageDistribution = STAGES.reduce((acc, stage) => {
    acc[stage] = launches.filter(launch => launch.stage === stage).length;
    return acc;
  }, {});

  const report = {
    schema_version: '1.0',
    engine: 'summit-ecosystem-launch-engine',
    launch_summary: {
      total_launches: launches.length,
      stage_distribution: stageDistribution,
      launch_ids: launches.map(launch => launch.launch_id).sort()
    },
    metrics_summary: metricSummary
  };

  await writeJSON(EVIDENCE_PATH, report);
  console.log(`Evidence report written to ${EVIDENCE_PATH}`);
}

async function main() {
  const [, , command, argument] = process.argv;

  switch (command) {
    case 'list':
      await commandList();
      break;
    case 'create':
      await commandCreate(argument);
      break;
    case 'status':
      await commandStatus(argument);
      break;
    case 'build':
      await commandBuild(argument);
      break;
    case 'report':
      await commandReport();
      break;
    default:
      usage();
      process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
