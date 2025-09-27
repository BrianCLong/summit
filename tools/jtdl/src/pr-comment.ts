import { Hotspot, ImpactReport } from './types.js';

const formatHotspot = (hotspot: Hotspot): string => {
  const header = `- **${hotspot.dataClassId}** (${hotspot.scope}) — ${hotspot.reason}`;
  const files = hotspot.matches
    .map((match) => `  - ${match.file}:L${match.line} — ${match.excerpt}`)
    .join('\n');
  const suggestion = `  - Suggestion: ${hotspot.suggestion}`;
  return [header, files, suggestion].filter(Boolean).join('\n');
};

export const buildPrComment = (report: ImpactReport): string => {
  const header = [
    '## JTDL Hotspot Report',
    '',
    `Baseline taxonomy: **${report.baselineVersion}** → Updated taxonomy: **${report.updatedVersion}**`,
    report.jurisdiction ? `Jurisdiction: ${report.jurisdiction}` : undefined,
    '',
    '### Impacted Data Classes',
  ]
    .filter(Boolean)
    .join('\n');

  if (report.hotspots.length === 0) {
    return `${header}\n\nNo hotspots detected. ✅`;
  }

  const hotspotDetails = report.hotspots
    .map((hotspot) => formatHotspot(hotspot))
    .join('\n');

  const footer = [
    '',
    `Signature (**${report.signature.keyId}**, ${report.signature.algorithm}): \`${report.signature.signature}\``,
    '',
    'To verify this report, run `jtdl verify --report <path> --key <key>`.',
  ].join('\n');

  return `${header}\n${hotspotDetails}${footer}`;
};
