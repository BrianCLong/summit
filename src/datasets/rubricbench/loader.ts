import fs from 'fs';
import readline from 'readline';
import crypto from 'crypto';
import path from 'path';

export interface AtomicRubric {
  criterion: string;
  score_a: number;
  score_b: number;
}

export interface RubricBenchItem {
  id: string;
  instruction: string;
  output_a: string;
  output_b: string;
  preference: 'A' | 'B' | 'tie';
  atomic_rubrics: AtomicRubric[];
  is_hard_sample?: boolean;
  surface_bias_tags?: string[];
}

export class RubricBenchLoader {
  static async loadFile(filePath: string): Promise<RubricBenchItem[]> {
    const items: RubricBenchItem[] = [];
    const fileStream = fs.createReadStream(filePath);

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (line.trim() !== '') {
        items.push(JSON.parse(line));
      }
    }

    return items;
  }

  static generateEvidenceId(item: RubricBenchItem): string {
    const content = JSON.stringify({ instruction: item.instruction, output_a: item.output_a, output_b: item.output_b });
    const hash = crypto.createHash('sha256').update(content).digest('hex').substring(0, 8);
    const caseId = item.id.replace('case-', '').padStart(4, '0');
    return `EVID:rubricbench:rqe:${hash}:${caseId}`;
  }

  static generateDeterministicArtifact(items: RubricBenchItem[], artifactType: 'report' | 'metrics', destDir: string) {
      const stamp = crypto.createHash('sha256').update(JSON.stringify(items)).digest('hex');
      let data: any = { stamp };

      if (artifactType === 'report') {
          data.items = items.map(item => ({...item, evidence_id: this.generateEvidenceId(item)}));
      } else if (artifactType === 'metrics') {
          const total = items.length;
          const hardSamples = items.filter(i => i.is_hard_sample).length;
          data.metrics = {
              total_cases: total,
              hard_samples: hardSamples,
              hard_sample_ratio: total > 0 ? hardSamples / total : 0
          };
      }

      const filePath = path.join(destDir, `${artifactType}.json`);
      fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return filePath;
  }
}
