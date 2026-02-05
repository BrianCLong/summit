import { PlatformWatchReport } from './types';

export function renderReportMarkdown(report: PlatformWatchReport): string {
  const lines: string[] = [];
  lines.push(`# Platform Watch Report (${report.date})`);
  lines.push('');
  lines.push(report.summary || '');
  lines.push('');
  lines.push('## Platforms');
  for (const platform of report.platforms) {
    lines.push(`- ${platform.name} (${platform.status})`);
  }
  lines.push('');
  lines.push('## Claims');
  for (const claim of report.claims) {
    lines.push(`- ${claim.id}: ${claim.text}`);
  }
  lines.push('');
  lines.push('## Drift');
  lines.push(`Detected: ${report.drift.detected ? 'true' : 'false'}`);
  for (const reason of report.drift.reasons) {
    lines.push(`- ${reason.claim_id} vs ${reason.evidence_id}: ${reason.explanation}`);
  }
  lines.push('');
  lines.push('## Evidence');
  for (const item of report.evidence) {
    lines.push(`- ${item.platform.toUpperCase()}: ${item.title}`);
  }
  lines.push('');
  return lines.join('\n');
}
