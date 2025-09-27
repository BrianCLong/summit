import { PromptInput, PromptSegment } from './types.js';
import { stableStringify } from './utils.js';

function isPromptSegment(value: unknown): value is PromptSegment {
  return (
    typeof value === 'object' &&
    value !== null &&
    'content' in value &&
    typeof (value as PromptSegment).content === 'string'
  );
}

function renderSegment(segment: PromptSegment, index: number): string {
  const lines: string[] = [];
  const role = segment.role ? segment.role : `segment-${index + 1}`;
  lines.push(`[${role}]`);
  lines.push(segment.content);
  if (segment.metadata && Object.keys(segment.metadata).length > 0) {
    lines.push('metadata:');
    lines.push(stableStringify(segment.metadata));
  }
  return lines.join('\n');
}

export function renderPrompt(input: PromptInput | unknown): string {
  if (typeof input === 'string') {
    return input;
  }

  if (isPromptSegment(input)) {
    return renderSegment(input, 0);
  }

  if (Array.isArray(input)) {
    return input
      .map((entry, index) =>
        isPromptSegment(entry) ? renderSegment(entry, index) : stableStringify(entry),
      )
      .join('\n---\n');
  }

  if (typeof input === 'object' && input !== null) {
    return stableStringify(input);
  }

  return String(input ?? '');
}
