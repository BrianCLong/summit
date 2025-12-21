export type ClassificationLevel = 'public' | 'internal' | 'confidential' | 'restricted';

export interface ClassificationRule {
  maxRetentionDays: number;
  encryptionRequired: boolean;
  redactionRequired: boolean;
  allowedPurposes: string[];
  taggingRequired: boolean;
}

export interface DataClassificationConfig {
  tiers: Record<ClassificationLevel, ClassificationRule>;
}

export interface DataAsset {
  id: string;
  name: string;
  classification: ClassificationLevel;
  retentionDays: number;
  encrypted: boolean;
  redactionEnabled: boolean;
  tags: string[];
  purpose: string;
  schemaVersion?: string;
}

export interface ValidationIssue {
  field: keyof DataAsset | 'policy';
  message: string;
  severity: 'warning' | 'error';
}

export interface ClassificationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const defaultConfig: DataClassificationConfig = {
  tiers: {
    public: {
      maxRetentionDays: 0,
      encryptionRequired: false,
      redactionRequired: false,
      allowedPurposes: ['marketing', 'public'],
      taggingRequired: false,
    },
    internal: {
      maxRetentionDays: 365,
      encryptionRequired: true,
      redactionRequired: false,
      allowedPurposes: ['operations', 'analytics', 'product'],
      taggingRequired: true,
    },
    confidential: {
      maxRetentionDays: 180,
      encryptionRequired: true,
      redactionRequired: true,
      allowedPurposes: ['operations', 'analytics', 'product'],
      taggingRequired: true,
    },
    restricted: {
      maxRetentionDays: 90,
      encryptionRequired: true,
      redactionRequired: true,
      allowedPurposes: ['operations'],
      taggingRequired: true,
    },
  },
};

export class DataClassificationEnforcer {
  private readonly config: DataClassificationConfig;

  constructor(config: DataClassificationConfig = defaultConfig) {
    this.config = config;
  }

  validate(asset: DataAsset): ClassificationResult {
    const rule = this.config.tiers[asset.classification];
    if (!rule) {
      return {
        valid: false,
        issues: [
          { field: 'policy', message: 'Unknown classification level', severity: 'error' },
        ],
      };
    }

    const issues: ValidationIssue[] = [];

    if (asset.retentionDays > rule.maxRetentionDays) {
      issues.push({
        field: 'retentionDays',
        message: `Retention of ${asset.retentionDays} exceeds ${rule.maxRetentionDays} days for ${asset.classification}`,
        severity: 'error',
      });
    }

    if (rule.encryptionRequired && !asset.encrypted) {
      issues.push({
        field: 'encrypted',
        message: 'Encryption is required for this classification',
        severity: 'error',
      });
    }

    if (rule.redactionRequired && !asset.redactionEnabled) {
      issues.push({
        field: 'redactionEnabled',
        message: 'Redaction is required for this classification',
        severity: 'error',
      });
    }

    if (!rule.allowedPurposes.includes(asset.purpose)) {
      issues.push({
        field: 'purpose',
        message: `${asset.purpose} is not permitted for ${asset.classification} data`,
        severity: 'error',
      });
    }

    if (rule.taggingRequired && asset.tags.length === 0) {
      issues.push({
        field: 'tags',
        message: 'Tags are required to enforce lineage and minimization',
        severity: 'warning',
      });
    }

    return {
      valid: issues.every((issue) => issue.severity !== 'error'),
      issues,
    };
  }
}
