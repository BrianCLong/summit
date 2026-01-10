import fs from 'node:fs';
import path from 'node:path';
import { loadFlakeRegistry, parseDate, daysBetween, FlakeEntry } from './lib/flake-registry';

type Options = {
  registryPath: string;
  outPath: string;
  reportPath: string;
  windowDays: number;
};

function parseArgs(): Options {
  const args = process.argv.slice(2);
  let registryPath = path.join('.github', 'flake-registry.yml');
  let outPath = path.join('artifacts', 'flake', 'flake-debt.md');
  let reportPath = path.join('artifacts', 'flake', 'flake-debt.json');
  let windowDays = 7;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--registry') {
      registryPath = args[i + 1];
      i += 1;
    } else if (arg === '--out') {
      outPath = args[i + 1];
      i += 1;
    } else if (arg === '--report') {
      reportPath = args[i + 1];
      i += 1;
    } else if (arg === '--window-days') {
      windowDays = Number.parseInt(args[i + 1] ?? '', 10);
      i += 1;
    }
  }

  return { registryPath, outPath, reportPath, windowDays };
}

function formatTable(flakes: FlakeEntry[]): string[] {
  const rows = flakes.map((entry) => `| ${entry.id} | ${entry.scope} | ${entry.target} | ${entry.owner} | ${entry.expires} | ${entry.ticket} |`);
  return [
    '| ID | Scope | Target | Owner | Expires | Ticket |',
    '|----|-------|--------|-------|---------|--------|',
    ...rows,
  ];
}

function main(): void {
  const { registryPath, outPath, reportPath, windowDays } = parseArgs();
  const registry = loadFlakeRegistry(registryPath);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const soonCutoff = new Date(today);
  soonCutoff.setUTCDate(soonCutoff.getUTCDate() + windowDays);

  const active = registry.flakes.filter((entry) => parseDate(entry.expires) >= today);
  const expiringSoon = active.filter((entry) => {
    const expires = parseDate(entry.expires);
    return expires <= soonCutoff;
  });

  const longestLived = [...active]
    .map((entry) => ({
      id: entry.id,
      owner: entry.owner,
      age_days: daysBetween(parseDate(entry.created), today),
    }))
    .sort((a, b) => b.age_days - a.age_days)
    .slice(0, 5);

  const ownerMentions = Array.from(new Set(expiringSoon.map((entry) => entry.owner))).join(' ');

  const markdown = [
    '# Flake Debt',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    '',
    `Active flakes: **${active.length}**`,
    `Expiring in ${windowDays}d: **${expiringSoon.length}**`,
    '',
    '## Active Registry Entries',
    ...formatTable(active),
    '',
    '## Expiring Soon',
    expiringSoon.length > 0 ? formatTable(expiringSoon).join('\n') : 'None expiring in the next window.',
    '',
    '## Longest-Lived Flakes',
    longestLived.length > 0
      ? ['| ID | Owner | Age (days) |', '|----|-------|------------|', ...longestLived.map((entry) => `| ${entry.id} | ${entry.owner} | ${entry.age_days} |`)].join('\n')
      : 'No active flakes.',
    '',
    ownerMentions ? `**Owner reminders:** ${ownerMentions}` : '**Owner reminders:** none',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${markdown}\n`, 'utf8');

  const report = {
    generated_at: new Date().toISOString(),
    active_total: active.length,
    expiring_soon_total: expiringSoon.length,
    expiring_soon: expiringSoon.map((entry) => ({
      id: entry.id,
      owner: entry.owner,
      expires: entry.expires,
      target: entry.target,
    })),
    longest_lived: longestLived,
    owner_mentions: ownerMentions,
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

main();
