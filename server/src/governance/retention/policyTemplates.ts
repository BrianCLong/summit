import { DatasetMetadata, RetentionPolicyTemplate, DataClassificationLevel } from './types.js';

export const POLICY_TEMPLATE_LIBRARY: RetentionPolicyTemplate[] = [
  {
    id: 'audit-7y',
    name: 'Regulated Audit Evidence - 7 Years',
    description: 'Write-once storage with seven year retention for audit evidence and regulator-mandated records.',
    classificationLevel: 'regulated',
    retentionDays: 2555,
    legalHoldAllowed: true,
    purgeGraceDays: 30,
    storageTargets: ['postgres', 's3'],
    defaultSafeguards: [
      'immutable-storage',
      'dual-control-delete',
      'evidence-chain-verification',
      'tamper-evident-hash'
    ],
    applicableDataTypes: ['audit', 'analytics']
  },
  {
    id: 'pii-365d',
    name: 'Personal Data - 365 Days',
    description: 'Standard one year retention for personal data with privacy review and DSAR support.',
    classificationLevel: 'restricted',
    retentionDays: 365,
    legalHoldAllowed: true,
    purgeGraceDays: 14,
    storageTargets: ['postgres', 'neo4j'],
    defaultSafeguards: [
      'pii-tokenization',
      'regional-access-controls',
      'dsar-ready-export'
    ],
    applicableDataTypes: ['communications', 'analytics', 'telemetry']
  },
  {
    id: 'telemetry-90d',
    name: 'Telemetry - 90 Days',
    description: 'Operational telemetry retained for ninety days to support investigations and trend analysis.',
    classificationLevel: 'internal',
    retentionDays: 90,
    legalHoldAllowed: false,
    purgeGraceDays: 7,
    storageTargets: ['postgres', 'elasticsearch'],
    defaultSafeguards: [
      'anonymized-identifiers',
      'usage-bounded-access'
    ],
    applicableDataTypes: ['telemetry', 'analytics']
  },
  {
    id: 'ml-training-30d',
    name: 'ML Training Artifacts - 30 Days',
    description: 'Short lived retention for ML feature stores and training extracts pending model promotion.',
    classificationLevel: 'internal',
    retentionDays: 30,
    legalHoldAllowed: true,
    purgeGraceDays: 5,
    storageTargets: ['s3', 'object-store'],
    defaultSafeguards: [
      'model-version-linkage',
      'anonymized-sampling'
    ],
    applicableDataTypes: ['ml-training']
  },
  {
    id: 'public-180d',
    name: 'Open Intelligence - 180 Days',
    description: 'Retention for open-source intelligence artifacts and derived analytics.',
    classificationLevel: 'public',
    retentionDays: 180,
    legalHoldAllowed: false,
    purgeGraceDays: 10,
    storageTargets: ['neo4j', 'postgres'],
    defaultSafeguards: [
      'integrity-checkpoints'
    ],
    applicableDataTypes: ['analytics', 'custom']
  }
];

export function getPolicyTemplateById(templateId: string): RetentionPolicyTemplate | undefined {
  return POLICY_TEMPLATE_LIBRARY.find(template => template.id === templateId);
}

export function resolveClassification(metadata: DatasetMetadata): {
  level: DataClassificationLevel;
  rationale: string[];
} {
  const rationale: string[] = [];
  let level: DataClassificationLevel = 'internal';

  if (metadata.containsPersonalData) {
    rationale.push('Contains personal data requiring restricted handling.');
    level = 'restricted';
  }

  if (metadata.containsFinancialData) {
    rationale.push('Contains financial attributes requiring regulatory retention.');
    level = 'regulated';
  }

  if (metadata.containsHealthData) {
    rationale.push('Contains health information subject to HIPAA-equivalent retention.');
    level = 'regulated';
  }

  if (metadata.dataType === 'audit') {
    rationale.push('Audit datasets inherit regulated classification.');
    level = 'regulated';
  }

  if (metadata.tags.includes('public-intel')) {
    rationale.push('Tagged as public intelligence.');
    if (level !== 'regulated' && level !== 'restricted') {
      level = 'public';
    }
  }

  if (metadata.tags.includes('internal-only') && level === 'public') {
    level = 'internal';
  }

  if (rationale.length === 0) {
    rationale.push('No sensitive markers detected; defaulting to internal.');
  }

  return { level, rationale };
}

export function selectTemplateForDataset(metadata: DatasetMetadata): {
  template: RetentionPolicyTemplate;
  rationale: string[];
} {
  const classification = resolveClassification(metadata);
  const applicableTemplates = POLICY_TEMPLATE_LIBRARY.filter(template => {
    const levelMatch = template.classificationLevel === classification.level
      || (classification.level === 'regulated' && template.classificationLevel === 'restricted');
    const typeMatch = template.applicableDataTypes.includes(metadata.dataType)
      || template.applicableDataTypes.includes('custom');
    return levelMatch && typeMatch;
  });

  if (applicableTemplates.length > 0) {
    return { template: applicableTemplates[0], rationale: classification.rationale };
  }

  return {
    template: POLICY_TEMPLATE_LIBRARY[0],
    rationale: [...classification.rationale, 'Falling back to default regulated template.']
  };
}
