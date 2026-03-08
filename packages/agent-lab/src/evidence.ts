import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { BoundedContent, ContentBoundary } from './contentBoundary.js';
import { JudgeScores } from './judge.js';
import { PolicyDecision } from './policy.js';

export interface EvidenceArtifact {
  id: string;
  stepName: string;
  tool: string;
  version: string;
  timestamp: string;
  inputs: Record<string, unknown>;
  output: BoundedContent;
  rawOutputPath: string | null;
  hashes: {
    output: string | null;
  };
  policy: PolicyDecision;
  redaction: string[];
  notes?: string;
  allowed: boolean;
}

export interface RunSummary {
  runId: string;
  workflow: string;
  startedAt: string;
  finishedAt?: string;
  steps: Array<{
    name: string;
    tool: string;
    status: 'allowed' | 'denied' | 'error';
    message: string;
    evidenceId?: string;
  }>;
  objectives?: string[];
  expect?: string[];
  policyVersion?: string;
}

export class EvidenceStore {
  private counter = 0;

  constructor(
    private readonly baseDir: string,
    private readonly boundary: ContentBoundary,
    private readonly runId: string = crypto.randomUUID(),
  ) {}

  get runPath() {
    return path.join(this.baseDir, this.runId);
  }

  init() {
    fs.mkdirSync(path.join(this.runPath, 'evidence'), { recursive: true });
    fs.mkdirSync(path.join(this.runPath, 'raw'), { recursive: true });
  }

  private nextId() {
    this.counter += 1;
    return String(this.counter).padStart(4, '0');
  }

  private stable(obj: unknown) {
    const sortKeys = (input: any): any => {
      if (Array.isArray(input)) {
        return input.map(sortKeys);
      }
      if (input && typeof input === 'object') {
        const sorted: Record<string, any> = {};
        Object.keys(input)
          .sort()
          .forEach((key) => {
            sorted[key] = sortKeys(input[key]);
          });
        return sorted;
      }
      return input;
    };
    return JSON.stringify(sortKeys(obj));
  }

  record(
    stepName: string,
    tool: string,
    version: string,
    inputs: Record<string, unknown>,
    output: unknown,
    policy: PolicyDecision,
    notes?: string,
  ): EvidenceArtifact {
    const id = this.nextId();
    const bounded = this.boundary.markUntrusted(output);
    const rawFile = path.join(this.runPath, 'raw', `${id}-${tool}.txt`);
    const stableOutput = typeof output === 'string' ? output : JSON.stringify(output, null, 2);
    fs.writeFileSync(rawFile, stableOutput);
    const hash = crypto.createHash('sha256').update(stableOutput).digest('hex');

    const artifact: EvidenceArtifact = {
      id,
      stepName,
      tool,
      version,
      timestamp: new Date().toISOString(),
      inputs,
      output: bounded,
      rawOutputPath: rawFile,
      hashes: { output: hash },
      policy,
      redaction: bounded.redactions,
      notes,
      allowed: policy.allowed,
    };

    const ledgerPath = path.join(this.runPath, 'evidence', 'evidence.ndjson');
    const serialized = this.stable(artifact);
    fs.appendFileSync(ledgerPath, `${serialized}\n`);
    return artifact;
  }

  writeRunSummary(summary: RunSummary) {
    const summaryPath = path.join(this.runPath, 'run.json');
    fs.writeFileSync(summaryPath, this.stable(summary));
    return summaryPath;
  }

  writeReport(markdown: string) {
    const reportPath = path.join(this.runPath, 'report.md');
    fs.writeFileSync(reportPath, markdown);
    return reportPath;
  }

  writeJudge(judge: JudgeScores, markdown: string) {
    const jsonPath = path.join(this.runPath, 'judge.json');
    const mdPath = path.join(this.runPath, 'judge.md');
    fs.writeFileSync(jsonPath, this.stable(judge));
    fs.writeFileSync(mdPath, markdown);
    return { jsonPath, mdPath };
  }
}
