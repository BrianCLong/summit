export interface EntityV1 {
  id: string;
  metadata: {
    tags?: string[];
    [key: string]: unknown;
  };
}

export interface EntityV2 {
  id: string;
  tags: string[];
  schemaVersion: '2';
  [key: string]: unknown;
}

export function migrateV1ToV2(entity: unknown): EntityV2 {
  const v1 = entity as EntityV1;
  const tags = v1.metadata?.tags || [];

  const { metadata, ...rest } = v1;

  return {
    ...rest,
    tags,
    schemaVersion: '2',
  };
}
