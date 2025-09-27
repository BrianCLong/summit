export interface DetectorFinding {
  type: string;
  match: string;
  confidence: number;
  position: number;
}

export interface Detector {
  detect(value: string): DetectorFinding[];
}

const DEFAULT_REGEX_PATTERNS: { type: string; regex: RegExp }[] = [
  { type: 'email', regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { type: 'phone', regex: /\b\+?\d{1,3}[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g },
  { type: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: 'credit-card', regex: /\b(?:\d[ -]*?){13,16}\b/g },
];

export class RegexDetector implements Detector {
  private readonly patterns: { type: string; regex: RegExp }[];

  constructor(patterns: { type: string; regex: RegExp }[] = DEFAULT_REGEX_PATTERNS) {
    this.patterns = patterns.map(({ type, regex }) => ({ type, regex: new RegExp(regex, 'g') }));
  }

  detect(value: string): DetectorFinding[] {
    const findings: DetectorFinding[] = [];
    for (const { type, regex } of this.patterns) {
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(value))) {
        findings.push({
          type,
          match: match[0],
          confidence: 0.9,
          position: match.index,
        });
      }
    }
    return findings;
  }
}

const PII_HINTS = [
  'ssn',
  'social security',
  'credit card',
  'password',
  'secret',
  'token',
  'passport',
  'bank',
  'iban',
];

export class EmbeddingDetectorStub implements Detector {
  detect(value: string): DetectorFinding[] {
    const lower = value.toLowerCase();
    const findings: DetectorFinding[] = [];
    for (const hint of PII_HINTS) {
      const index = lower.indexOf(hint);
      if (index !== -1) {
        findings.push({
          type: `semantic-${hint.replace(/\s+/g, '-')}`,
          match: value.substring(index, index + hint.length),
          confidence: 0.6,
          position: index,
        });
      }
    }
    return findings;
  }
}

export class CompositeDetector implements Detector {
  constructor(private readonly detectors: Detector[]) {}

  detect(value: string): DetectorFinding[] {
    return this.detectors.flatMap((detector) => detector.detect(value));
  }
}

export const defaultDetector = new CompositeDetector([
  new RegexDetector(),
  new EmbeddingDetectorStub(),
]);
