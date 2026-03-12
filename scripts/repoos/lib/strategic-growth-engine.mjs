import fs from 'fs/promises';
import path from 'path';

const SIGNAL_SOURCES = [
  { key: 'ecosystem', dir: '.repoos/ecosystem' },
  { key: 'economics', dir: '.repoos/economics' },
  { key: 'developers', dir: '.repoos/developers' },
  { key: 'partners', dir: '.repoos/partners' },
  { key: 'events', dir: '.repoos/events' }
];

const GROWTH_DIR = '.repoos/growth';
const EVIDENCE_PATH = '.repoos/evidence/strategic-growth-report.json';

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

async function ensureDir(directory) {
  await fs.mkdir(directory, { recursive: true });
}

async function readJsonFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function listJsonFiles(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          return listJsonFiles(fullPath);
        }
        return entry.name.endsWith('.json') ? [fullPath] : [];
      })
    );

    return files.flat().sort();
  } catch {
    return [];
  }
}

function normalizeSignal(source, filePath, payload) {
  if (Array.isArray(payload)) {
    return payload.map((entry, index) => ({
      source,
      file: filePath,
      index,
      ...entry
    }));
  }

  return [{ source, file: filePath, ...payload }];
}

export async function aggregateStrategicSignals() {
  const summaryBySource = {};
  const signals = [];

  for (const source of SIGNAL_SOURCES) {
    const files = await listJsonFiles(source.dir);
    summaryBySource[source.key] = { files: files.length, records: 0 };

    for (const file of files) {
      const payload = await readJsonFile(file);
      const normalized = normalizeSignal(source.key, file, payload);
      summaryBySource[source.key].records += normalized.length;
      signals.push(...normalized);
    }
  }

  const strategicSignals = {
    source_index: SIGNAL_SOURCES.map(({ key, dir }) => ({ key, dir })),
    source_summary: summaryBySource,
    records: signals
      .map((signal) => ({
        source: signal.source,
        signal_type: signal.signal_type ?? signal.type ?? 'unspecified',
        category: signal.category ?? signal.segment ?? 'general',
        demand_score: Number(signal.demand_score ?? signal.score ?? 0),
        growth_score: Number(signal.growth_score ?? signal.momentum ?? 0),
        geography: signal.geography ?? signal.region ?? 'global',
        technology: signal.technology ?? signal.stack ?? 'platform-core',
        partner_vertical: signal.partner_vertical ?? signal.vertical ?? 'none'
      }))
      .sort((a, b) => {
        return (
          a.source.localeCompare(b.source) ||
          a.signal_type.localeCompare(b.signal_type) ||
          a.category.localeCompare(b.category) ||
          a.geography.localeCompare(b.geography) ||
          a.technology.localeCompare(b.technology)
        );
      })
  };

  return strategicSignals;
}

function groupTop(records, key, minScore = 0.6) {
  const scoreMap = new Map();

  for (const record of records) {
    const value = record[key];
    if (!value || value === 'none' || value === 'general') {
      continue;
    }

    const weightedScore = record.demand_score * 0.65 + record.growth_score * 0.35;
    scoreMap.set(value, (scoreMap.get(value) ?? 0) + weightedScore);
  }

  return [...scoreMap.entries()]
    .filter(([, score]) => score >= minScore)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, score]) => ({ name, score: Number(score.toFixed(3)) }));
}

export function detectExpansionOpportunities(signals) {
  const records = signals.records;

  const newPluginCategories = groupTop(records, 'category', 0.8);
  const highDemandIntegrations = groupTop(records, 'technology', 0.9);
  const geographicClusters = groupTop(records, 'geography', 0.7);
  const emergingTechEcosystems = groupTop(records, 'technology', 1.2)
    .filter((entry) => entry.name !== 'platform-core');

  return {
    totals: {
      expansion_opportunities:
        newPluginCategories.length +
        highDemandIntegrations.length +
        geographicClusters.length +
        emergingTechEcosystems.length,
      plugin_categories: newPluginCategories.length,
      partner_verticals: groupTop(records, 'partner_vertical', 0.7).length
    },
    opportunities: {
      new_plugin_categories: newPluginCategories,
      high_demand_integrations: highDemandIntegrations,
      geographic_developer_clusters: geographicClusters,
      emerging_technology_ecosystems: emergingTechEcosystems
    }
  };
}

export function buildExpansionModels(opportunities) {
  return {
    marketplace_verticals: opportunities.opportunities.new_plugin_categories.map((entry) => ({
      vertical: `${entry.name}-marketplace`,
      rationale_score: entry.score,
      investment_priority: entry.score >= 2 ? 'high' : 'medium'
    })),
    enterprise_partner_programs: opportunities.opportunities.high_demand_integrations.map((entry) => ({
      program: `${entry.name}-alliance-program`,
      demand_signal_score: entry.score,
      execution_mode: entry.score >= 2 ? 'accelerated' : 'standard'
    })),
    regional_developer_programs: opportunities.opportunities.geographic_developer_clusters.map(
      (entry) => ({
        region: entry.name,
        operating_model: entry.score >= 1.5 ? 'hub-and-spoke' : 'community-seed',
        capacity_score: entry.score
      })
    )
  };
}

export function createStrategicRoadmap(opportunities, expansionModels) {
  return {
    goals_12_month: [
      {
        goal: 'Launch prioritized plugin categories',
        target_count: Math.max(2, opportunities.opportunities.new_plugin_categories.length),
        milestone: 'Q2-Q4'
      },
      {
        goal: 'Activate partner vertical alliances',
        target_count: Math.max(2, expansionModels.enterprise_partner_programs.length),
        milestone: 'Q2-Q3'
      },
      {
        goal: 'Stand up regional developer programs',
        target_count: Math.max(2, expansionModels.regional_developer_programs.length),
        milestone: 'Q1-Q4'
      }
    ],
    new_partner_initiatives: expansionModels.enterprise_partner_programs,
    platform_feature_investments: opportunities.opportunities.emerging_technology_ecosystems.map((entry) => ({
      theme: entry.name,
      investment_type: 'platform-capability',
      priority: entry.score >= 2 ? 'high' : 'medium'
    }))
  };
}

export function buildDeterministicEvidence(signals, opportunities, roadmap) {
  return {
    report: 'strategic-growth',
    deterministic: true,
    growth_summary: {
      signal_records: signals.records.length,
      expansion_opportunities: opportunities.totals.expansion_opportunities,
      plugin_categories: opportunities.totals.plugin_categories,
      partner_verticals: opportunities.totals.partner_verticals,
      roadmap_goals: roadmap.goals_12_month.length
    },
    controls: {
      timestamps_included: false,
      sorted_output: true,
      source_count: SIGNAL_SOURCES.length
    }
  };
}

async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${stableStringify(data)}\n`, 'utf-8');
}

export async function runStrategicGrowthEngine() {
  await ensureDir(GROWTH_DIR);

  const strategicSignals = await aggregateStrategicSignals();
  const expansionOpportunities = detectExpansionOpportunities(strategicSignals);
  const expansionModels = buildExpansionModels(expansionOpportunities);
  const strategicRoadmap = createStrategicRoadmap(expansionOpportunities, expansionModels);
  const evidenceReport = buildDeterministicEvidence(
    strategicSignals,
    expansionOpportunities,
    strategicRoadmap
  );

  await writeJson(path.join(GROWTH_DIR, 'strategic-signals.json'), strategicSignals);
  await writeJson(
    path.join(GROWTH_DIR, 'expansion-opportunities.json'),
    expansionOpportunities
  );
  await writeJson(path.join(GROWTH_DIR, 'expansion-models.json'), expansionModels);
  await writeJson(path.join(GROWTH_DIR, 'strategic-roadmap.json'), strategicRoadmap);
  await writeJson(EVIDENCE_PATH, evidenceReport);

  return {
    strategicSignals,
    expansionOpportunities,
    expansionModels,
    strategicRoadmap,
    evidenceReport
  };
}
