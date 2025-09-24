import { performance } from 'node:perf_hooks';
import { CANONICAL_ENTITIES, CanonicalEntity, CanonicalField, findCanonicalEntity, findCanonicalFieldById } from './canonical-schema.js';
import { PIIGuard, PIIFlag, redactionPresets, RedactionPreset } from '../redaction/piiGuard.js';

export type IngestSampleFormat = 'csv' | 'json';

export interface AnalyzeSampleInput {
  sample: string | Record<string, unknown>[];
  format: IngestSampleFormat;
  canonicalEntityId?: string;
  sampleLimit?: number;
}

export interface FieldAnalysis {
  sourceField: string;
  inferredType: 'string' | 'number' | 'boolean' | 'date';
  confidence: number;
  sampleValues: string[];
  recommendedCanonical?: string;
  pii?: PIIFlag | null;
  blocked: boolean;
  blockedReasons: string[];
  lineage: FieldLineage;
}

export interface FieldLineage {
  sourceField: string;
  transforms: string[];
  policyTags: string[];
}

export interface AnalyzeSampleResult {
  entity: CanonicalEntity;
  totalRows: number;
  samplePreview: Record<string, unknown>[];
  fieldAnalyses: FieldAnalysis[];
  suggestedMappings: Record<string, string>;
  requiredFieldIssues: string[];
  piiFlags: PIIFlag[];
  redactionPresets: RedactionPreset[];
  estimatedCompletionMinutes: number;
  licenses: LicenseDefinition[];
  coverage: {
    required: {
      total: number;
      satisfied: number;
      missing: string[];
    };
    mappedFields: number;
    totalFields: number;
  };
  confidenceScore: number;
  warnings: string[];
  mappingConfidence: {
    high: number;
    medium: number;
    low: number;
  };
  unmappedSourceFields: Array<{ field: string; reason: string }>;
  dataQuality: DataQualitySummary;
  analysisDurationMs: number;
}

export interface DataQualitySummary {
  rowCount: number;
  averageCompleteness: number;
  emptyFieldRatios: Array<{ field: string; emptyPercentage: number }>;
  issues: string[];
}

export interface BuildSpecInput {
  sample: string | Record<string, unknown>[];
  format: IngestSampleFormat;
  entityId: string;
  mappings: Record<string, string>;
  piiDecisions?: Record<string, { preset: RedactionPreset['id'] | 'none' }>; // keyed by canonical field id
  licenseId?: string;
  sampleLimit?: number;
}

export interface TransformSpecField {
  canonicalField: string;
  sourceField: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  lineage: FieldLineage;
  pii?: {
    severity: PIIFlag['severity'];
    reasons: string[];
    redaction?: RedactionPreset['id'] | 'none';
  };
}

export interface TransformSpec {
  version: string;
  createdAt: string;
  format: IngestSampleFormat;
  entity: string;
  fields: TransformSpecField[];
  policies: {
    license?: string;
  };
  notes: {
    requiredFieldIssues: string[];
    warnings: string[];
  };
}

export interface DryRunResult {
  spec: TransformSpec;
  previewRows: Record<string, unknown>[];
}

interface ParsedSample {
  rows: Record<string, unknown>[];
  headers: string[];
}

interface LicenseDefinition {
  id: string;
  label: string;
  allowsRestrictedPII: boolean;
  requiresAcceptance: boolean;
  notes: string;
}

interface LicenseEvaluationInput {
  licenseId: string;
  accepted: boolean;
  piiFlags: PIIFlag[];
}

interface LicenseEvaluationResult {
  allowed: boolean;
  issues: string[];
  license?: LicenseDefinition;
}

const LICENSES: LicenseDefinition[] = [
  {
    id: 'internal-research',
    label: 'Internal Research Only',
    allowsRestrictedPII: false,
    requiresAcceptance: true,
    notes: 'Restricted to non-production research workloads. Restricted PII must be removed or redacted.',
  },
  {
    id: 'partner-data-share',
    label: 'Partner Data Share (DPA enforced)',
    allowsRestrictedPII: true,
    requiresAcceptance: true,
    notes: 'Requires signed data processing agreement. Restricted PII allowed with redaction or hashing.',
  },
  {
    id: 'public-domain',
    label: 'Public Domain / Open Data',
    allowsRestrictedPII: false,
    requiresAcceptance: false,
    notes: 'Intended for data licensed for unrestricted public use. PII should not be present.',
  },
];

export class ETLAssistant {
  private readonly piiGuard = new PIIGuard();

  async analyzeSample(input: AnalyzeSampleInput): Promise<AnalyzeSampleResult> {
    const startedAt = performance.now();
    const entity = this.resolveEntity(input.canonicalEntityId);
    const parsed = this.parseSample(input.sample, input.format, input.sampleLimit ?? 200);
    const fieldAnalyses = this.analyzeFields(parsed, entity);
    const suggestedMappings = this.buildSuggestedMappings(fieldAnalyses, entity);
    const requiredFieldIssues = this.validateRequiredFields(entity, suggestedMappings, { suppressErrors: true });
    const piiFlags = fieldAnalyses.flatMap((analysis) => (analysis.pii ? [analysis.pii] : []));
    const coverage = this.summarizeCoverage(entity, suggestedMappings, requiredFieldIssues);
    const dataQuality = this.assessDataQuality(parsed, fieldAnalyses);
    const mappingConfidence = fieldAnalyses.reduce(
      (acc, field) => {
        if (field.confidence >= 0.8) {
          acc.high += 1;
        } else if (field.confidence >= 0.6) {
          acc.medium += 1;
        } else {
          acc.low += 1;
        }
        return acc;
      },
      { high: 0, medium: 0, low: 0 },
    );
    const unmappedSourceFields = fieldAnalyses
      .filter((analysis) => !analysis.recommendedCanonical || analysis.confidence < 0.6)
      .map((analysis) => ({
        field: analysis.sourceField,
        reason: !analysis.recommendedCanonical
          ? 'No close canonical match detected'
          : 'Low confidence suggestion—review before mapping',
      }));
    const confidenceScore =
      fieldAnalyses.length === 0
        ? 0
        : Number(
            (
              fieldAnalyses.reduce((total, field) => total + field.confidence, 0) /
              fieldAnalyses.length
            ).toFixed(2),
          );
    const warnings: string[] = [];
    if (requiredFieldIssues.length > 0) {
      warnings.push(
        `Missing mappings for required fields: ${requiredFieldIssues
          .map((issue) => issue.replace(/ is required$/, ''))
          .join(', ')}`,
      );
    }
    if (coverage.mappedFields < coverage.totalFields) {
      warnings.push(
        `Only ${coverage.mappedFields} of ${coverage.totalFields} canonical fields are mapped. Review optional fields before dry-run.`,
      );
    }
    if (unmappedSourceFields.length > 0) {
      warnings.push(
        `The assistant could not map ${unmappedSourceFields.length} source ${
          unmappedSourceFields.length === 1 ? 'column' : 'columns'
        }. Review them manually.`,
      );
    }
    if (mappingConfidence.low > 0) {
      warnings.push(
        `${mappingConfidence.low} field ${mappingConfidence.low === 1 ? 'suggestion has' : 'suggestions have'} low confidence. Validate mappings manually.`,
      );
    }
    if (dataQuality.issues.length > 0) {
      warnings.push(...dataQuality.issues.map((issue) => `Data quality: ${issue}`));
    }
    const analysisDurationMs = Math.max(1, Math.round(performance.now() - startedAt));

    return {
      entity,
      totalRows: parsed.rows.length,
      samplePreview: parsed.rows.slice(0, 5),
      fieldAnalyses,
      suggestedMappings,
      requiredFieldIssues,
      piiFlags,
      redactionPresets,
      estimatedCompletionMinutes: this.estimateCompletionMinutes(parsed.rows.length, dataQuality.issues.length),
      licenses: this.getSupportedLicenses(),
      coverage,
      confidenceScore,
      warnings,
      mappingConfidence,
      unmappedSourceFields,
      dataQuality,
      analysisDurationMs,
    };
  }

  async buildTransformSpec(input: BuildSpecInput): Promise<TransformSpec> {
    const entity = this.resolveEntity(input.entityId);
    const analysis = await this.analyzeSample({
      sample: input.sample,
      format: input.format,
      canonicalEntityId: input.entityId,
      sampleLimit: input.sampleLimit ?? 200,
    });

    const requiredFieldIssues = this.validateRequiredFields(entity, input.mappings);
    const warnings: string[] = [];
    let selectedLicense: LicenseDefinition | undefined;
    if (input.licenseId) {
      selectedLicense = this.getLicenseDefinition(input.licenseId);
      if (!selectedLicense) {
        warnings.push(`Unknown license selected: ${input.licenseId}`);
      }
    }

    const fields: TransformSpecField[] = Object.entries(input.mappings).map(([canonicalFieldId, sourceField]) => {
      const canonical = findCanonicalFieldById(canonicalFieldId);
      if (!canonical) {
        warnings.push(`Unknown canonical field: ${canonicalFieldId}`);
      }
      const fieldAnalysis = analysis.fieldAnalyses.find((f) => f.sourceField === sourceField);
      const piiDecision = input.piiDecisions?.[canonicalFieldId];
      const pii = fieldAnalysis?.pii
        ? {
            severity: fieldAnalysis.pii.severity,
            reasons: fieldAnalysis.pii.reasons,
            redaction: piiDecision?.preset ?? 'none',
          }
        : undefined;

      return {
        canonicalField: canonicalFieldId,
        sourceField,
        type: fieldAnalysis?.inferredType ?? 'string',
        lineage: fieldAnalysis?.lineage ?? {
          sourceField,
          transforms: [],
          policyTags: canonical?.policies ?? [],
        },
        pii,
      };
    });

    return {
      version: '1.0',
      createdAt: new Date().toISOString(),
      format: input.format,
      entity: entity.id,
      fields,
      policies: {
        license: selectedLicense ? `${selectedLicense.id} (${selectedLicense.label})` : input.licenseId,
      },
      notes: {
        requiredFieldIssues,
        warnings: Array.from(new Set(warnings)),
      },
    };
  }

  async runDryRun(spec: TransformSpec, sample: string | Record<string, unknown>[], format: IngestSampleFormat, piiDecisions?: BuildSpecInput['piiDecisions']): Promise<DryRunResult> {
    const parsed = this.parseSample(sample, format, 25);
    const previewRows = parsed.rows.slice(0, 5).map((row) => {
      const output: Record<string, unknown> = {};
      for (const field of spec.fields) {
        const rawValue = row[field.sourceField];
        const decision = piiDecisions?.[field.canonicalField];
        let transformed: unknown = rawValue;
        if (field.pii && decision?.preset && decision.preset !== 'none') {
          transformed = this.piiGuard.applyPreset(rawValue, decision.preset);
        }
        if (decision?.preset === 'drop') {
          continue; // do not include field if dropped
        }
        output[field.canonicalField] = transformed;
        output[`${field.canonicalField}__lineage`] = {
          source: field.sourceField,
          transforms: field.lineage.transforms,
          policies: field.lineage.policyTags,
        };
      }
      return output;
    });

    return { spec, previewRows };
  }

  evaluateLicense(input: LicenseEvaluationInput): LicenseEvaluationResult {
    const license = LICENSES.find((candidate) => candidate.id === input.licenseId);
    if (!license) {
      return { allowed: false, issues: ['Unknown license selected'] };
    }

    const issues: string[] = [];
    const hasRestrictedPII = input.piiFlags.some((flag) => flag.severity === 'restricted');
    if (hasRestrictedPII && !license.allowsRestrictedPII) {
      issues.push('Selected license does not allow restricted PII. Choose partner-data-share or drop restricted columns.');
    }

    if (license.requiresAcceptance && !input.accepted) {
      issues.push('License terms must be accepted before ingest.');
    }

    return {
      allowed: issues.length === 0,
      issues,
      license,
    };
  }

  getSupportedLicenses(): LicenseDefinition[] {
    return LICENSES;
  }

  getMetadata(): {
    entities: Array<{
      id: string;
      label: string;
      description: string;
      requiredFields: string[];
    }>;
    redactionPresets: RedactionPreset[];
    licenses: LicenseDefinition[];
  } {
    return {
      entities: CANONICAL_ENTITIES.map((entity) => ({
        id: entity.id,
        label: entity.label,
        description: entity.description,
        requiredFields: entity.fields.filter((field) => field.required).map((field) => field.id),
      })),
      redactionPresets,
      licenses: this.getSupportedLicenses(),
    };
  }

  private analyzeFields(parsed: ParsedSample, entity: CanonicalEntity): FieldAnalysis[] {
    return parsed.headers.map((header) => {
      const sampleValues = parsed.rows.slice(0, 5).map((row) => this.valueToString(row[header]));
      const inferredType = this.inferType(sampleValues);
      const match = this.findBestCanonicalMatch(header, entity);
      const canonicalFieldId = match?.fieldId;
      const canonicalField = canonicalFieldId ? findCanonicalFieldById(canonicalFieldId) : undefined;
      let confidence = match ? match.score : 0;
      if (canonicalField && canonicalField.type !== inferredType) {
        confidence = Math.max(0, confidence - 0.2);
      }
      confidence = Number(confidence.toFixed(2));
      const pii = this.piiGuard.classify(header, sampleValues, canonicalField ?? undefined);

      return {
        sourceField: header,
        inferredType,
        confidence,
        sampleValues,
        recommendedCanonical: canonicalFieldId ?? undefined,
        pii,
        blocked: pii?.blocked ?? false,
        blockedReasons: pii?.blocked ? [...pii.reasons, 'Policy requires redaction or removal before ingest'] : [],
        lineage: {
          sourceField: header,
          transforms: pii?.blocked ? ['redaction-required'] : [],
          policyTags: canonicalField?.policies ?? [],
        },
      };
    });
  }

  private buildSuggestedMappings(fieldAnalyses: FieldAnalysis[], entity: CanonicalEntity): Record<string, string> {
    const mappings: Record<string, string> = {};
    for (const field of fieldAnalyses) {
      if (!field.recommendedCanonical) continue;
      const canonical = findCanonicalFieldById(field.recommendedCanonical);
      if (!canonical) continue;
      if (!mappings[canonical.id]) {
        mappings[canonical.id] = field.sourceField;
      }
    }

    // Ensure required fields have placeholders even if not mapped
    for (const field of entity.fields.filter((f) => f.required)) {
      if (!mappings[field.id]) {
        const candidate = fieldAnalyses.find((analysis) => this.normalize(analysis.sourceField).includes(this.normalize(field.label)));
        if (candidate) {
          mappings[field.id] = candidate.sourceField;
        }
      }
    }

    return mappings;
  }

  private validateRequiredFields(entity: CanonicalEntity, mappings: Record<string, string>, options?: { suppressErrors?: boolean }): string[] {
    const missing = entity.fields
      .filter((field) => field.required)
      .filter((field) => !mappings[field.id])
      .map((field) => `${field.label} (${field.id}) is required`);

    if (missing.length > 0 && !options?.suppressErrors) {
      throw new Error(`Missing required mappings: ${missing.join(', ')}`);
    }

    return missing;
  }

  private summarizeCoverage(
    entity: CanonicalEntity,
    mappings: Record<string, string>,
    missingRequired: string[],
  ): AnalyzeSampleResult['coverage'] {
    const totalFields = entity.fields.length;
    const mappedFields = Object.values(mappings).filter(Boolean).length;
    const requiredTotal = entity.fields.filter((field) => field.required).length;
    const satisfied = requiredTotal - missingRequired.length;

    return {
      required: {
        total: requiredTotal,
        satisfied: Math.max(0, satisfied),
        missing: missingRequired.map((issue) => issue.replace(/ \([^)]+\) is required$/, '')),
      },
      mappedFields,
      totalFields,
    };
  }

  private assessDataQuality(parsed: ParsedSample, fieldAnalyses: FieldAnalysis[]): DataQualitySummary {
    const rowCount = parsed.rows.length;
    if (parsed.headers.length === 0) {
      return {
        rowCount,
        averageCompleteness: rowCount === 0 ? 0 : 1,
        emptyFieldRatios: [],
        issues: rowCount === 0 ? ['Sample contains no rows to analyze.'] : [],
      };
    }

    const emptyFieldRatios = parsed.headers.map((header) => {
      const emptyCount = parsed.rows.reduce((count, row) => {
        const value = row[header];
        return count + (value === null || value === undefined || value === '' ? 1 : 0);
      }, 0);
      const emptyPercentage = rowCount === 0 ? 0 : Number(((emptyCount / rowCount) * 100).toFixed(1));
      return { field: header, emptyPercentage };
    });

    emptyFieldRatios.sort((a, b) => b.emptyPercentage - a.emptyPercentage);

    const completenessRatio =
      emptyFieldRatios.reduce((sum, entry) => sum + (100 - entry.emptyPercentage), 0) /
      (parsed.headers.length * 100);
    const averageCompleteness = Number(completenessRatio.toFixed(2));

    const issues: string[] = [];
    if (rowCount === 0) {
      issues.push('Sample contains no rows to analyze.');
    }
    if (averageCompleteness < 0.75) {
      issues.push('Average field completeness below 75%. Fill in missing values or confirm optional fields.');
    }
    for (const entry of emptyFieldRatios.slice(0, 3)) {
      if (entry.emptyPercentage >= 60) {
        issues.push(`${entry.field} is ${entry.emptyPercentage}% empty.`);
      }
    }
    const blockedFields = fieldAnalyses.filter((analysis) => analysis.blocked);
    if (blockedFields.length > 0) {
      issues.push(
        `Restricted PII detected in ${blockedFields.length} field${blockedFields.length === 1 ? '' : 's'} requiring redaction.`,
      );
    }

    return {
      rowCount,
      averageCompleteness,
      emptyFieldRatios,
      issues,
    };
  }

  private estimateCompletionMinutes(rowCount: number, qualityIssueCount: number): number {
    const base = Math.min(9, Math.max(3, Math.ceil(rowCount / 500) + 3));
    const penalty = Math.min(2, qualityIssueCount);
    return Math.min(10, base + penalty);
  }

  private parseSample(sample: string | Record<string, unknown>[], format: IngestSampleFormat, limit: number): ParsedSample {
    if (Array.isArray(sample)) {
      const rows = sample.slice(0, limit).map((item) => ({ ...item }));
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      return { rows, headers };
    }

    if (format === 'json') {
      const parsed = JSON.parse(sample);
      if (!Array.isArray(parsed)) {
        throw new Error('JSON sample must be an array of objects');
      }
      const rows = parsed.slice(0, limit);
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      return { rows, headers };
    }

    // csv fallback
    const lines = sample
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return { rows: [], headers: [] };
    }

    const headers = this.parseCsvLine(lines[0]);
    const rows = lines.slice(1, limit + 1).map((line) => {
      const values = this.parseCsvLine(line);
      const row: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ?? '';
      });
      return row;
    });

    return { rows, headers };
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  }

  private inferType(values: string[]): FieldAnalysis['inferredType'] {
    const cleaned = values.filter((value) => value !== undefined && value !== null && value !== '');
    if (cleaned.length === 0) {
      return 'string';
    }

    const allNumbers = cleaned.every((value) => !Number.isNaN(Number(value)));
    if (allNumbers) return 'number';

    const allBooleans = cleaned.every((value) => ['true', 'false', 'yes', 'no'].includes(value.toLowerCase()));
    if (allBooleans) return 'boolean';

    const allDates = cleaned.every((value) => !Number.isNaN(Date.parse(value)));
    if (allDates) return 'date';

    return 'string';
  }

  private findBestCanonicalMatch(
    fieldName: string,
    entity: CanonicalEntity,
  ): { fieldId: string; score: number } | null {
    const normalized = this.normalize(fieldName);
    let bestScore = 0;
    let bestField: CanonicalField | null = null;

    for (const field of entity.fields) {
      const candidates = new Set<string>([field.label, ...field.synonyms]);
      for (const synonym of candidates) {
        const score = this.computeSimilarity(normalized, this.normalize(synonym));
        if (score > bestScore) {
          bestScore = score;
          bestField = field;
        }
      }
    }

    return bestScore >= 0.5 && bestField ? { fieldId: bestField.id, score: Number(bestScore.toFixed(2)) } : null;
  }

  private computeSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (!a || !b) return 0;
    if (a.includes(b) || b.includes(a)) {
      return Math.min(a.length, b.length) / Math.max(a.length, b.length);
    }

    let matches = 0;
    for (const char of a) {
      if (b.includes(char)) {
        matches++;
      }
    }
    return matches / Math.max(a.length, b.length);
  }

  private normalize(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private resolveEntity(entityId?: string): CanonicalEntity {
    if (entityId) {
      const entity = findCanonicalEntity(entityId);
      if (entity) return entity;
    }
    return CANONICAL_ENTITIES[0];
  }

  private valueToString(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
  }

  private getLicenseDefinition(licenseId: string): LicenseDefinition | undefined {
    return LICENSES.find((candidate) => candidate.id === licenseId);
  }
}
