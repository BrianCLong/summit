import { normalizeSeverity } from './scoring.js';
import { CveRecord, NvdFeed, ToolRiskProfile } from './types.js';

function extractSummary(
  descriptions: Array<{ lang: string; value: string }>,
): string {
  const english = descriptions.find((d) => d.lang.toLowerCase() === 'en');
  return (
    english?.value ?? descriptions[0]?.value ?? 'No description available.'
  );
}

function extractSeverity(
  metrics: NvdFeed['vulnerabilities'][number]['cve']['metrics'],
): {
  severity: string | undefined;
  score: number;
} {
  if (!metrics) {
    return { severity: undefined, score: 0 };
  }
  const cvss =
    metrics.cvssMetricV31?.[0] ??
    metrics.cvssMetricV30?.[0] ??
    metrics.cvssMetricV2?.[0];
  if (!cvss) {
    return { severity: undefined, score: 0 };
  }
  return {
    severity: cvss.cvssData.baseSeverity,
    score: cvss.cvssData.baseScore,
  };
}

function matchTool(criteria: string, tool: string): boolean {
  const normalizedCriteria = criteria.toLowerCase();
  const normalizedTool = tool.toLowerCase();
  return normalizedCriteria.includes(normalizedTool);
}

export function collectRelevantCves(feed: NvdFeed, tool: string): CveRecord[] {
  const matches: CveRecord[] = [];
  for (const item of feed.vulnerabilities) {
    const { cve, published } = item;
    const nodes = cve.configurations?.nodes ?? [];
    const cpeMatches = nodes.flatMap((node) => node.cpeMatch ?? []);
    const hasMatch = cpeMatches.some(
      (match) => match.vulnerable && matchTool(match.criteria, tool),
    );
    if (!hasMatch) {
      continue;
    }
    const summary = extractSummary(cve.descriptions ?? []);
    const { severity, score } = extractSeverity(cve.metrics ?? ({} as never));
    matches.push({
      id: cve.id,
      severity: normalizeSeverity(severity),
      published,
      summary,
      score,
    });
  }
  return matches;
}

export function applyCvesToProfile(
  profile: ToolRiskProfile,
  cves: CveRecord[],
): ToolRiskProfile {
  const existing = new Map(profile.cves.map((cve) => [cve.id, cve] as const));
  for (const cve of cves) {
    existing.set(cve.id, cve);
  }
  const nextCves = Array.from(existing.values()).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  return {
    ...profile,
    cves: nextCves,
    lastUpdated: new Date().toISOString(),
  };
}
