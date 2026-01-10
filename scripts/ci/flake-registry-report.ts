import fs from 'node:fs';
import path from 'node:path';
import { loadFlakeRegistry, parseDate, daysBetween, FlakeEntry } from './lib/flake-registry';

type EncounterRecord = {
  id: string;
  scope: string;
  target: string;
  occurred_at: string;
};

type Options = {
  registryPath: string;
  encountersPath?: string;
  outPath?: string;
  windowDays: number;
};

const DEFAULT_REGISTRY = path.join('.github', 'flake-registry.yml');

function parseArgs(): Options {
  const args = process.argv.slice(2);
  let registryPath = DEFAULT_REGISTRY;
  let encountersPath: string | undefined;
  let outPath: string | undefined;
  let windowDays = 7;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--registry') {
      registryPath = args[i + 1];
      i += 1;
    } else if (arg === '--encounters') {
      encountersPath = args[i + 1];
      i += 1;
    } else if (arg === '--out') {
      outPath = args[i + 1];
      i += 1;
    } else if (arg === '--window-days') {
      windowDays = Number.parseInt(args[i + 1] ?? '', 10);
      i += 1;
    }
  }

  return { registryPath, encountersPath, outPath, windowDays };
}

function readEncounters(encountersPath?: string): EncounterRecord[] {
  if (!encountersPath) {
    return [];
  }
  const absolutePath = path.resolve(encountersPath);
  if (!fs.existsSync(absolutePath)) {
    return [];
  }
  const lines = fs.readFileSync(absolutePath, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.map((line) => JSON.parse(line) as EncounterRecord);
}

function buildActiveList(flakes: FlakeEntry[], today: Date): FlakeEntry[] {
  return flakes.filter((entry) => parseDate(entry.expires) >= today);
}

function main(): void {
  const { registryPath, encountersPath, outPath, windowDays } = parseArgs();
  const registry = loadFlakeRegistry(registryPath);
  const encounters = readEncounters(encountersPath);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);

  const activeFlakes = buildActiveList(registry.flakes, today);
  const expiringSoon = activeFlakes.filter((entry) => {
    const expires = parseDate(entry.expires);
    return expires >= today && expires <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  });

  const encounteredRecent = encounters.filter((entry) => {
    const occurred = new Date(entry.occurred_at);
    return occurred >= cutoff;
  });

  const encounterCounts = encounteredRecent.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.id] = (acc[entry.id] ?? 0) + 1;
    return acc;
  }, {});

  const longestLived = [...activeFlakes]
    .map((entry) => ({
      id: entry.id,
      owner: entry.owner,
      created: entry.created,
      expires: entry.expires,
      age_days: daysBetween(parseDate(entry.created), today),
    }))
    .sort((a, b) => b.age_days - a.age_days)
    .slice(0, 5);

  const report = {
    generated_at: new Date().toISOString(),
    active_total: activeFlakes.length,
    expiring_soon_total: expiringSoon.length,
    expiring_soon: expiringSoon.map((entry) => ({
      id: entry.id,
      target: entry.target,
      owner: entry.owner,
      expires: entry.expires,
    })),
    encountered_last_window_total: encounteredRecent.length,
    encountered_last_window: encounterCounts,
    longest_lived: longestLived,
  };

  if (outPath) {
    const absolutePath = path.resolve(outPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));
}

main();
