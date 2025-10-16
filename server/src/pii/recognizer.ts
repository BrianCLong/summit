import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { defaultPatternLibrary } from './patterns.js';
import {
  ClassificationContext,
  EntityMatch,
  PatternDefinition,
  RecognitionOptions,
  RecognitionRequest,
  RecognitionResult,
  RecognitionStats,
} from './types.js';

export interface MLDetector {
  id: string;
  supportedTypes?: Set<string>;
  detect: (
    value: string,
    context: ClassificationContext,
  ) => Promise<
    Pick<
      EntityMatch,
      'type' | 'value' | 'confidence' | 'rawScore' | 'metadata'
    >[]
  >;
}

const buildContext = (
  value: string,
  start: number,
  end: number,
  request?: RecognitionRequest,
): ClassificationContext => {
  const padding = 48;
  const beforeStart = Math.max(0, start - padding);
  const afterEnd = Math.min(value.length, end + padding);
  return {
    text: value,
    before: value.slice(beforeStart, start),
    after: value.slice(end, afterEnd),
    schemaField: request?.schemaField?.fieldName,
    schemaDescription: request?.schemaField?.description,
    schemaPath: request?.schema?.fields
      ? [request.schema.name, request.schemaField?.fieldName ?? '']
      : undefined,
    recordId: request?.recordId,
    tableName: request?.tableName,
    additionalMetadata: request?.additionalContext,
  };
};

const withGlobalFlag = (regex: RegExp): RegExp => {
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  return new RegExp(regex.source, flags);
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export class HybridEntityRecognizer {
  private patterns: PatternDefinition[];
  private mlDetectors: MLDetector[] = [];

  constructor(patterns: PatternDefinition[] = defaultPatternLibrary) {
    this.patterns = [...patterns];
  }

  registerPattern(pattern: PatternDefinition): void {
    this.patterns.push(pattern);
  }

  registerMLDetector(detector: MLDetector): void {
    this.mlDetectors.push(detector);
  }

  async recognize(
    request: RecognitionRequest,
    options: RecognitionOptions = {},
  ): Promise<RecognitionResult> {
    const value = request.value ?? '';
    const startTime = performance.now();
    const entities: EntityMatch[] = [];
    let evaluatedPatterns = 0;
    let matchedPatterns = 0;

    const patternsToUse = [...this.patterns, ...(options.customPatterns ?? [])];

    for (const pattern of patternsToUse) {
      evaluatedPatterns += 1;
      const regex = withGlobalFlag(pattern.regex);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(value)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        const context = buildContext(value, start, end, request);
        const detectors = [`pattern:${pattern.id}`];
        const baseScore = pattern.confidence;
        const schemaBoost = request.schemaField?.piiHints?.includes(
          pattern.type,
        )
          ? 0.1
          : 0;
        const optionBoost = options.signalBoost?.[pattern.type] ?? 0;
        const labelBoost = this.getLabelBoost(context);
        const rawScore = clamp(
          baseScore + schemaBoost + optionBoost + labelBoost,
          0,
          1,
        );
        if (options.minimumConfidence && rawScore < options.minimumConfidence) {
          continue;
        }
        matchedPatterns += 1;
        entities.push({
          id: crypto.randomUUID(),
          type: pattern.type,
          value: match[0],
          start,
          end,
          detectors,
          confidence: rawScore,
          context,
          rawScore,
          metadata: {
            patternId: pattern.id,
            groups: match.slice(1),
          },
        });
      }
    }

    let mlDecisions = 0;
    if (this.mlDetectors.length > 0) {
      const context = buildContext(value, 0, value.length, request);
      for (const detector of this.mlDetectors) {
        const results = await detector.detect(value, context);
        for (const result of results) {
          const entity: EntityMatch = {
            id: crypto.randomUUID(),
            type: result.type,
            value: result.value,
            start: value.indexOf(result.value),
            end: value.indexOf(result.value) + result.value.length,
            detectors: [`ml:${detector.id}`],
            confidence: clamp(result.confidence, 0, 1),
            context,
            rawScore: clamp(result.rawScore, 0, 1),
            metadata: result.metadata,
          };
          if (
            !options.minimumConfidence ||
            entity.confidence >= options.minimumConfidence
          ) {
            entities.push(entity);
            mlDecisions += 1;
          }
        }
      }
    }

    const durationMs = performance.now() - startTime;

    return {
      entities,
      stats: {
        evaluatedPatterns,
        matchedPatterns,
        mlDecisions,
        durationMs,
      },
    };
  }

  private getLabelBoost(context: ClassificationContext): number {
    const normalized =
      `${context.schemaField ?? ''} ${context.schemaDescription ?? ''}`.toLowerCase();
    const boosts: Record<string, number> = {
      name: 0.05,
      address: 0.08,
      phone: 0.07,
      email: 0.08,
      ssn: 0.1,
      passport: 0.08,
      license: 0.07,
      patient: 0.08,
      medical: 0.05,
      card: 0.08,
      bank: 0.07,
      geo: 0.05,
    };

    let boost = 0;
    for (const [token, value] of Object.entries(boosts)) {
      if (normalized.includes(token)) {
        boost += value;
      }
    }
    return clamp(boost, 0, 0.2);
  }
}
