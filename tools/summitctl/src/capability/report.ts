import fs from 'node:fs';
import path from 'node:path';
import { CapabilityRegistry } from './types';
import { CapabilityRisk, RiskDiff } from './risk';

export function writeRiskReport(
  outputPath: string,
  registry: CapabilityRegistry,
  risks: CapabilityRisk[],
  diff: RiskDiff | null,
): void {
  const lines: string[] = [];
  lines.push('# Capability Risk Report');
  lines.push('');
  lines.push(`Total capabilities: ${registry.capabilities.length}`);
  lines.push('');

  if (diff) {
    lines.push('## What changed');
    lines.push('');
    lines.push(`- New capabilities: ${diff.new_capabilities.length}`);
    for (const cap of diff.new_capabilities) {
      lines.push(`  - ${cap}`);
    }
    lines.push(`- Removed capabilities: ${diff.removed_capabilities.length}`);
    for (const cap of diff.removed_capabilities) {
      lines.push(`  - ${cap}`);
    }
    lines.push(`- Scope changes: ${diff.scope_changes.length}`);
    for (const change of diff.scope_changes) {
      lines.push(`  - ${change}`);
    }
    lines.push('');
  }

  lines.push('## Risk ranking');
  lines.push('');
  const sorted = [...risks].sort((a, b) => b.score - a.score);
  for (const risk of sorted) {
    lines.push(`- ${risk.capability_id} (score: ${risk.score})`);
    lines.push(`  - Downstream services: ${risk.blast_radius.downstream_services}`);
    if (risk.missing_metadata.length) {
      lines.push(`  - Missing metadata: ${risk.missing_metadata.join(', ')}`);
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
}

export function writeDashboard(outputPath: string, risks: CapabilityRisk[]): void {
  const lines: string[] = [];
  lines.push('# Capability Fabric Dashboard');
  lines.push('');
  lines.push('| Capability | Score | Downstream | Missing metadata |');
  lines.push('| --- | --- | --- | --- |');
  for (const risk of risks.sort((a, b) => b.score - a.score)) {
    lines.push(
      `| ${risk.capability_id} | ${risk.score} | ${risk.blast_radius.downstream_services} | ${risk.missing_metadata.join(', ') || 'none'} |`,
    );
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
}
