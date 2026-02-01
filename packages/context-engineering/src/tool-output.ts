import type { ToolOutputPolicy } from './types.js';
import { estimateTokens, stableStringify, truncateToTokenLimit } from './token.js';

function selectFields(
  output: Record<string, unknown>,
  allowed: string[],
): Record<string, unknown> {
  if (!allowed.length) return output;
  return allowed.reduce<Record<string, unknown>>((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(output, key)) {
      acc[key] = output[key];
    }
    return acc;
  }, {});
}

export function adaptToolOutput(
  output: unknown,
  policy: ToolOutputPolicy,
): { content: string; tokenCost: number } {
  let text = '';
  if (typeof output === 'string') {
    text = output;
  } else if (output && typeof output === 'object') {
    const filtered =
      policy.allowedFields && policy.allowedFields.length
        ? selectFields(output as Record<string, unknown>, policy.allowedFields)
        : output;
    text = stableStringify(filtered);
  } else {
    text = String(output ?? '');
  }
  if (policy.maxTokens) {
    text = truncateToTokenLimit(text, policy.maxTokens);
  }
  return { content: text, tokenCost: estimateTokens(text) };
}
