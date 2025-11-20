#!/usr/bin/env ts-node
/**
 * @ip-family: N/A (tooling)
 * IP Metrics Script
 *
 * Analyzes IP family coverage and implementation status across the codebase.
 *
 * Usage:
 *   pnpm run ip:metrics
 *   pnpm run ip:metrics --format=json
 *   pnpm run ip:metrics --family=F1
 *
 * Output:
 *   - Per-family coverage stats (modules annotated vs. listed)
 *   - Global coverage summary
 *   - Suggestions for missing annotations
 *   - Optional: JSON export for CI/dashboards
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { glob } from 'glob';

// ============================================================================
// Types
// ============================================================================

interface IPFamily {
  family_id: string;
  name: string;
  summary: string;
  status: 'idea' | 'partial' | 'mvp' | 'v1' | 'v2+';
  owner: string;
  modules: string[];
  capabilities: string[];
  horizons: {
    h0_hardening: string[];
    h1_mvp: string[];
    h2_v1: string[];
    h3_moonshot: string[];
  };
  risks: string[];
  dependencies: string[];
  tags: string[];
}

interface IPRegistry {
  families: IPFamily[];
}

interface ModuleAnnotation {
  filePath: string;
  familyIds: string[];
  line: number;
}

interface FamilyMetrics {
  family_id: string;
  name: string;
  status: string;
  modules_listed: number;
  modules_found: number;
  annotations_found: number;
  coverage_pct: number;
  missing_modules: string[];
  annotated_files: string[];
}

interface GlobalMetrics {
  total_families: number;
  status_breakdown: Record<string, number>;
  avg_coverage_pct: number;
  families_below_50pct: number;
  total_annotations: number;
}

// ============================================================================
// Configuration
// ============================================================================

const REPO_ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(REPO_ROOT, 'docs/ip/ip-registry.yaml');
const IP_META_GLOB = '**/ip.meta.json';
const CODE_GLOB = '**/*.{ts,tsx,js,jsx}';
const ANNOTATION_PATTERN = /@ip-family:\s*([A-Z0-9,]+)/;

// Directories to exclude from scanning (performance optimization)
const EXCLUDE_DIRS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.next/**',
  '**/coverage/**',
  '**/.jest-cache-*/**',
];

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = parseArgs();

  console.log('📊 IP Metrics Report');
  console.log('='.repeat(80));
  console.log();

  // Load registry
  const registry = loadRegistry();
  console.log(`✅ Loaded ${registry.families.length} IP families from registry`);
  console.log();

  // Scan codebase for annotations
  const annotations = await scanForAnnotations();
  console.log(`✅ Found ${annotations.length} @ip-family annotations in codebase`);
  console.log();

  // Scan for ip.meta.json files
  const metaFiles = await scanForMetaFiles();
  console.log(`✅ Found ${metaFiles.length} ip.meta.json files`);
  console.log();

  // Calculate metrics
  const familyMetrics = calculateFamilyMetrics(registry, annotations, metaFiles);
  const globalMetrics = calculateGlobalMetrics(familyMetrics);

  // Output results
  if (args.format === 'json') {
    outputJSON({ families: familyMetrics, global: globalMetrics });
  } else {
    outputMarkdown({ families: familyMetrics, global: globalMetrics }, args.family);
  }
}

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs() {
  const args = {
    format: 'markdown' as 'markdown' | 'json',
    family: undefined as string | undefined,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--format=')) {
      args.format = arg.split('=')[1] as 'markdown' | 'json';
    } else if (arg.startsWith('--family=')) {
      args.family = arg.split('=')[1];
    }
  }

  return args;
}

// ============================================================================
// Registry Loading
// ============================================================================

function loadRegistry(): IPRegistry {
  try {
    const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');
    const registry = yaml.parse(content) as IPRegistry;

    if (!registry.families || !Array.isArray(registry.families)) {
      throw new Error('Registry must contain a "families" array');
    }

    return registry;
  } catch (error) {
    console.error(`❌ Failed to load registry from ${REGISTRY_PATH}:`, error);
    process.exit(1);
  }
}

// ============================================================================
// Annotation Scanning
// ============================================================================

async function scanForAnnotations(): Promise<ModuleAnnotation[]> {
  const annotations: ModuleAnnotation[] = [];

  const files = await glob(CODE_GLOB, {
    cwd: REPO_ROOT,
    ignore: EXCLUDE_DIRS,
    absolute: false,
  });

  for (const file of files) {
    const fullPath = path.join(REPO_ROOT, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(ANNOTATION_PATTERN);
      if (match) {
        const familyIds = match[1].split(',').map((id) => id.trim());
        annotations.push({
          filePath: file,
          familyIds,
          line: i + 1,
        });
      }
    }
  }

  return annotations;
}

// ============================================================================
// Meta File Scanning
// ============================================================================

async function scanForMetaFiles(): Promise<Map<string, string[]>> {
  const metaMap = new Map<string, string[]>();

  const files = await glob(IP_META_GLOB, {
    cwd: REPO_ROOT,
    ignore: EXCLUDE_DIRS,
    absolute: false,
  });

  for (const file of files) {
    const fullPath = path.join(REPO_ROOT, file);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const meta = JSON.parse(content);

      if (meta.ip_families && Array.isArray(meta.ip_families)) {
        const dirPath = path.dirname(file);
        metaMap.set(dirPath, meta.ip_families);
      }
    } catch (error) {
      console.warn(`⚠️  Failed to parse ${file}:`, error);
    }
  }

  return metaMap;
}

// ============================================================================
// Metrics Calculation
// ============================================================================

function calculateFamilyMetrics(
  registry: IPRegistry,
  annotations: ModuleAnnotation[],
  metaFiles: Map<string, string[]>
): FamilyMetrics[] {
  const metrics: FamilyMetrics[] = [];

  for (const family of registry.families) {
    const familyId = family.family_id;

    // Find all annotations mentioning this family
    const relevantAnnotations = annotations.filter((ann) =>
      ann.familyIds.includes(familyId)
    );

    // Find all meta files mentioning this family
    const relevantMetaDirs = Array.from(metaFiles.entries())
      .filter(([_, families]) => families.includes(familyId))
      .map(([dir]) => dir);

    // Combine unique file paths
    const annotatedFiles = Array.from(
      new Set([
        ...relevantAnnotations.map((ann) => ann.filePath),
        ...relevantMetaDirs.map((dir) => `${dir}/ip.meta.json`),
      ])
    );

    // Check which listed modules have annotations
    const modulesFound = family.modules.filter((modulePath) => {
      // Normalize module path (remove trailing slashes)
      const normalizedModule = modulePath.replace(/\/$/, '');

      return annotatedFiles.some((file) => {
        const normalizedFile = file.replace(/\\/g, '/');
        return normalizedFile.startsWith(normalizedModule);
      });
    });

    const missingModules = family.modules.filter(
      (mod) => !modulesFound.includes(mod)
    );

    const coveragePct = family.modules.length > 0
      ? Math.round((modulesFound.length / family.modules.length) * 100)
      : 0;

    metrics.push({
      family_id: familyId,
      name: family.name,
      status: family.status,
      modules_listed: family.modules.length,
      modules_found: modulesFound.length,
      annotations_found: relevantAnnotations.length + relevantMetaDirs.length,
      coverage_pct: coveragePct,
      missing_modules: missingModules,
      annotated_files: annotatedFiles,
    });
  }

  return metrics.sort((a, b) => b.coverage_pct - a.coverage_pct);
}

function calculateGlobalMetrics(familyMetrics: FamilyMetrics[]): GlobalMetrics {
  const statusBreakdown: Record<string, number> = {};

  for (const fm of familyMetrics) {
    statusBreakdown[fm.status] = (statusBreakdown[fm.status] || 0) + 1;
  }

  const totalCoverage = familyMetrics.reduce((sum, fm) => sum + fm.coverage_pct, 0);
  const avgCoverage = Math.round(totalCoverage / familyMetrics.length);
  const below50 = familyMetrics.filter((fm) => fm.coverage_pct < 50).length;
  const totalAnnotations = familyMetrics.reduce(
    (sum, fm) => sum + fm.annotations_found,
    0
  );

  return {
    total_families: familyMetrics.length,
    status_breakdown: statusBreakdown,
    avg_coverage_pct: avgCoverage,
    families_below_50pct: below50,
    total_annotations: totalAnnotations,
  };
}

// ============================================================================
// Output
// ============================================================================

function outputMarkdown(
  data: { families: FamilyMetrics[]; global: GlobalMetrics },
  filterFamilyId?: string
) {
  const { families, global } = data;

  // Global stats
  console.log('## Global Metrics');
  console.log();
  console.log(`- **Total IP Families**: ${global.total_families}`);
  console.log(`- **Average Coverage**: ${global.avg_coverage_pct}%`);
  console.log(`- **Families < 50% Coverage**: ${global.families_below_50pct}`);
  console.log(`- **Total Annotations**: ${global.total_annotations}`);
  console.log();

  console.log('### Status Breakdown');
  console.log();
  for (const [status, count] of Object.entries(global.status_breakdown)) {
    console.log(`- **${status}**: ${count}`);
  }
  console.log();

  // Per-family details
  console.log('## Per-Family Metrics');
  console.log();

  const familiesToShow = filterFamilyId
    ? families.filter((f) => f.family_id === filterFamilyId)
    : families;

  if (familiesToShow.length === 0 && filterFamilyId) {
    console.log(`❌ Family ${filterFamilyId} not found in registry`);
    return;
  }

  for (const fm of familiesToShow) {
    const statusEmoji = getStatusEmoji(fm.coverage_pct);
    console.log(`### ${statusEmoji} ${fm.family_id}: ${fm.name}`);
    console.log();
    console.log(`- **Status**: ${fm.status}`);
    console.log(`- **Modules Listed**: ${fm.modules_listed}`);
    console.log(`- **Modules Found**: ${fm.modules_found}`);
    console.log(`- **Annotations Found**: ${fm.annotations_found}`);
    console.log(`- **Coverage**: ${fm.coverage_pct}%`);
    console.log();

    if (fm.missing_modules.length > 0) {
      console.log('**Missing Annotations**:');
      for (const mod of fm.missing_modules) {
        console.log(`  - \`${mod}\``);
      }
      console.log();
    }

    if (fm.annotated_files.length > 0 && fm.annotated_files.length <= 10) {
      console.log('**Annotated Files**:');
      for (const file of fm.annotated_files.slice(0, 10)) {
        console.log(`  - \`${file}\``);
      }
      if (fm.annotated_files.length > 10) {
        console.log(`  - ... and ${fm.annotated_files.length - 10} more`);
      }
      console.log();
    }
  }

  // Recommendations
  if (!filterFamilyId) {
    console.log('## Recommendations');
    console.log();

    const below50Families = families.filter((f) => f.coverage_pct < 50);
    if (below50Families.length > 0) {
      console.log('### Families Needing Attention (< 50% Coverage)');
      console.log();
      for (const fm of below50Families) {
        console.log(`- **${fm.family_id}** (${fm.coverage_pct}%): Add annotations to:`);
        for (const mod of fm.missing_modules.slice(0, 3)) {
          console.log(`    - \`${mod}\``);
        }
      }
      console.log();
    } else {
      console.log('✅ All families have ≥ 50% coverage. Great work!');
      console.log();
    }
  }
}

function outputJSON(data: { families: FamilyMetrics[]; global: GlobalMetrics }) {
  console.log(JSON.stringify(data, null, 2));
}

function getStatusEmoji(coveragePct: number): string {
  if (coveragePct >= 80) return '✅';
  if (coveragePct >= 50) return '⚠️';
  return '❌';
}

// ============================================================================
// Entry Point
// ============================================================================

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
