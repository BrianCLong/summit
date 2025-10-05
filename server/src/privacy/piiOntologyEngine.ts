import crypto from 'crypto';

export type PIICategory =
  | 'IDENTIFIER'
  | 'CONTACT'
  | 'FINANCIAL'
  | 'HEALTH'
  | 'LOCATION'
  | 'BIOMETRIC'
  | 'DEMOGRAPHIC'
  | 'AUTHENTICATION';

export type SensitivityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RegulatoryFramework = 'GDPR' | 'CCPA' | 'HIPAA';

export interface PatternDefinition {
  id: string;
  description: string;
  regex: RegExp;
  categories: PIICategory[];
  confidenceBoost?: number;
}

export interface TrainingSample {
  value: string;
  context: string;
  categories: PIICategory[];
}

export interface DataContext {
  system: string;
  field: string;
  collection?: string;
  description?: string;
  tags?: string[];
  owner?: string;
  retentionPolicy?: string;
  lineage?: {
    sourceSystem?: string;
    path?: string[];
    transformations?: string[];
  };
  accessControls?: string[];
}

export interface DataRecord {
  id: string;
  value: string;
  context: DataContext;
}

export interface PatternMatch {
  patternId: string;
  categories: PIICategory[];
  confidence: number;
  description: string;
}

export interface RegulatoryMapping {
  framework: RegulatoryFramework;
  references: string[];
  obligations: string[];
  categories: PIICategory[];
}

export interface LineageRecord {
  entityId: string;
  recordId: string;
  system: string;
  field: string;
  collection?: string;
  path: string[];
  transformations: string[];
  accessControls: string[];
}

export interface EnrichedMetadata {
  riskScore: number;
  sensitivity: SensitivityLevel;
  recommendedControls: string[];
  lineage: LineageRecord;
  stewardship: {
    owner?: string;
    retentionPolicy?: string;
    tags: string[];
  };
}

export interface PIIEntity {
  id: string;
  recordId: string;
  value: string;
  categories: PIICategory[];
  confidence: number;
  contextualScore: number;
  sensitivity: SensitivityLevel;
  patternMatches: PatternMatch[];
  regulatoryMappings: RegulatoryMapping[];
  metadata: EnrichedMetadata;
}

export interface ClassificationSummary {
  totalRecords: number;
  piiRecords: number;
  categories: Record<PIICategory, number>;
  frameworks: Record<RegulatoryFramework, number>;
}

export interface ComplianceValidationResult {
  framework: RegulatoryFramework;
  passed: boolean;
  missingCategories: PIICategory[];
  description: string;
}

export interface ClassificationReport {
  entities: PIIEntity[];
  summary: ClassificationSummary;
  regulatorySummary: Record<
    RegulatoryFramework,
    {
      entities: number;
      categories: PIICategory[];
      obligations: string[];
    }
  >;
  validations: ComplianceValidationResult[];
}

export interface PiiOntologyConfig {
  detectionThreshold?: number;
  contextualThreshold?: number;
  enrichment?: {
    highRiskThreshold?: number;
    criticalRiskThreshold?: number;
  };
}

interface FeatureVector {
  length: number;
  digitDensity: number;
  alphaDensity: number;
  specialCharDensity: number;
  uppercaseRatio: number;
  contextScore: number;
}

interface PatternAnalysis {
  probability: number;
  matches: PatternMatch[];
  features: FeatureVector;
}

class PatternDetector {
  private readonly patterns: PatternDefinition[] = [];
  private stats = {
    positive: {
      count: 0,
      digitDensity: 0,
      alphaDensity: 0,
      specialCharDensity: 0,
      uppercaseRatio: 0,
      length: 0,
      contextScore: 0
    },
    negative: {
      count: 0,
      digitDensity: 0,
      alphaDensity: 0,
      specialCharDensity: 0,
      uppercaseRatio: 0,
      length: 0,
      contextScore: 0
    }
  };

  registerPattern(pattern: PatternDefinition): void {
    this.patterns.push(pattern);
  }

  train(samples: TrainingSample[]): void {
    for (const sample of samples) {
      const features = this.extractFeatures(sample.value, sample.context);
      const bucket = sample.categories.length > 0 ? 'positive' : 'negative';
      this.stats[bucket].count += 1;
      this.stats[bucket].digitDensity += features.digitDensity;
      this.stats[bucket].alphaDensity += features.alphaDensity;
      this.stats[bucket].specialCharDensity += features.specialCharDensity;
      this.stats[bucket].uppercaseRatio += features.uppercaseRatio;
      this.stats[bucket].length += features.length;
      this.stats[bucket].contextScore += features.contextScore;
    }
  }

  analyze(record: DataRecord): PatternAnalysis {
    const features = this.extractFeatures(
      record.value,
      `${record.context.field} ${record.context.description ?? ''}`
    );

    const matches = this.patterns
      .map((pattern) => ({
        pattern,
        matched: new RegExp(pattern.regex.source, pattern.regex.flags).test(record.value)
      }))
      .filter((result) => result.matched)
      .map((result) => ({
        patternId: result.pattern.id,
        categories: result.pattern.categories,
        confidence: Math.min(1, 0.6 + (result.pattern.confidenceBoost ?? 0)),
        description: result.pattern.description
      }));

    const probability = this.calculateProbability(features);

    return { probability, matches, features };
  }

  private calculateProbability(features: FeatureVector): number {
    const positive = this.getAverage('positive');
    const negative = this.getAverage('negative');

    const weight = {
      digitDensity: positive.digitDensity - negative.digitDensity,
      alphaDensity: positive.alphaDensity - negative.alphaDensity,
      specialCharDensity: positive.specialCharDensity - negative.specialCharDensity,
      uppercaseRatio: positive.uppercaseRatio - negative.uppercaseRatio,
      length: positive.length - negative.length,
      contextScore: positive.contextScore - negative.contextScore
    };

    const bias = Math.log((this.stats.positive.count + 1) / (this.stats.negative.count + 1));

    const score =
      bias +
      weight.digitDensity * features.digitDensity +
      weight.alphaDensity * features.alphaDensity +
      weight.specialCharDensity * features.specialCharDensity +
      weight.uppercaseRatio * features.uppercaseRatio +
      weight.length * features.length +
      weight.contextScore * features.contextScore;

    return 1 / (1 + Math.exp(-score));
  }

  private extractFeatures(value: string, context: string): FeatureVector {
    const length = Math.min(value.length, 128) / 128;
    const digits = (value.match(/\d/g) ?? []).length;
    const letters = (value.match(/[a-zA-Z]/g) ?? []).length;
    const specialChars = value.length - digits - letters;
    const uppercase = (value.match(/[A-Z]/g) ?? []).length;

    const digitDensity = value.length === 0 ? 0 : digits / value.length;
    const alphaDensity = value.length === 0 ? 0 : letters / value.length;
    const specialCharDensity = value.length === 0 ? 0 : specialChars / value.length;
    const uppercaseRatio = letters === 0 ? 0 : uppercase / letters;

    const contextScore = this.calculateContextScore(context);

    return {
      length,
      digitDensity,
      alphaDensity,
      specialCharDensity,
      uppercaseRatio,
      contextScore
    };
  }

  private calculateContextScore(context: string): number {
    const normalized = context.toLowerCase();
    const keywords = [
      'ssn',
      'passport',
      'medical',
      'patient',
      'diagnosis',
      'financial',
      'credit',
      'card',
      'contact',
      'email',
      'phone',
      'address',
      'location',
      'auth',
      'biometric'
    ];

    let score = 0;
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        score += 0.1;
      }
    }

    return Math.min(1, score);
  }

  private getAverage(bucket: 'positive' | 'negative'): FeatureVector {
    const stats = this.stats[bucket];
    if (stats.count === 0) {
      return {
        length: 0.1,
        digitDensity: 0.1,
        alphaDensity: 0.1,
        specialCharDensity: 0.1,
        uppercaseRatio: 0.1,
        contextScore: 0.1
      };
    }

    return {
      length: stats.length / stats.count,
      digitDensity: stats.digitDensity / stats.count,
      alphaDensity: stats.alphaDensity / stats.count,
      specialCharDensity: stats.specialCharDensity / stats.count,
      uppercaseRatio: stats.uppercaseRatio / stats.count,
      contextScore: stats.contextScore / stats.count
    };
  }
}

class ContextualClassifier {
  private readonly contextualCatalog: Record<PIICategory, string[]> = {
    IDENTIFIER: ['identifier', 'ssn', 'passport', 'national id', 'nin', 'tax id'],
    CONTACT: ['email', 'phone', 'contact', 'address', 'messaging'],
    FINANCIAL: ['credit', 'card', 'bank', 'iban', 'account', 'routing', 'financial'],
    HEALTH: ['medical', 'patient', 'diagnosis', 'treatment', 'hipaa', 'condition', 'health'],
    LOCATION: ['address', 'geo', 'latitude', 'longitude', 'gps', 'location'],
    BIOMETRIC: ['fingerprint', 'iris', 'face', 'voiceprint', 'biometric'],
    DEMOGRAPHIC: ['age', 'gender', 'ethnicity', 'demographic', 'profile'],
    AUTHENTICATION: ['password', 'token', 'otp', 'mfa', 'secret', 'credential']
  };

  classify(record: DataRecord, patternMatches: PatternMatch[]): {
    categories: Set<PIICategory>;
    contextualScore: number;
    tags: string[];
  } {
    const context = `${record.context.field} ${record.context.description ?? ''}`.toLowerCase();
    const categories = new Set<PIICategory>();
    const tags = new Set<string>();
    let score = 0;

    for (const [category, keywords] of Object.entries(this.contextualCatalog) as [
      PIICategory,
      string[]
    ][]) {
      for (const keyword of keywords) {
        if (context.includes(keyword)) {
          categories.add(category);
          tags.add(keyword);
          score += 0.05;
        }
      }
    }

    for (const match of patternMatches) {
      match.categories.forEach((category) => categories.add(category));
      if (match.confidence > 0.8) {
        score += 0.2;
      }
    }

    if ((record.context.tags ?? []).length > 0) {
      for (const tag of record.context.tags ?? []) {
        tags.add(tag);
        score += 0.02;
      }
    }

    return {
      categories,
      contextualScore: Math.min(1, score),
      tags: Array.from(tags)
    };
  }
}

interface RegulatoryCatalogEntry {
  categories: PIICategory[];
  references: string[];
  obligations: string[];
}

class RegulatoryMapper {
  private readonly catalog: Record<RegulatoryFramework, RegulatoryCatalogEntry> = {
    GDPR: {
      categories: [
        'IDENTIFIER',
        'CONTACT',
        'FINANCIAL',
        'HEALTH',
        'LOCATION',
        'BIOMETRIC',
        'DEMOGRAPHIC',
        'AUTHENTICATION'
      ],
      references: ['Article 6', 'Article 32', 'Article 33'],
      obligations: [
        'Document lawful basis for processing',
        'Apply data minimization and purpose limitation controls',
        'Enable data subject access, rectification, and deletion rights'
      ]
    },
    CCPA: {
      categories: [
        'IDENTIFIER',
        'CONTACT',
        'FINANCIAL',
        'HEALTH',
        'LOCATION',
        'DEMOGRAPHIC',
        'AUTHENTICATION'
      ],
      references: ['1798.100', '1798.110', '1798.115'],
      obligations: [
        'Provide disclosure of collection and sharing purposes',
        'Maintain opt-out controls for data sale or sharing',
        'Support consumer access, deletion, and correction requests'
      ]
    },
    HIPAA: {
      categories: ['HEALTH', 'IDENTIFIER', 'CONTACT', 'LOCATION'],
      references: ['164.306', '164.308', '164.502'],
      obligations: [
        'Apply administrative, physical, and technical safeguards',
        'Limit use and disclosure to minimum necessary',
        'Maintain audit controls and breach notification readiness'
      ]
    }
  };

  mapCategories(categories: PIICategory[]): RegulatoryMapping[] {
    const uniqueCategories = new Set(categories);
    const mappings: RegulatoryMapping[] = [];

    for (const [framework, entry] of Object.entries(this.catalog) as [
      RegulatoryFramework,
      RegulatoryCatalogEntry
    ][]) {
      const relevantCategories = entry.categories.filter((category) =>
        uniqueCategories.has(category)
      );

      if (relevantCategories.length > 0) {
        mappings.push({
          framework,
          references: entry.references,
          obligations: entry.obligations,
          categories: relevantCategories
        });
      }
    }

    return mappings;
  }

  getFrameworks(): RegulatoryFramework[] {
    return Object.keys(this.catalog) as RegulatoryFramework[];
  }

  getRequiredCategories(framework: RegulatoryFramework): PIICategory[] {
    return this.catalog[framework].categories;
  }

  getObligations(framework: RegulatoryFramework): string[] {
    return this.catalog[framework].obligations;
  }
}

class DataLineageTracker {
  private readonly lineage: Map<string, LineageRecord> = new Map();

  track(entity: PIIEntity, context: DataContext): LineageRecord {
    const record: LineageRecord = {
      entityId: entity.id,
      recordId: entity.recordId,
      system: context.system,
      field: context.field,
      collection: context.collection,
      path: context.lineage?.path ?? [context.system, context.field].filter(Boolean) as string[],
      transformations: context.lineage?.transformations ?? [],
      accessControls: context.accessControls ?? []
    };

    this.lineage.set(entity.id, record);
    return record;
  }

  get(entityId: string): LineageRecord | undefined {
    return this.lineage.get(entityId);
  }
}

class MetadataEnricher {
  constructor(private readonly config: PiiOntologyConfig['enrichment'] = {}) {}

  enrich(
    entity: PIIEntity,
    patternAnalysis: PatternAnalysis,
    contextTags: string[],
    context: DataContext
  ): EnrichedMetadata {
    const baseConfidence = Math.max(
      entity.confidence,
      Math.max(...entity.patternMatches.map((match) => match.confidence), 0)
    );

    const regulatoryWeight = entity.regulatoryMappings.length * 0.1;
    const contextualWeight = Math.min(0.3, entity.contextualScore);
    const riskScore = Math.min(1, baseConfidence + regulatoryWeight + contextualWeight);

    const highRiskThreshold = this.config?.highRiskThreshold ?? 0.6;
    const criticalRiskThreshold = this.config?.criticalRiskThreshold ?? 0.85;

    let sensitivity: SensitivityLevel = 'LOW';
    if (riskScore >= criticalRiskThreshold) {
      sensitivity = 'CRITICAL';
    } else if (riskScore >= highRiskThreshold + 0.15) {
      sensitivity = 'HIGH';
    } else if (riskScore >= highRiskThreshold) {
      sensitivity = 'MEDIUM';
    }

    const recommendedControls = new Set<string>([
      'Encrypt data at rest and in transit',
      'Apply role-based access controls',
      'Monitor access logs for anomalies'
    ]);

    if (entity.categories.includes('HEALTH')) {
      recommendedControls.add('Enable HIPAA-aligned audit trails');
      recommendedControls.add('Implement restricted clinical data environments');
    }

    if (entity.categories.includes('FINANCIAL')) {
      recommendedControls.add('Tokenize payment instrument data');
      recommendedControls.add('Enforce PCI-DSS segmentation controls');
    }

    if (entity.categories.includes('AUTHENTICATION')) {
      recommendedControls.add('Mandate hardware-backed secret storage');
      recommendedControls.add('Rotate credentials after access');
    }

    const lineageRecord = {
      entityId: entity.id,
      recordId: entity.recordId,
      system: context.system,
      field: context.field,
      collection: context.collection,
      path: context.lineage?.path ?? [context.system, context.field].filter(Boolean) as string[],
      transformations: context.lineage?.transformations ?? [],
      accessControls: context.accessControls ?? []
    };

    return {
      riskScore,
      sensitivity,
      recommendedControls: Array.from(recommendedControls),
      lineage: lineageRecord,
      stewardship: {
        owner: context.owner,
        retentionPolicy: context.retentionPolicy,
        tags: Array.from(new Set([...contextTags, ...(context.tags ?? [])]))
      }
    };
  }
}

class ComplianceValidator {
  constructor(private readonly mapper: RegulatoryMapper) {}

  validate(entities: PIIEntity[], frameworks?: RegulatoryFramework[]): ComplianceValidationResult[] {
    const frameworksToCheck = frameworks ?? this.mapper.getFrameworks();
    const results: ComplianceValidationResult[] = [];
    const presentCategories = new Set<PIICategory>();

    for (const entity of entities) {
      entity.categories.forEach((category) => presentCategories.add(category));
    }

    for (const framework of frameworksToCheck) {
      const requiredCategories = new Set(this.mapper.getRequiredCategories(framework));
      const coveredCategories = new Set<PIICategory>();

      for (const entity of entities) {
        const mapping = entity.regulatoryMappings.find((item) => item.framework === framework);
        if (mapping) {
          mapping.categories.forEach((category) => coveredCategories.add(category));
        }
      }

      const missingCategories = Array.from(requiredCategories)
        .filter((category) => presentCategories.has(category))
        .filter((category) => !coveredCategories.has(category));

      results.push({
        framework,
        passed: missingCategories.length === 0,
        missingCategories,
        description:
          missingCategories.length === 0
            ? `All required categories for ${framework} are covered.`
            : `Missing coverage for ${missingCategories.join(', ')} under ${framework}.`
      });
    }

    return results;
  }
}

export class PiiOntologyEngine {
  private readonly detector = new PatternDetector();
  private readonly classifier = new ContextualClassifier();
  private readonly mapper = new RegulatoryMapper();
  private readonly lineage = new DataLineageTracker();
  private readonly enricher: MetadataEnricher;
  private readonly validator = new ComplianceValidator(this.mapper);
  private readonly config: Required<PiiOntologyConfig>;

  constructor(config: PiiOntologyConfig = {}) {
    this.config = {
      detectionThreshold: config.detectionThreshold ?? 0.55,
      contextualThreshold: config.contextualThreshold ?? 0.35,
      enrichment: config.enrichment ?? {}
    } as Required<PiiOntologyConfig>;
    this.enricher = new MetadataEnricher(this.config.enrichment);
  }

  registerPattern(pattern: PatternDefinition): void {
    this.detector.registerPattern(pattern);
  }

  train(samples: TrainingSample[]): void {
    this.detector.train(samples);
  }

  async processRecords(records: DataRecord[]): Promise<ClassificationReport> {
    const entities: PIIEntity[] = [];
    const categoryCounts: Record<PIICategory, number> = {
      IDENTIFIER: 0,
      CONTACT: 0,
      FINANCIAL: 0,
      HEALTH: 0,
      LOCATION: 0,
      BIOMETRIC: 0,
      DEMOGRAPHIC: 0,
      AUTHENTICATION: 0
    };
    const frameworkCounts: Record<RegulatoryFramework, number> = {
      GDPR: 0,
      CCPA: 0,
      HIPAA: 0
    };

    records.forEach((record, index) => {
      const patternAnalysis = this.detector.analyze(record);
      const contextual = this.classifier.classify(record, patternAnalysis.matches);

      const allCategories = new Set<PIICategory>([...contextual.categories]);
      patternAnalysis.matches.forEach((match) =>
        match.categories.forEach((category) => allCategories.add(category))
      );

      if (
        allCategories.size === 0 &&
        patternAnalysis.probability < (this.config.detectionThreshold ?? 0.55) &&
        contextual.contextualScore < (this.config.contextualThreshold ?? 0.35)
      ) {
        return;
      }

      const id = this.createStableId(record.id, index, record.value);
      const entity: PIIEntity = {
        id,
        recordId: record.id,
        value: record.value,
        categories: Array.from(allCategories),
        confidence: patternAnalysis.probability,
        contextualScore: contextual.contextualScore,
        sensitivity: 'LOW',
        patternMatches: patternAnalysis.matches,
        regulatoryMappings: [],
        metadata: undefined as unknown as EnrichedMetadata
      };

      entity.regulatoryMappings = this.mapper.mapCategories(entity.categories);
      const metadata = this.enricher.enrich(entity, patternAnalysis, contextual.tags, record.context);
      entity.metadata = metadata;
      entity.sensitivity = metadata.sensitivity;

      this.lineage.track(entity, record.context);

      entity.categories.forEach((category) => {
        categoryCounts[category] += 1;
      });

      for (const mapping of entity.regulatoryMappings) {
        frameworkCounts[mapping.framework] += 1;
      }

      entities.push(entity);
    });

    const regulatorySummary = this.mapper.getFrameworks().reduce(
      (acc, framework) => {
        acc[framework] = {
          entities: entities.filter((entity) =>
            entity.regulatoryMappings.some((mapping) => mapping.framework === framework)
          ).length,
          categories: Array.from(
            new Set(
              entities
                .flatMap((entity) => entity.regulatoryMappings)
                .filter((mapping) => mapping.framework === framework)
                .flatMap((mapping) => mapping.categories)
            )
          ),
          obligations: this.mapper.getObligations(framework)
        };
        return acc;
      },
      {} as ClassificationReport['regulatorySummary']
    );

    const validations = this.validator.validate(entities);

    return {
      entities,
      summary: {
        totalRecords: records.length,
        piiRecords: entities.length,
        categories: categoryCounts,
        frameworks: frameworkCounts
      },
      regulatorySummary,
      validations
    };
  }

  getLineage(entityId: string): LineageRecord | undefined {
    return this.lineage.get(entityId);
  }

  validateAgainstFrameworks(
    entities: PIIEntity[],
    frameworks: RegulatoryFramework[]
  ): ComplianceValidationResult[] {
    return this.validator.validate(entities, frameworks);
  }

  private createStableId(recordId: string, index: number, value: string): string {
    return crypto
      .createHash('sha256')
      .update(`${recordId}-${index}-${value}`)
      .digest('hex');
  }
}
