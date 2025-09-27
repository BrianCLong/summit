import { ArtifactConfig, ValidationResult } from '../types.js';

const ISO_8601 = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export function validateLog(artifact: ArtifactConfig, rawContent: string): ValidationResult {
  const lines = rawContent.split(/\r?\n/).filter(Boolean);
  const details: string[] = [];

  if (lines.length === 0) {
    return {
      status: 'failed',
      validator: 'LogValidator',
      details: ['log artifact is empty']
    };
  }

  const timestamped = lines.filter((line) => ISO_8601.test(line)).length;
  if (timestamped === 0) {
    details.push('no ISO 8601 timestamps detected; ensure logs capture event chronology');
  } else {
    details.push(`detected ${timestamped} lines with ISO 8601 timestamps`);
  }

  return {
    status: 'passed',
    validator: 'LogValidator',
    details,
    metadata: {
      lines: lines.length,
      timestamped
    }
  };
}
