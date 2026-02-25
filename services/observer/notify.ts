import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export interface SummitEvent {
  event_type: string;
  build_id: string;
  commit_sha: string;
  timestamp: string;
  evidence_ref?: string;
  payload?: Record<string, unknown>;
}

function assertRequiredString(value: string | undefined, field: string): void {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required observer event field: ${field}`);
  }
}

export async function notifyObserver(event: SummitEvent): Promise<void> {
  assertRequiredString(event.event_type, 'event_type');
  assertRequiredString(event.build_id, 'build_id');
  assertRequiredString(event.commit_sha, 'commit_sha');
  assertRequiredString(event.timestamp, 'timestamp');

  // TODO: Send event to Slack webhook for human visibility.
  // TODO: Ingest event into IntelGraph for graph-native observability.
  // TODO: Write structured record to the platform audit log service.
  const logPath = resolve('artifacts/summit-golden-path/observer-notify.log');
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, `${JSON.stringify(event)}\n`, 'utf8');
}

function parseEventFileArg(argv: string[]): string | undefined {
  const idx = argv.indexOf('--event-file');
  if (idx === -1 || !argv[idx + 1]) {
    return undefined;
  }
  return argv[idx + 1];
}

async function runAsCli(): Promise<void> {
  const eventFile = parseEventFileArg(process.argv.slice(2));
  const event: SummitEvent = eventFile
    ? JSON.parse(readFileSync(eventFile, 'utf8'))
    : {
        event_type: 'ga.golden_path.completed',
        build_id: process.env.GITHUB_RUN_ID ?? 'local-run',
        commit_sha: process.env.GITHUB_SHA ?? 'local-sha',
        timestamp: new Date().toISOString(),
      };

  await notifyObserver(event);
  console.log('Observer notified (stub).');
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runAsCli().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
