import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import type {
  AnonymizationRun,
  AnonymizationService,
  AnonymizationTarget,
  TriggerAnonymizationOptions,
} from '../../services-types';

interface ScriptPayload {
  run_id: string;
  status: string;
  dry_run: boolean;
  scope: string[];
  started_at: string;
  completed_at?: string | null;
  masked_postgres?: number;
  masked_neo4j?: number;
  notes?: string | null;
}

const DEFAULT_SCOPE: AnonymizationTarget[] = ['POSTGRES', 'NEO4J'];

function runPythonScript(pythonExecutable: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonExecutable, args, {
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        const error = new Error(
          `Anonymization script exited with code ${code}${stderr ? `: ${stderr.trim()}` : ''}`,
        );
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function toAnonymizationRun(payload: ScriptPayload): AnonymizationRun {
  const scope = Array.isArray(payload.scope) && payload.scope.length > 0 ? payload.scope : DEFAULT_SCOPE;
  const status = payload.status ?? (payload.dry_run ? 'DRY_RUN' : 'COMPLETED');
  return {
    runId: payload.run_id,
    status,
    dryRun: Boolean(payload.dry_run),
    scope: scope as AnonymizationTarget[],
    startedAt: payload.started_at ?? new Date().toISOString(),
    completedAt: payload.completed_at ?? null,
    maskedPostgres: payload.masked_postgres ?? 0,
    maskedNeo4j: payload.masked_neo4j ?? 0,
    notes: payload.notes ?? null,
  };
}

export function createAnonymizationService(): AnonymizationService {
  const scriptPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    '..',
    'scripts',
    'data_anonymizer.py',
  );

  return {
    async triggerRun(options: TriggerAnonymizationOptions): Promise<AnonymizationRun> {
      const runId = randomUUID();
      const normalizedScope = options.scope && options.scope.length > 0 ? Array.from(new Set(options.scope)) : DEFAULT_SCOPE;
      const pythonExecutable = process.env.ANONYMIZER_PYTHON || process.env.PYTHON || 'python3';

      const args = [scriptPath, '--run-id', runId];

      if (normalizedScope.includes('POSTGRES')) {
        args.push('--postgres');
      }
      if (normalizedScope.includes('NEO4J')) {
        args.push('--neo4j');
      }
      if (options.dryRun) {
        args.push('--dry-run');
      }
      if (options.triggeredBy) {
        args.push('--triggered-by', options.triggeredBy);
      }

      const rawOutput = await runPythonScript(pythonExecutable, args);
      if (!rawOutput) {
        throw new Error('Anonymization script returned no output');
      }

      let parsed: ScriptPayload;
      try {
        parsed = JSON.parse(rawOutput) as ScriptPayload;
      } catch (error) {
        throw new Error(`Failed to parse anonymization output: ${(error as Error).message}`);
      }

      // Ensure the run id from the script is propagated even if it generated its own.
      if (!parsed.run_id) {
        parsed.run_id = runId;
      }
      if (!parsed.scope || parsed.scope.length === 0) {
        parsed.scope = normalizedScope;
      }
      if (typeof parsed.dry_run !== 'boolean') {
        parsed.dry_run = Boolean(options.dryRun);
      }

      return toAnonymizationRun(parsed);
    },
  };
}
