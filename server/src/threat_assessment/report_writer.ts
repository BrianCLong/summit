import fs from 'node:fs';
import path from 'node:path';
import { GraphProjection, ThreatAssessmentResult } from './types';

export function writeDeterministicArtifacts(
  itemSlug: string,
  report: ThreatAssessmentResult,
  graph: GraphProjection,
) {
  const base = path.join('artifacts', 'threat-assessment', itemSlug);
  fs.mkdirSync(base, { recursive: true });

  fs.writeFileSync(path.join(base, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(
    path.join(base, 'metrics.json'),
    JSON.stringify(
      {
        suite: itemSlug,
        indicator_count: report.triggered_indicators.length,
        confidence: report.confidence,
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(path.join(base, 'graph.json'), JSON.stringify(graph, null, 2));
  fs.writeFileSync(path.join(base, 'abuse-cases.json'), JSON.stringify([], null, 2));
  fs.writeFileSync(
    path.join(base, 'stamp.json'),
    JSON.stringify(
      {
        build_sha: process.env.GIT_SHA ?? 'local',
        config_hash: 'mosaic-threat-model-v1',
        corpus_version: 'public-signals-v1',
        generated_at: null,
      },
      null,
      2,
    ),
  );
}
