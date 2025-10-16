import { HybridEntityRecognizer } from './recognizer.js';
import { DEFAULT_TAXONOMY_NAME, TaxonomyManager } from './taxonomy.js';
import {
  ClassifiedEntity,
  ClassificationResult,
  EntityMatch,
  RecognitionOptions,
  RecognitionRequest,
  SchemaFieldMetadata,
  SchemaMetadata,
  SeverityLevel,
} from './types.js';

const SEVERITY_ORDER: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];

const degradeSeverity = (
  level: SeverityLevel,
  steps: number,
): SeverityLevel => {
  const idx = Math.max(0, SEVERITY_ORDER.indexOf(level) - steps);
  return SEVERITY_ORDER[idx];
};

const upgradeSeverity = (
  level: SeverityLevel,
  steps: number,
): SeverityLevel => {
  const idx = Math.min(
    SEVERITY_ORDER.length - 1,
    SEVERITY_ORDER.indexOf(level) + steps,
  );
  return SEVERITY_ORDER[idx];
};

const contextualKeywords: Record<string, string[]> = {
  socialSecurityNumber: ['ssn', 'social', 'security'],
  passportNumber: ['passport'],
  driverLicenseNumber: ['driver', 'license', 'dl'],
  bankAccountNumber: ['account', 'bank', 'acct'],
  routingNumber: ['routing'],
  creditCardNumber: ['card', 'visa', 'mastercard', 'amex'],
  healthRecordNumber: ['health', 'ehr', 'record', 'mrn'],
  medicalDiagnosis: ['diagnosis', 'icd', 'condition'],
  prescription: ['rx', 'prescription', 'medication'],
  biometricDNA: ['dna', 'genetic'],
  ipAddress: ['ip'],
  macAddress: ['mac'],
  geoCoordinate: ['lat', 'lon', 'coordinate'],
  insurancePolicyNumber: ['policy', 'insurance'],
  dateOfBirth: ['dob', 'birth'],
};

const computeContextBoost = (
  entity: EntityMatch,
  schemaField?: SchemaFieldMetadata,
): number => {
  const around =
    `${entity.context.before} ${entity.context.after}`.toLowerCase();
  const schema =
    `${schemaField?.fieldName ?? ''} ${schemaField?.description ?? ''}`.toLowerCase();
  const tokens = new Set(`${around} ${schema}`.split(/[^a-z0-9]+/i));
  let boost = 0;
  for (const [type, keywords] of Object.entries(contextualKeywords)) {
    if (entity.type === type) {
      for (const keyword of keywords) {
        if (tokens.has(keyword)) {
          boost += 0.05;
        }
      }
    }
  }
  if (schemaField?.riskLevel) {
    boost +=
      schemaField.riskLevel === 'critical'
        ? 0.1
        : schemaField.riskLevel === 'high'
          ? 0.05
          : 0;
  }
  return Math.min(boost, 0.2);
};

const adjustSeverityByConfidence = (
  severity: SeverityLevel,
  confidence: number,
): SeverityLevel => {
  if (confidence >= 0.85) {
    return upgradeSeverity(severity, 0);
  }
  if (confidence >= 0.65) {
    return severity;
  }
  if (confidence >= 0.45) {
    return degradeSeverity(severity, 1);
  }
  return degradeSeverity(severity, 2);
};

export interface ClassificationOptions extends RecognitionOptions {
  taxonomyName?: string;
}

export class ClassificationEngine {
  constructor(
    private readonly recognizer = new HybridEntityRecognizer(),
    private readonly taxonomy = new TaxonomyManager(),
  ) {}

  async classify(
    value: string,
    request: RecognitionRequest,
    options: ClassificationOptions = {},
  ): Promise<ClassificationResult> {
    const taxonomyName = options.taxonomyName ?? DEFAULT_TAXONOMY_NAME;
    const recognition = await this.recognizer.recognize(
      { ...request, value },
      options,
    );
    const classified = recognition.entities.map((entity) =>
      this.classifyEntity(
        entity,
        request.schema,
        request.schemaField,
        taxonomyName,
      ),
    );
    const summary = this.buildSummary(classified);
    return {
      entities: classified,
      summary,
      stats: recognition.stats,
    };
  }

  private classifyEntity(
    entity: EntityMatch,
    schema: SchemaMetadata | undefined,
    schemaField: SchemaFieldMetadata | undefined,
    taxonomyName: string,
  ): ClassifiedEntity {
    const taxonomyEntry = this.taxonomy.classify(entity.type, taxonomyName);
    const baseSeverity = taxonomyEntry?.node.severity ?? 'medium';
    const contextBoost = computeContextBoost(entity, schemaField);
    const boostedConfidence = Math.min(1, entity.confidence + contextBoost);
    const severityFromConfidence = adjustSeverityByConfidence(
      baseSeverity,
      boostedConfidence,
    );
    const severity = schemaField?.riskLevel
      ? upgradeSeverity(
          severityFromConfidence,
          Math.max(
            0,
            SEVERITY_ORDER.indexOf(schemaField.riskLevel) -
              SEVERITY_ORDER.indexOf(severityFromConfidence),
          ),
        )
      : severityFromConfidence;

    return {
      ...entity,
      metadata: {
        ...entity.metadata,
        schemaName: schema?.name,
        schemaVersion: schema?.version,
      },
      confidence: boostedConfidence,
      severity,
      taxonomy: taxonomyEntry?.taxonomy ?? DEFAULT_TAXONOMY_NAME,
      categories: taxonomyEntry?.node.categories ?? ['uncategorized'],
      policyTags: taxonomyEntry?.node.policyTags ?? [],
    };
  }

  private buildSummary(
    entities: ClassifiedEntity[],
  ): ClassificationResult['summary'] {
    const summary = {
      totalEntities: entities.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      taxonomyBreakdown: {} as Record<string, number>,
    };

    for (const entity of entities) {
      summary[entity.severity] += 1;
      summary.taxonomyBreakdown[entity.taxonomy] =
        (summary.taxonomyBreakdown[entity.taxonomy] ?? 0) + 1;
    }

    return summary;
  }
}
