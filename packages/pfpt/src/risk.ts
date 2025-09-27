import { DiffChange, RedactedSpan, RiskAnnotation, RiskLevel } from './types.js';
import { HASH_PREFIX, HASH_SUFFIX } from './utils.js';

const RISK_ORDER: RiskLevel[] = ['low', 'medium', 'high'];

function promoteRisk(current: RiskLevel, candidate: RiskLevel): RiskLevel {
  return RISK_ORDER.indexOf(candidate) > RISK_ORDER.indexOf(current) ? candidate : current;
}

function extractTokens(value: string): string[] {
  const tokens: string[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    const start = value.indexOf(HASH_PREFIX, cursor);
    if (start === -1) {
      break;
    }

    const end = value.indexOf(HASH_SUFFIX, start + HASH_PREFIX.length);
    if (end === -1) {
      break;
    }

    const inner = value.slice(start + HASH_PREFIX.length, end);
    tokens.push(inner);
    cursor = end + HASH_SUFFIX.length;
  }

  return tokens;
}

function describeLabel(token: string, redactions: RedactedSpan[]): string {
  const [label, hash] = token.split('#');
  const span = redactions.find((entry) => entry.hash === hash);
  if (span) {
    return `${span.label}#${span.hash}`;
  }
  return token;
}

export function buildRiskSummary(
  changes: DiffChange[],
  redactions: RedactedSpan[],
): { level: RiskLevel; annotations: RiskAnnotation[] } {
  const annotations: RiskAnnotation[] = [];
  let level: RiskLevel = 'low';

  for (const change of changes) {
    if (change.type !== 'add') {
      continue;
    }

    const hashedTokens = extractTokens(change.value);
    if (hashedTokens.length > 0) {
      const descriptions = hashedTokens.map((token) => describeLabel(token, redactions));
      annotations.push({
        level: 'medium',
        code: 'new-sensitive-span',
        message: `New sensitive content added (${descriptions.join(', ')}).`,
      });
      level = promoteRisk(level, 'medium');

      if (descriptions.some((desc) => desc.startsWith('SSN') || desc.startsWith('CARD'))) {
        annotations.push({
          level: 'high',
          code: 'high-risk-sensitive',
          message: 'High sensitivity redaction detected in additions.',
        });
        level = promoteRisk(level, 'high');
      }
    } else if (change.value.replace(/\s+/g, '').length > 240) {
      annotations.push({
        level: 'medium',
        code: 'large-change',
        message: 'Large semantic addition detected.',
      });
      level = promoteRisk(level, 'medium');
    } else if (change.value.replace(/\s+/g, '').length > 0) {
      annotations.push({
        level: 'low',
        code: 'semantic-change',
        message: 'Semantic addition detected.',
      });
      level = promoteRisk(level, 'low');
    }
  }

  if (annotations.length === 0) {
    annotations.push({
      level: 'low',
      code: 'no-change',
      message: 'No semantic changes detected.',
    });
  }

  return { level, annotations };
}
