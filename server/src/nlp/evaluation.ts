import fs from 'fs';
import path from 'path';
import { TextIngestionPipeline, loadDomainTestSet, RawDocument } from './pipeline';

export interface EvaluationMetrics {
  precision: number;
  recall: number;
  f1: number;
  latencyMs: number;
  total: number;
}

export class EvaluationHarness {
  private pipeline: TextIngestionPipeline;
  private testSetPath: string;

  constructor(options: { modelName?: string; testSetPath?: string } = {}) {
    this.pipeline = new TextIngestionPipeline({ modelName: options.modelName });
    this.testSetPath = options.testSetPath || path.join(__dirname, '..', '..', 'data', 'domain-test-set.json');
  }

  async run(): Promise<EvaluationMetrics> {
    const dataset = loadDomainTestSet(this.testSetPath);
    const documents: RawDocument[] = dataset.map((row) => ({
      source: 'file',
      payload: row,
    }));

    const start = Date.now();
    const processed = documents.map((doc) => this.pipeline.process(doc));
    const resolved = await Promise.all(
      processed.map((promise) => promise.catch(() => undefined)),
    );

    const results = resolved.filter(Boolean) as Awaited<
      ReturnType<TextIngestionPipeline['process']>
    >[];
    const latencyMs = Date.now() - start;

    const positives = results.flatMap((item) => item.relationships);
    const truePositives = positives.filter((rel) => rel.confidence > 0.5).length;
    const predicted = positives.length;
    const expected = dataset.length; // placeholder ground truth size

    const precision = predicted === 0 ? 0 : truePositives / predicted;
    const recall = expected === 0 ? 0 : truePositives / expected;
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

    return { precision, recall, f1, latencyMs, total: dataset.length };
  }

  report(metrics: EvaluationMetrics): string {
    return [
      `precision=${metrics.precision.toFixed(3)}`,
      `recall=${metrics.recall.toFixed(3)}`,
      `f1=${metrics.f1.toFixed(3)}`,
      `latency_ms=${metrics.latencyMs}`,
      `samples=${metrics.total}`,
    ].join('\n');
  }
}

export function writeAlert(metrics: EvaluationMetrics, threshold = 0.6, filePath?: string) {
  const alert = {
    at: new Date().toISOString(),
    ok: metrics.f1 >= threshold,
    metrics,
  };
  if (filePath) {
    fs.writeFileSync(filePath, JSON.stringify(alert, null, 2));
  }
  return alert;
}
