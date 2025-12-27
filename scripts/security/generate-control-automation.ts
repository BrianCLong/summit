#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

interface ControlDefinition {
  id: string;
  title: string;
  threatModel: string;
  mitigation: string;
  automation: string[];
  evidence: string[];
  owner: string;
}

interface ControlFile {
  controls: ControlDefinition[];
}

function loadControls(): ControlDefinition[] {
  const controlPath = path.join(process.cwd(), 'docs/security/control-implementations.json');
  const data = fs.readFileSync(controlPath, 'utf-8');
  const parsed = JSON.parse(data) as ControlFile;
  return parsed.controls;
}

function renderMarkdown(controls: ControlDefinition[]): string {
  const lines: string[] = [];
  lines.push('# Control Automation Plan');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('Source: docs/security/control-implementations.json');
  lines.push('');
  lines.push('Each control below is derived directly from threat mitigation strategies and can be executed by CI/ops runbooks.');
  lines.push('');

  for (const control of controls) {
    lines.push(`## ${control.id} — ${control.title}`);
    lines.push('');
    lines.push(`- **Threat Model:** [${control.threatModel}](${control.threatModel})`);
    lines.push(`- **Mitigation:** ${control.mitigation}`);
    lines.push(`- **Owner:** ${control.owner}`);
    lines.push('- **Automation:**');
    lines.push('');
    for (const step of control.automation) {
      lines.push(`  - \\`${step}\\``);
    }
    lines.push('');
    lines.push('- **Evidence Sources:**');
    lines.push('');
    for (const evidence of control.evidence) {
      lines.push(`  - ${evidence}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function writePlan(markdown: string): void {
  const outputDir = path.join(process.cwd(), 'docs/security/generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'control-automation-plan.md');
  fs.writeFileSync(outputPath, markdown, 'utf-8');
}

function main(): void {
  const controls = loadControls();
  const markdown = renderMarkdown(controls);
  writePlan(markdown);
  console.log('Generated control automation plan at docs/security/generated/control-automation-plan.md');
}

main();
