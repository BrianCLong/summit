import fs from 'fs/promises';
import path from 'path';
import { runPlatformWatch } from '../../src/connectors/platform-watch/pipeline';
import { writeArtifacts } from '../../src/connectors/platform-watch/writeArtifacts';
import { PLATFORM_SOURCES } from '../../src/connectors/platform-watch/sources';
import { SourceDocument, SourceSpec, ClaimItem } from '../../src/connectors/platform-watch/types';

interface CliOptions {
  date: string;
  outputDir: string;
  fixturesDir?: string;
  claimsPath?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const args = new Map<string, string>();
  for (const arg of argv) {
    const [key, value] = arg.split('=');
    if (key.startsWith('--')) {
      args.set(key.slice(2), value ?? '');
    }
  }

  const date = args.get('date');
  if (!date) {
    throw new Error('Missing --date=YYYY-MM-DD');
  }

  return {
    date,
    outputDir: args.get('output') ?? path.join(process.cwd(), 'artifacts', 'platform-watch'),
    fixturesDir: args.get('fixtures'),
    claimsPath: args.get('claims'),
  };
}

async function loadClaims(claimsPath?: string): Promise<ClaimItem[]> {
  if (!claimsPath) return [];
  const data = await fs.readFile(claimsPath, 'utf8');
  return JSON.parse(data) as ClaimItem[];
}

async function fixtureFetcher(fixturesDir: string, source: SourceSpec): Promise<SourceDocument> {
  const base = path.resolve(process.cwd(), fixturesDir);
  const htmlPath = path.join(base, `${source.id}.html`);
  const textPath = path.join(base, `${source.id}.txt`);

  let raw: string;
  try {
    raw = await fs.readFile(htmlPath, 'utf8');
  } catch {
    raw = await fs.readFile(textPath, 'utf8');
  }

  return {
    source,
    fetched_at: '1970-01-01T00:00:00.000Z',
    content_type: 'text/html',
    raw,
  };
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const claims = await loadClaims(options.claimsPath);
  const fetcher = options.fixturesDir
    ? (source: SourceSpec) => fixtureFetcher(options.fixturesDir as string, source)
    : undefined;

  const { report, metrics, stamp, kg } = await runPlatformWatch({
    date: options.date,
    sources: PLATFORM_SOURCES,
    claims,
    fetcher,
  });

  await writeArtifacts(options.outputDir, options.date, { report, metrics, stamp, kg });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
