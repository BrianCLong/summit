import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface NaturalLanguageGraphInput {
  prompt: string;
  tenantId: string;
  limit?: number;
}

export interface NaturalLanguageGraphResponse {
  cypher: string;
  graphql: string | null;
  params: Record<string, unknown>;
  warnings: string[];
}

function sanitizePrompt(prompt: string): string {
  return prompt
    .replace(/[^a-zA-Z0-9\s,\.\-_'?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 512);
}

export async function runNaturalLanguageProcessor(
  input: NaturalLanguageGraphInput
): Promise<NaturalLanguageGraphResponse> {
  const sanitizedPrompt = sanitizePrompt(input.prompt);
  if (!sanitizedPrompt) {
    throw new Error('Prompt is empty after sanitization.');
  }

  const payload = {
    prompt: sanitizedPrompt,
    tenantId: input.tenantId,
    limit: typeof input.limit === 'number' ? input.limit : undefined
  };

  const pythonExecutable = process.env.NLQ_PYTHON_PATH || process.env.PYTHON_PATH || 'python3';
  const candidatePaths = [
    path.resolve(process.cwd(), 'python/nlq/process_nl_query.py'),
    path.resolve(process.cwd(), 'server/python/nlq/process_nl_query.py'),
    path.resolve(__dirname, '../../../python/nlq/process_nl_query.py')
  ];
  const scriptPath = candidatePaths.find((candidate) => fs.existsSync(candidate)) ?? candidatePaths[0];

  return new Promise<NaturalLanguageGraphResponse>((resolve, reject) => {
    const proc = spawn(pythonExecutable, [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('Timed out waiting for natural language processor response.'));
    }, 5000);

    proc.stdout.on('data', (data) => {
      stdout += data.toString('utf8');
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString('utf8');
    });

    proc.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(stderr || `Python processor exited with code ${code}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve({
          cypher: parsed.cypher,
          graphql: parsed.graphql ?? null,
          params: parsed.params ?? {},
          warnings: Array.isArray(parsed.warnings) ? parsed.warnings : []
        });
      } catch (error) {
        reject(new Error(`Failed to parse NL processor response: ${(error as Error).message}`));
      }
    });

    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });
}
