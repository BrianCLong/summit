import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export type EdgeMap = {
  rel: string;
  to: string;
  from_pk: string;
  direction?: 'OUT' | 'IN';
};

export type EntityMap = {
  pk: string;
  labels?: string[];
  props: string[];
  edges?: EdgeMap[];
};

export type EntityMapFile = {
  entities: Record<string, EntityMap>;
};

export type RuntimeConfig = {
  pgDsn: string;
  neo4jUri: string;
  neo4jUser: string;
  neo4jPass: string;
  entityMapPath: string;
  batchSize: number;
  parityThreshold: number;
  output: Array<'jsonl' | 'junit' | 'text'>;
  since?: string;
  allowRepair: boolean;
  env: string;
};

export function loadEntityMap(entityMapPath: string): EntityMapFile {
  const resolved = path.resolve(entityMapPath);
  const raw = fs.readFileSync(resolved, 'utf8');
  const parsed = YAML.parse(raw) as EntityMapFile;
  if (!parsed?.entities) {
    throw new Error('entity-map.yml missing "entities"');
  }
  return parsed;
}

export function loadRuntimeConfig(
  overrides: Partial<RuntimeConfig>,
): RuntimeConfig {
  const env = process.env.NODE_ENV ?? 'development';
  const cfg: RuntimeConfig = {
    pgDsn: process.env.PG_DSN ?? '',
    neo4jUri: process.env.NEO4J_URI ?? '',
    neo4jUser: process.env.NEO4J_USER ?? '',
    neo4jPass: process.env.NEO4J_PASS ?? '',
    entityMapPath:
      process.env.GRAPH_ENTITY_MAP ??
      'packages/graph-sync-validator/entity-map.yml',
    batchSize: Number(process.env.GRAPH_SYNC_BATCH ?? 1000),
    parityThreshold: Number(process.env.GRAPH_PARITY_THRESHOLD ?? 0.999),
    output: (process.env.GRAPH_SYNC_OUTPUT ?? 'text').split(',') as Array<
      'jsonl' | 'junit' | 'text'
    >,
    since: process.env.GRAPH_SYNC_SINCE,
    allowRepair: process.env.ALLOW_GRAPH_REPAIR === '1',
    env,
  };

  return { ...cfg, ...overrides };
}
