import { CanonicalField } from '../ingest/canonical-schema.js';

export type PIISeverity = 'none' | 'moderate' | 'restricted';

export interface PIIFlag {
  field: string;
  severity: PIISeverity;
  reasons: string[];
  category?: string;
  blocked?: boolean;
  presets: RedactionPreset[];
}

export interface RedactionPreset {
  id: 'mask' | 'hash' | 'drop' | 'truncate';
  label: string;
  description: string;
  appliesTo: Array<'moderate' | 'restricted'>;
}

const REDACTION_PRESETS: RedactionPreset[] = [
  {
    id: 'mask',
    label: 'Mask characters',
    description: 'Replace characters with a consistent mask (****).',
    appliesTo: ['moderate'],
  },
  {
    id: 'hash',
    label: 'Deterministic hash',
    description: 'Hash the value for joining without exposing the raw data.',
    appliesTo: ['moderate', 'restricted'],
  },
  {
    id: 'truncate',
    label: 'Truncate to last four',
    description: 'Keep only the last four characters for diagnostics.',
    appliesTo: ['moderate'],
  },
  {
    id: 'drop',
    label: 'Drop column',
    description: 'Exclude the field entirely from ingest.',
    appliesTo: ['restricted'],
  },
];

export class PIIGuard {
  classify(fieldName: string, sampleValues: string[], canonicalField?: CanonicalField): PIIFlag | null {
    const normalized = fieldName.toLowerCase();
    const reasons: string[] = [];
    let severity: PIISeverity = 'none';
    let category: string | undefined;

    const push = (reason: string, level: PIISeverity, detectedCategory?: string) => {
      reasons.push(reason);
      if (level === 'restricted' || (level === 'moderate' && severity === 'none')) {
        severity = level;
      }
      if (detectedCategory) {
        category = detectedCategory;
      }
    };

    // Synonym / canonical hints
    if (canonicalField?.piiCategory && canonicalField.policies?.some((p) => p.startsWith('pii:'))) {
      const policyLevel = canonicalField.policies.find((p) => p.startsWith('pii:'))?.split(':')[1];
      if (policyLevel === 'restricted') {
        push(`Canonical policy marks ${canonicalField.label} as restricted`, 'restricted', canonicalField.piiCategory);
      } else if (policyLevel === 'moderate') {
        push(`Canonical policy marks ${canonicalField.label} as moderate`, 'moderate', canonicalField.piiCategory);
      }
    }

    // Heuristics based on field name
    if (/(email|mail)/.test(normalized)) {
      push('Field name looks like an email address column', 'moderate', 'contact');
    }
    if (/(phone|mobile|tel)/.test(normalized)) {
      push('Field name indicates phone numbers', 'moderate', 'contact');
    }
    if (/(ssn|social|tax|national)/.test(normalized)) {
      push('Field name references government identifiers', 'restricted', 'identifier');
    }
    if (/(address|city|location)/.test(normalized)) {
      push('Field name references a location', 'moderate', 'location');
    }

    // Value based heuristics
    for (const value of sampleValues) {
      if (!value) continue;
      if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value)) {
        push('Sample value matches email pattern', 'moderate', 'contact');
      }
      if (/(\d[ -]?){9,}/.test(value) && value.replace(/\D/g, '').length >= 9) {
        push('Sample value looks like a national identifier', 'restricted', 'identifier');
      }
      if (/\+?\d{1,2}[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/.test(value)) {
        push('Sample value matches phone pattern', 'moderate', 'contact');
      }
    }

    if (severity === 'none') {
      return null;
    }

    const applicableLevels: Array<'moderate' | 'restricted'> =
      severity === 'restricted'
        ? ['restricted']
        : severity === 'moderate'
          ? ['moderate']
          : [];
    const presets = REDACTION_PRESETS.filter((preset) =>
      applicableLevels.some((level) => preset.appliesTo.includes(level)),
    );

    return {
      field: fieldName,
      severity,
      reasons: Array.from(new Set(reasons)),
      category,
      blocked: severity === 'restricted',
      presets,
    };
  }

  applyPreset(value: unknown, presetId: RedactionPreset['id']): unknown {
    if (value === null || value === undefined) return value;
    const strValue = String(value);

    switch (presetId) {
      case 'mask':
        return '*'.repeat(Math.min(strValue.length, 8)) || '****';
      case 'hash':
        return this.simpleHash(strValue);
      case 'truncate':
        return strValue.slice(-4).padStart(strValue.length, '*');
      case 'drop':
        return undefined;
      default:
        return value;
    }
  }

  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return `h${Math.abs(hash).toString(16)}`;
  }
}

export const redactionPresets = REDACTION_PRESETS;
