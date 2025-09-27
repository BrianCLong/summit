import fs from 'fs';
import path from 'path';

export type SensitivityLevel = 'pii' | 'internal' | 'public' | 'restricted';

export interface PrivacyEntity {
  entity: string;
  table: string;
  primaryKey: string;
  primaryKeyType: 'uuid' | 'text' | 'bigint';
  timestampColumn: string;
  subjectKey?: string;
  sensitivity: SensitivityLevel;
  dataCategories: string[];
  defaultRetentionTier?: string;
  retentionLabelColumn?: string;
  retentionExpiresColumn?: string;
  tombstoneColumn?: string;
  anonymizeFields?: string[];
  description?: string;
}

interface EntitySchemaFile {
  entities: PrivacyEntity[];
}

const DEFAULT_ENTITIES_PATH = path.resolve(
  process.cwd(),
  'schemas/privacy/entities.json'
);

let cachedEntities: PrivacyEntity[] | null = null;

function resolveEntitiesPath(): string {
  return process.env.PRIVACY_ENTITIES_PATH || DEFAULT_ENTITIES_PATH;
}

export function loadPrivacyEntities(): PrivacyEntity[] {
  if (cachedEntities) {
    return cachedEntities;
  }

  const filePath = resolveEntitiesPath();
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as EntitySchemaFile;

  if (!Array.isArray(parsed.entities)) {
    throw new Error('Invalid privacy entity schema: missing entities array');
  }

  cachedEntities = parsed.entities.map(entity => ({
    ...entity,
    dataCategories: entity.dataCategories || []
  }));

  return cachedEntities;
}

export function findPrivacyEntity(tableName: string): PrivacyEntity | undefined {
  return loadPrivacyEntities().find(
    entity => entity.table.toLowerCase() === tableName.toLowerCase()
  );
}

export function resetPrivacyEntityCache(): void {
  cachedEntities = null;
}

