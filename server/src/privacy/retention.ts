import fs from 'fs';
import path from 'path';
import { loadPrivacyEntities, PrivacyEntity } from './entities';

export type RetentionAction = 'delete' | 'anonymize';

export interface RetentionTierDefinition {
  days: number;
  action: RetentionAction;
  description?: string;
  appliesTo?: string[];
  legalBasis?: string;
}

export interface RetentionPolicyPack {
  version?: string;
  tiers: Record<string, RetentionTierDefinition>;
  defaults: Record<string, string>;
}

export interface DerivedRetentionPolicy {
  name: string;
  tableName: string;
  primaryKeyColumn: string;
  primaryKeyType: PrivacyEntity['primaryKeyType'];
  timestampColumn: string;
  subjectKey?: string;
  retentionDays: number;
  retentionTier: string;
  action: RetentionAction;
  labelColumn?: string;
  expiresColumn?: string;
  tombstoneColumn?: string;
  anonymizeFields: string[];
  dataCategories: string[];
  sensitivity: PrivacyEntity['sensitivity'];
}

const DEFAULT_PACK_PATH = path.resolve(process.cwd(), 'policy/packs/retention.json');

let cachedPack: RetentionPolicyPack | null = null;

function resolvePackPath(): string {
  return process.env.RETENTION_POLICY_PACK || DEFAULT_PACK_PATH;
}

export function loadRetentionPack(): RetentionPolicyPack {
  if (cachedPack) {
    return cachedPack;
  }

  const filePath = resolvePackPath();
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as RetentionPolicyPack;

  if (!parsed.tiers || typeof parsed.tiers !== 'object') {
    throw new Error('Invalid retention policy pack: missing tiers');
  }

  if (!parsed.defaults || typeof parsed.defaults !== 'object') {
    throw new Error('Invalid retention policy pack: missing defaults');
  }

  cachedPack = parsed;
  return cachedPack;
}

function resolveTierForEntity(entity: PrivacyEntity, pack: RetentionPolicyPack): string {
  if (entity.defaultRetentionTier && pack.tiers[entity.defaultRetentionTier]) {
    return entity.defaultRetentionTier;
  }

  for (const category of entity.dataCategories || []) {
    const tier = pack.defaults[category];
    if (tier && pack.tiers[tier]) {
      return tier;
    }
  }

  const sensitivityDefault = pack.defaults[entity.sensitivity];
  if (sensitivityDefault && pack.tiers[sensitivityDefault]) {
    return sensitivityDefault;
  }

  return Object.keys(pack.tiers)[0];
}

export function buildDerivedPolicies(): DerivedRetentionPolicy[] {
  const entities = loadPrivacyEntities();
  const pack = loadRetentionPack();

  return entities.map(entity => {
    const retentionTier = resolveTierForEntity(entity, pack);
    const tierDefinition = pack.tiers[retentionTier];

    if (!tierDefinition) {
      throw new Error(`Retention tier '${retentionTier}' is not defined in policy pack`);
    }

    const action = entity.anonymizeFields && entity.anonymizeFields.length > 0
      ? 'anonymize'
      : tierDefinition.action;

    return {
      name: `${entity.entity}-${retentionTier}`,
      tableName: entity.table,
      primaryKeyColumn: entity.primaryKey,
      primaryKeyType: entity.primaryKeyType,
      timestampColumn: entity.timestampColumn,
      subjectKey: entity.subjectKey,
      retentionDays: tierDefinition.days,
      retentionTier,
      action,
      labelColumn: entity.retentionLabelColumn,
      expiresColumn: entity.retentionExpiresColumn,
      tombstoneColumn: entity.tombstoneColumn,
      anonymizeFields: entity.anonymizeFields || [],
      dataCategories: entity.dataCategories,
      sensitivity: entity.sensitivity
    };
  });
}

export function getRetentionTierDefinition(tier: string): RetentionTierDefinition | undefined {
  const pack = loadRetentionPack();
  return pack.tiers[tier];
}

export function resetRetentionPackCache(): void {
  cachedPack = null;
}

