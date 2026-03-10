#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const REPO_ROOT = process.cwd();
const SOURCES = [
  { type: 'plugin', dir: '.repoos/marketplace' },
  { type: 'developer', dir: '.repoos/developers' },
  { type: 'partner', dir: '.repoos/partners' },
  { type: 'integration', dir: '.repoos/integrations' },
  { type: 'event', dir: '.repoos/events' },
];

const INDEX_DIR = '.repoos/index';
const EVIDENCE_PATH = '.repoos/evidence/platform-index-report.json';

const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Summit Platform Index Schema',
  type: 'object',
  required: ['id', 'name', 'type'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    type: { enum: ['plugin', 'developer', 'partner', 'integration', 'event'] },
    category: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    expertise: { type: 'array', items: { type: 'string' } },
    platforms: { type: 'array', items: { type: 'string' } },
    platform: { type: 'string' },
  },
  additionalProperties: true,
};

function stableSortById(items) {
  return [...items].sort((a, b) => {
    const aKey = `${a.type}:${a.id}`;
    const bKey = `${b.type}:${b.id}`;
    return aKey.localeCompare(bKey);
  });
}

async function safeReadJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function collectAssets() {
  const assets = [];

  for (const source of SOURCES) {
    const sourceDir = path.join(REPO_ROOT, source.dir);
    let entries = [];

    try {
      entries = await fs.readdir(sourceDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) {
        continue;
      }

      const filePath = path.join(sourceDir, entry.name);
      const parsed = await safeReadJson(filePath);
      const normalized = {
        ...parsed,
        id: parsed.id ?? `${source.type}-${entry.name.replace('.json', '')}`,
        name: parsed.name ?? entry.name.replace('.json', ''),
        type: parsed.type ?? source.type,
        _source: path.posix.join(source.dir, entry.name),
      };
      assets.push(normalized);
    }
  }

  return stableSortById(assets);
}

function buildSearchIndex(assets) {
  const byType = Object.fromEntries(
    ['plugin', 'developer', 'partner', 'integration', 'event'].map((type) => [
      type,
      assets.filter((asset) => asset.type === type).map((asset) => asset.id),
    ]),
  );

  const pluginsByCategory = {};
  const developersByExpertise = {};
  const partnerIntegrationsByPlatform = {};

  for (const asset of assets) {
    if (asset.type === 'plugin' && asset.category) {
      pluginsByCategory[asset.category] ??= [];
      pluginsByCategory[asset.category].push(asset.id);
    }

    if (asset.type === 'developer') {
      for (const skill of asset.expertise ?? []) {
        developersByExpertise[skill] ??= [];
        developersByExpertise[skill].push(asset.id);
      }
    }

    if (asset.type === 'integration') {
      const platform = asset.platform ?? 'unknown';
      partnerIntegrationsByPlatform[platform] ??= [];
      partnerIntegrationsByPlatform[platform].push(asset.id);
    }
  }

  for (const map of [pluginsByCategory, developersByExpertise, partnerIntegrationsByPlatform]) {
    for (const key of Object.keys(map)) {
      map[key] = [...map[key]].sort();
    }
  }

  const queryExamples = {
    pluginsByCategory,
    developersByExpertise,
    partnerIntegrationsByPlatform,
  };

  return {
    version: '1.0.0',
    byType,
    queryExamples,
    records: assets,
  };
}

async function writeJson(filePath, payload) {
  const absolute = path.join(REPO_ROOT, filePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  const assets = await collectAssets();
  const index = buildSearchIndex(assets);

  const ecosystemAssets = {
    schemaVersion: '1.0.0',
    assetCount: assets.length,
    assets,
  };

  const report = {
    deterministic: true,
    summary: {
      totalAssets: assets.length,
      plugins: index.byType.plugin.length,
      developers: index.byType.developer.length,
      partners: index.byType.partner.length,
      integrations: index.byType.integration.length,
      events: index.byType.event.length,
    },
    checks: [
      'sorted-by-type-and-id',
      'timestamp-free-output',
      'source-path-captured',
    ],
  };

  await fs.mkdir(path.join(REPO_ROOT, INDEX_DIR), { recursive: true });
  await writeJson('.repoos/index/index-schema.json', schema);
  await writeJson('.repoos/index/ecosystem-assets.json', ecosystemAssets);
  await writeJson('.repoos/index/platform-index.json', index);
  await writeJson(EVIDENCE_PATH, report);

  console.log(`Platform index rebuilt with ${assets.length} assets.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
