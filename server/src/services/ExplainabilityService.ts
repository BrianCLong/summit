import { spawn } from 'child_process';

import baseLogger from '../config/logger';

const logger = baseLogger.child({ name: 'ExplainabilityService' });

export interface ExplainabilityEntityInput {
  text: string;
  label: string;
  confidence?: number;
  start?: number;
  end?: number;
}

export interface ExplainabilityResult {
  explanations: any[];
  usedMethod: string;
  generatedAt: string;
}

export class ExplainabilityService {
  private pythonPath: string;

  constructor(pythonPath: string = process.env.PYTHON_PATH || 'python3') {
    this.pythonPath = pythonPath;
  }

  async explainEntityRecognition(
    text: string,
    entities: ExplainabilityEntityInput[],
    options: { method?: string | null; topK?: number; framework?: string } = {},
  ): Promise<ExplainabilityResult> {
    const trimmedText = text?.trim();
    if (!trimmedText || !entities?.length) {
      return {
        explanations: [],
        usedMethod: 'none',
        generatedAt: new Date().toISOString(),
      };
    }

    const payload = {
      text: trimmedText,
      entities: entities.map((entity) => ({
        text: entity.text,
        label: entity.label,
        confidence: entity.confidence,
        start: entity.start,
        end: entity.end,
      })),
      options: {
        method: options.method || undefined,
        top_k: options.topK ?? 5,
        framework: options.framework || 'pytorch',
      },
    };

    try {
      const stdout = await this.runPythonExplainability(payload);
      const parsed = JSON.parse(stdout);
      if (parsed?.success === false) {
        logger.warn('Python explainability reported failure: %s', parsed?.error);
        return {
          explanations: this.buildFallbackExplanations(trimmedText, entities, options.topK ?? 5),
          usedMethod: 'heuristic',
          generatedAt: new Date().toISOString(),
        };
      }

      return {
        explanations: parsed.explanations ?? [],
        usedMethod: parsed.usedMethod ?? 'unknown',
        generatedAt: parsed.generatedAt ?? new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to execute explainability pipeline: %s', error);
      return {
        explanations: this.buildFallbackExplanations(trimmedText, entities, options.topK ?? 5),
        usedMethod: 'heuristic',
        generatedAt: new Date().toISOString(),
      };
    }
  }

  private runPythonExplainability(payload: Record<string, unknown>): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = ['-m', 'server.ml.explainability.cli'];
      const python = spawn(this.pythonPath, args, {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      python.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
      python.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

      python.on('error', (error) => reject(error));
      python.on('close', (code) => {
        if (code !== 0) {
          const error = Buffer.concat(stderrChunks).toString('utf-8');
          return reject(new Error(error || `Python exited with code ${code}`));
        }
        resolve(Buffer.concat(stdoutChunks).toString('utf-8'));
      });

      python.stdin.write(JSON.stringify(payload));
      python.stdin.end();
    });
  }

  private buildFallbackExplanations(
    text: string,
    entities: ExplainabilityEntityInput[],
    topK: number,
  ): any[] {
    const safeTopK = Math.max(1, Math.min(topK, 10));
    return entities.map((entity) => {
      const context = this.extractContext(text, entity.start, entity.end);
      const features = this.scoreTokens(entity.label, context).slice(0, safeTopK);
      const summaryTokens = features.slice(0, 3).map((item) => `${item.feature} (${item.weight.toFixed(2)})`);

      return {
        entityText: entity.text,
        label: entity.label,
        confidence: entity.confidence,
        method: 'heuristic',
        context,
        featureWeights: features,
        summary:
          summaryTokens.length > 0
            ? `Top indicators for ${entity.label}: ${summaryTokens.join(', ')}`
            : `No strong indicators detected for ${entity.label}.`,
      };
    });
  }

  private extractContext(text: string, start?: number, end?: number): string {
    if (start == null || end == null || start < 0 || end <= start) {
      return text.slice(0, 280).trim();
    }
    const window = 80;
    const snippet = text.slice(Math.max(0, start - window), Math.min(text.length, end + window)).trim();
    return snippet || text.slice(0, 280).trim();
  }

  private scoreTokens(label: string, context: string): Array<{ feature: string; weight: number }> {
    const tokens = context.match(/[\w@]+/g) ?? [];
    const labelLower = label.toLowerCase();
    return tokens
      .map((token) => {
        let weight = 0;
        const lower = token.toLowerCase();
        if (labelLower === 'person') {
          if (token[0] && token[0] === token[0].toUpperCase()) weight += 0.3;
          if (['mr', 'mrs', 'dr', 'ms'].includes(lower)) weight += 0.2;
          if (token.includes('@')) weight += 0.15;
        } else if (labelLower === 'organization') {
          if (['inc', 'corp', 'llc', 'ltd'].includes(lower)) weight += 0.35;
          if (/(corp|inc|llc)$/i.test(token)) weight += 0.2;
        } else if (labelLower === 'location') {
          if (['city', 'county', 'seattle', 'denver', 'boston', 'washington'].includes(lower)) weight += 0.3;
          if (token.endsWith(',')) weight += 0.1;
        } else if (labelLower === 'event') {
          if (['summit', 'conference', 'meeting', 'workshop'].includes(lower)) weight += 0.35;
          if (/\d/.test(token)) weight += 0.1;
        }
        return { feature: token, weight };
      })
      .filter((item) => item.weight > 0)
      .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  }
}

export const explainabilityService = new ExplainabilityService();
