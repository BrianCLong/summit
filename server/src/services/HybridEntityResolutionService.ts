import path from 'path';
import { PythonShell } from 'python-shell';
import pino from 'pino';
import { randomUUID as uuidv4 } from 'node:crypto';

const log = pino({ name: 'HybridEntityResolutionService' });

export interface ERServiceResult {
  version: string;
  score: number;
  match: boolean;
  explanation: Record<string, number>;
  traceId: string;
  confidence?: number;
  method?: string;
  riskScore?: number;
}

export async function resolveEntities(
  a: string,
  b: string,
): Promise<ERServiceResult> {
  const traceId = uuidv4();
  const script = path.join(process.cwd(), 'ml', 'er', 'api.py');
  const result = await PythonShell.run(script, {
    args: [a, b],
    pythonOptions: ['-u'],
  });
  const parsed = JSON.parse(result[0]);
  log.info({ traceId, features: parsed.explanation }, 'er_match');
  return { ...parsed, traceId } as ERServiceResult;
}
