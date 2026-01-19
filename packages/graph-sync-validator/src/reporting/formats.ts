import fs from 'node:fs';
import { Drift } from '../diff/compare.js';

export function writeJsonl(drift: Drift, filepath: string) {
  const lines: string[] = [];
  const push = (kind: string, payload: unknown) =>
    lines.push(JSON.stringify({ kind, ...payload }));

  for (const node of drift.missingNodes) {
    push('missing_node', { node });
  }
  for (const node of drift.extraNodes) {
    push('extra_node', { node });
  }
  for (const mismatch of drift.mismatchedNodes) {
    push('mismatched_node', {
      key: mismatch.key,
      pg: mismatch.pg,
      neo: mismatch.neo,
    });
  }

  for (const edge of drift.missingEdges) {
    push('missing_edge', { edge });
  }
  for (const edge of drift.extraEdges) {
    push('extra_edge', { edge });
  }
  for (const mismatch of drift.mismatchedEdges) {
    push('mismatched_edge', {
      key: mismatch.key,
      pg: mismatch.pg,
      neo: mismatch.neo,
    });
  }

  fs.writeFileSync(filepath, lines.join('\n') + (lines.length ? '\n' : ''), 'utf8');
}

export function writeParityTxt(drift: Drift, filepath: string) {
  fs.writeFileSync(filepath, `${drift.parity}\n`, 'utf8');
}

export function writeJUnit(drift: Drift, filepath: string) {
  const failures =
    drift.missingNodes.length +
    drift.extraNodes.length +
    drift.mismatchedNodes.length +
    drift.missingEdges.length +
    drift.extraEdges.length +
    drift.mismatchedEdges.length;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="graph-parity" tests="1" failures="${failures}">
  <testcase classname="graph-sync" name="parity">
    ${
      failures === 0
        ? ''
        : `<failure message="Graph drift detected">parity=${drift.parity}</failure>`
    }
  </testcase>
</testsuite>
`;
  fs.writeFileSync(filepath, xml, 'utf8');
}

export function printTextTable(drift: Drift) {
  const rows: Array<[string, string]> = [
    ['parity', drift.parity.toFixed(6)],
    ['missingNodes', String(drift.missingNodes.length)],
    ['extraNodes', String(drift.extraNodes.length)],
    ['mismatchedNodes', String(drift.mismatchedNodes.length)],
    ['missingEdges', String(drift.missingEdges.length)],
    ['extraEdges', String(drift.extraEdges.length)],
    ['mismatchedEdges', String(drift.mismatchedEdges.length)],
  ];
  const pad = (value: string, width: number) =>
    (value + ' '.repeat(width)).slice(0, width);

  for (const [key, value] of rows) {
    console.log(`${pad(key, 16)} ${value}`);
  }
}
