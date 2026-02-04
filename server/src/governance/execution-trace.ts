
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

export interface TraceContext {
  traceId: string;
  runId: string;
  taskId: string;
  agentId?: string;
  input: any;
  policyVersion?: string;
  startTime: string;
}

export interface TraceResult {
  output: any;
  error?: string;
  endTime: string;
  durationMs: number;
  metadata?: Record<string, any>;
}

export class ExecutionTrace {
  private context: TraceContext;
  private evidenceDir: string;

  constructor(context: Omit<TraceContext, 'traceId' | 'startTime'>) {
    this.context = {
      ...context,
      traceId: randomUUID(),
      startTime: new Date().toISOString()
    };

    // Ensure evidence directory exists
    this.evidenceDir = path.join(process.cwd(), 'evidence', 'traces');
    if (!fs.existsSync(this.evidenceDir)) {
      fs.mkdirSync(this.evidenceDir, { recursive: true });
    }
  }

  public getTraceId(): string {
    return this.context.traceId;
  }

  public async record(result: Omit<TraceResult, 'endTime' | 'durationMs'>) {
    const endTime = new Date().toISOString();
    const durationMs = new Date(endTime).getTime() - new Date(this.context.startTime).getTime();

    const traceArtifact = {
      ...this.context,
      result: {
        ...result,
        endTime,
        durationMs
      },
      schema_version: "1.0.0",
      compliance_tags: ["traceability", "eu_ai_act_art_12"]
    };

    const filepath = path.join(this.evidenceDir, `${this.context.traceId}.json`);
    await fs.promises.writeFile(filepath, JSON.stringify(traceArtifact, null, 2));

    return traceArtifact;
  }
}
