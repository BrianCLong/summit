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
  confidence?: 'high' | 'medium' | 'low' | 'none' | number; // Updated type to match Python output and legacy
  method?: string;
  riskScore?: number;
}

export async function resolveEntities(
  a: string,
  b: string,
): Promise<ERServiceResult> {
  const traceId = uuidv4();
  const script = path.join(process.cwd(), 'ml', 'er', 'api.py');

  try {
    const result = await PythonShell.run(script, {
      args: [a, b],
      pythonOptions: ['-u'],
    });

    // Python script output is the last line printed to stdout
    const lastLine = result[result.length - 1];

    if (!lastLine) {
       throw new Error('No output from Python ER script');
    }

    const parsed = JSON.parse(lastLine);

    // Check for explicit error from Python script
    if (parsed.error) {
       throw new Error(`ER Script Error: ${parsed.error}`);
    }

    log.info({ traceId, features: parsed.explanation, score: parsed.score }, 'er_match');
    return { ...parsed, traceId } as ERServiceResult;
  } catch (error: any) {
    log.error({ traceId, error: error.message, stack: error.stack }, 'Failed to resolve entities via Python ML script');
    // Fallback or rethrow? For now we return a safe default to prevent crash
    return {
       version: '1.0.0',
       score: 0,
       match: false,
       explanation: {},
       traceId,
       confidence: 0,
       method: 'error_fallback'
    } as unknown as ERServiceResult;
  }
}
