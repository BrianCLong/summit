import { ArtifactConfig, ValidationResult } from '../types.js';

export function validateErrorTrace(
  artifact: ArtifactConfig,
  rawContent: string
): ValidationResult {
  try {
    const parsed = JSON.parse(rawContent) as Record<string, unknown>;
    const requiredFields = ['service', 'error', 'stack', 'timestamp'];

    const missing = requiredFields.filter((field) => typeof parsed[field] !== 'string');
    if (missing.length > 0) {
      return {
        status: 'failed',
        validator: 'ErrorTraceValidator',
        details: [`missing fields: ${missing.join(', ')}`]
      };
    }

    const stackLines = (parsed.stack as string).split('\n').length;

    return {
      status: 'passed',
      validator: 'ErrorTraceValidator',
      details: [`error type: ${(parsed.error as string).slice(0, 80)}`, `stack lines: ${stackLines}`],
      metadata: {
        service: parsed.service,
        timestamp: parsed.timestamp,
        stackLines
      }
    };
  } catch (error) {
    return {
      status: 'failed',
      validator: 'ErrorTraceValidator',
      details: [(error as Error).message]
    };
  }
}
