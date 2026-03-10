#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const platformUpdatesFile = resolve(ROOT, '.repoos/public/platform-updates.json');
const progressFeedFile = resolve(ROOT, '.repoos/public/progress-feed.json');
const growthMetricsFile = resolve(ROOT, '.repoos/public/growth-metrics.json');
const integrationMetricsFile = resolve(ROOT, '.repoos/integrations/integration-metrics.json');

async function readJson(path) {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function isoWeek(date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function main() {
  const now = new Date();

  const platform = await readJson(platformUpdatesFile);
  const feed = await readJson(progressFeedFile);
  const growth = await readJson(growthMetricsFile);
  const integration = await readJson(integrationMetricsFile);

  platform.reporting_period = isoWeek(now);
  platform.updated_at = now.toISOString();

  const totalInstalls = integration.metrics.installations;
  growth.integration_installs = totalInstalls;
  growth.updated_at = now.toISOString();

  const feedEntry = {
    timestamp: now.toISOString(),
    message: `Weekly update generated for ${platform.reporting_period}`,
    stats: {
      active_contributors: platform.developer_activity.active_contributors,
      integration_installs: growth.integration_installs,
      plugin_creation: growth.plugin_creation
    }
  };

  feed.feed = [feedEntry, ...(feed.feed || [])].slice(0, 50);
  feed.updated_at = now.toISOString();

  await Promise.all([
    writeJson(platformUpdatesFile, platform),
    writeJson(progressFeedFile, feed),
    writeJson(growthMetricsFile, growth)
  ]);

  process.stdout.write(
    `${JSON.stringify({ status: 'ok', reporting_period: platform.reporting_period }, null, 2)}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
