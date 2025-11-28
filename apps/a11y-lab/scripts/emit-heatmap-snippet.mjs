#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const artifact = path.join(process.cwd(), 'artifacts', 'axe-report.json');
const output = path.join(process.cwd(), 'artifacts', 'heatmap-snippet.js');

if (!fs.existsSync(artifact)) {
  console.error('No axe report found; run pnpm test first.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(artifact, 'utf8'));
const snippet = `window.__AXE_RESULTS__ = ${JSON.stringify(report)};\n` +
  `(${function toggle() {
    const id = 'a11y-heatmap-overlay';
    const existing = document.getElementById(id);
    if (existing) { existing.remove(); return; }
    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.style.position = 'absolute';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '999999';
    const scale = ['#009688', '#4CAF50', '#FFC107', '#FF7043', '#E53935'];
    const bucket = (impact) => ({ minor:1, moderate:2, serious:3, critical:4 }[impact] || 0);
    document.body.appendChild(overlay);
    (window.__AXE_RESULTS__?.violations || []).forEach((violation) => {
      const score = bucket(violation.impact);
      (violation.nodes || []).forEach((node) => {
        (node.target || []).flat().forEach((sel) => {
          const el = document.querySelector(sel);
          if (!el) return;
          const rect = el.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const w = document.createElement('div');
          w.style.position = 'absolute';
          w.style.left = `${rect.left + window.scrollX}px`;
          w.style.top = `${rect.top + window.scrollY}px`;
          w.style.width = `${rect.width}px`;
          w.style.height = `${rect.height}px`;
          w.style.pointerEvents = 'none';
          w.style.outline = `2px solid ${scale[Math.min(score, scale.length - 1)]}`;
          overlay.appendChild(w);
        });
      });
    });
  }}());`;

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, snippet);
console.log(`Heatmap snippet written to ${output}`);
