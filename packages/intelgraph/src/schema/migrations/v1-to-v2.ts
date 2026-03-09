export interface EntityV1 {
  id: string;
  metadata: {
    tags?: string[];
    [key: string]: any;
  };
}

export interface EntityV2 {
  id: string;
  tags: string[];
  schemaVersion: '2';
  [key: string]: any;
}

export function migrateV1ToV2(entity: any): EntityV2 {
  const v1 = entity as EntityV1;
  const tags = v1.metadata?.tags || [];

  const { metadata, ...rest } = v1;

  return {
    ...rest,
    tags,
    schemaVersion: '2',
  };
}
