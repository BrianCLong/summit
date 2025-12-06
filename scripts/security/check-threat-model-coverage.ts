import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

interface FeatureConfig {
  name: string;
  modelPath: string;
  owner: string;
  staleAfterDays: number;
  paths: string[];
}

interface CoverageResult {
  feature: string;
  modelPath: string;
  owner: string;
  status: 'present' | 'stale' | 'missing';
  lastUpdated?: string;
  staleAfterDays: number;
  reason?: string;
}

interface Args {
  base: string;
  head?: string;
  format: 'text' | 'json';
  outputFile?: string;
}

const DEFAULT_STALE_DAYS = 90;

const featureConfigs: FeatureConfig[] = [
  {
    name: 'Authentication & Identity',
    modelPath: 'docs/security/threat-models/auth.md',
    owner: 'Identity & Security Engineering',
    staleAfterDays: DEFAULT_STALE_DAYS,
    paths: [
      'services/authz-gateway',
      'services/authz_svc',
      'services/authenticity-service',
      'packages/authentication',
      'packages/authz-core',
      'packages/authority-compiler',
      'src/auth',
      'idp',
      'server/src/auth'
    ]
  },
  {
    name: 'IntelGraph Queries',
    modelPath: 'docs/security/threat-models/intelgraph-queries.md',
    owner: 'Graph Platform & Security Engineering',
    staleAfterDays: DEFAULT_STALE_DAYS,
    paths: [
      'intelgraph',
      'packages/graphai',
      'packages/graph-analytics',
      'packages/graph-query',
      'packages/knowledge-graph',
      'packages/graph-service',
      'graph-service',
      'graph_xai',
      'ga-graphai'
    ]
  },
  {
    name: 'Maestro Automation Runs',
    modelPath: 'docs/security/threat-models/maestro-runs.md',
    owner: 'Automation Platform & Security Engineering',
    staleAfterDays: DEFAULT_STALE_DAYS,
    paths: [
      'packages/maestro',
      'packages/maestroflow',
      'packages/maestro-core',
      'packages/maestro-cli',
      'client/src/maestro',
      'deploy/maestro',
      'charts/maestro',
      'charts/intelgraph-maestro',
      '.disabled/maestro-mcp.disabled'
    ]
  }
];

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let base = 'origin/main';
  let head: string | undefined;
  let format: 'text' | 'json' = 'text';
  let outputFile: string | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const current = args[i];
    if (current === '--base' && args[i + 1]) {
      base = args[i + 1];
      i += 1;
    } else if (current === '--head' && args[i + 1]) {
      head = args[i + 1];
      i += 1;
    } else if (current === '--format' && args[i + 1]) {
      const next = args[i + 1];
      if (next === 'json' || next === 'text') {
        format = next;
      }
      i += 1;
    } else if (current === '--output-file' && args[i + 1]) {
      outputFile = args[i + 1];
      i += 1;
    }
  }

  return { base, head, format, outputFile };
}

function getChangedFiles(base: string, head?: string): string[] {
  const range = head ? `${base}...${head}` : `${base}...HEAD`;
  try {
    const output = execSync(`git diff --name-only ${range}`, { encoding: 'utf8' });
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((file) => file.replace(/\\/g, '/'));
  } catch (error) {
    console.warn(`Unable to diff against ${range}; falling back to HEAD~1...HEAD.`);
    const fallback = execSync('git diff --name-only HEAD~1...HEAD', { encoding: 'utf8' });
    return fallback
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((file) => file.replace(/\\/g, '/'));
  }
}

function parseLastUpdated(filePath: string): string | undefined {
  const content = readFileSync(filePath, 'utf8');
  const match = content.match(/Last updated:\s*(\d{4}-\d{2}-\d{2})/i);
  return match ? match[1] : undefined;
}

function daysBetween(dateString: string, now: Date): number {
  const target = new Date(dateString);
  const diffMs = now.getTime() - target.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function evaluateCoverage(changedFiles: string[], now: Date): CoverageResult[] {
  return featureConfigs
    .filter((feature) => changedFiles.some((file) => feature.paths.some((prefix) => file.startsWith(prefix))))
    .map((feature) => {
      if (!existsSync(feature.modelPath)) {
        return {
          feature: feature.name,
          modelPath: feature.modelPath,
          owner: feature.owner,
          status: 'missing',
          staleAfterDays: feature.staleAfterDays,
          reason: 'Threat model file not found'
        } satisfies CoverageResult;
      }

      const lastUpdated = parseLastUpdated(feature.modelPath);
      if (!lastUpdated) {
        return {
          feature: feature.name,
          modelPath: feature.modelPath,
          owner: feature.owner,
          status: 'missing',
          staleAfterDays: feature.staleAfterDays,
          reason: 'Missing "Last updated" metadata'
        } satisfies CoverageResult;
      }

      const ageDays = daysBetween(lastUpdated, now);
      if (ageDays > feature.staleAfterDays) {
        return {
          feature: feature.name,
          modelPath: feature.modelPath,
          owner: feature.owner,
          status: 'stale',
          lastUpdated,
          staleAfterDays: feature.staleAfterDays,
          reason: `Last updated ${ageDays} days ago`
        } satisfies CoverageResult;
      }

      return {
        feature: feature.name,
        modelPath: feature.modelPath,
        owner: feature.owner,
        status: 'present',
        lastUpdated,
        staleAfterDays: feature.staleAfterDays
      } satisfies CoverageResult;
    });
}

function outputResults(results: CoverageResult[], format: 'text' | 'json', outputFile?: string) {
  if (format === 'json') {
    const payload = { generatedAt: new Date().toISOString(), results };
    const json = JSON.stringify(payload, null, 2);
    if (outputFile) {
      writeFileSync(outputFile, json, 'utf8');
    } else {
      console.log(json);
    }
    return;
  }

  if (!results.length) {
    console.log('No mapped high-risk features touched; threat model coverage check skipped.');
    return;
  }

  results.forEach((result) => {
    const statusLabel = result.status === 'present' ? 'present' : result.status === 'stale' ? 'stale' : 'missing';
    const freshness = result.lastUpdated ? `Last updated: ${result.lastUpdated}` : 'Last updated: unknown';
    const reason = result.reason ? ` - ${result.reason}` : '';
    console.log(`Feature: ${result.feature} -> ${statusLabel}. ${freshness}.${reason}`);
  });
}

function main() {
  const args = parseArgs();
  const now = new Date();
  const changedFiles = getChangedFiles(args.base, args.head);
  const results = evaluateCoverage(changedFiles, now);
  outputResults(results, args.format, args.outputFile);
}

main();
