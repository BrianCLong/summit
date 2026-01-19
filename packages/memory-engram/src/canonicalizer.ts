export type UnicodeNormalizationForm =
  | 'NFC'
  | 'NFD'
  | 'NFKC'
  | 'NFKD';

export interface CanonicalizerRule {
  pattern: RegExp;
  replacement: string;
}

export interface CanonicalizerOptions {
  normalization?: UnicodeNormalizationForm;
  lowercase?: boolean;
  trim?: boolean;
  collapseWhitespace?: boolean;
  rules?: CanonicalizerRule[];
}

const DEFAULT_OPTIONS: Required<CanonicalizerOptions> = {
  normalization: 'NFKC',
  lowercase: true,
  trim: true,
  collapseWhitespace: true,
  rules: [],
};

export class Canonicalizer {
  private readonly options: Required<CanonicalizerOptions>;

  constructor(options: CanonicalizerOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      rules: options.rules ?? DEFAULT_OPTIONS.rules,
    };
  }

  normalize(text: string): string {
    let value = text.normalize(this.options.normalization);

    for (const rule of this.options.rules) {
      value = value.replace(rule.pattern, rule.replacement);
    }

    if (this.options.lowercase) {
      value = value.toLowerCase();
    }

    if (this.options.collapseWhitespace) {
      value = value.replace(/\s+/g, ' ');
    }

    if (this.options.trim) {
      value = value.trim();
    }

    return value;
  }

  tokenize(text: string): string[] {
    const normalized = this.normalize(text);
    if (!normalized) {
      return [];
    }
    return normalized.split(' ').filter(Boolean);
  }
}
