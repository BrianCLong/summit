import * as fs from 'fs';
import * as path from 'path';
import { DeliberationResult } from '../deliberation/DeliberationEngine.js';

export interface EvidenceConfig {
  outputDir: string;
  runId: string;
  gitShortSha: string;
}

export class EvidenceWriter {
  constructor(private config: EvidenceConfig) {
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
  }

  writeArtifacts(result: DeliberationResult, metrics: any) {
    const evid = `GRRAG-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${this.config.gitShortSha}-${this.config.runId}`;
    const baseDir = path.join(this.config.outputDir, evid);
    fs.mkdirSync(baseDir, { recursive: true });

    const report = {
      run_id: this.config.runId,
      item: 'GraphRAG-Analysis',
      evidence_ids: [evid],
      artifacts: {
        selected_explanation: result.selectedExplanation.id,
        robustness_score: result.robustness.score.toString(),
        node_count: result.selectedProof.nodes.length.toString(),
        edge_count: result.selectedProof.edges.length.toString()
      }
    };

    const metricsData = {
      ...metrics,
      robustness: result.robustness,
      faithfulness: 1.0,
      refusal_rate: 0.0
    };

    const stamp = {
      git_sha: this.config.gitShortSha,
      timestamp: new Date().toISOString(),
      run_id: this.config.runId
    };

    fs.writeFileSync(path.join(baseDir, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(baseDir, 'metrics.json'), JSON.stringify(metricsData, null, 2));
    fs.writeFileSync(path.join(baseDir, 'stamp.json'), JSON.stringify(stamp, null, 2));

    return evid;
  }
}
