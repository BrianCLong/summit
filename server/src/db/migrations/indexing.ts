export interface ManagedIndexOptions {
  tableName: string;
  columns: string[];
  unique?: boolean;
  predicate?: string;
  concurrently?: boolean;
  indexName?: string;
}

export interface DropIndexOptions {
  indexName: string;
  concurrently?: boolean;
}

const isConcurrentEnabled = () => process.env.INDEX_CONCURRENT === '1';

const quoteIdent = (value: string) => `"${value.replace(/"/g, '""')}"`;

const quoteQualifiedName = (name: string) =>
  name
    .split('.')
    .filter(Boolean)
    .map(quoteIdent)
    .join('.');

export const buildIndexName = (options: ManagedIndexOptions) =>
  options.indexName ?? `${options.tableName}_${options.columns.join('_')}_idx`;

export const buildCreateIndexSql = (options: ManagedIndexOptions) => {
  const name = buildIndexName(options);
  const concurrently = options.concurrently ?? isConcurrentEnabled();
  const unique = options.unique ? 'UNIQUE ' : '';
  const concurrentClause = concurrently ? 'CONCURRENTLY ' : '';
  const predicate = options.predicate ? ` WHERE ${options.predicate}` : '';

  const columnList = options.columns.map(quoteIdent).join(', ');
  const tableName = quoteQualifiedName(options.tableName);

  return {
    name,
    concurrently,
    sql: `CREATE ${unique}INDEX ${concurrentClause}IF NOT EXISTS ${quoteIdent(
      name,
    )} ON ${tableName} (${columnList})${predicate}`,
    predicate: options.predicate,
    tableName: options.tableName,
  };
};

export const buildDropIndexSql = (options: DropIndexOptions) => {
  const concurrently = options.concurrently ?? isConcurrentEnabled();
  const concurrentClause = concurrently ? 'CONCURRENTLY ' : '';

  return {
    sql: `DROP INDEX ${concurrentClause}IF EXISTS ${quoteQualifiedName(options.indexName)}`,
    concurrently,
  };
};
