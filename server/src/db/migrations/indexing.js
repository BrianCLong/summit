"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDropIndexSql = exports.buildCreateIndexSql = exports.buildIndexName = void 0;
const isConcurrentEnabled = () => process.env.INDEX_CONCURRENT === '1';
const quoteIdent = (value) => `"${value.replace(/"/g, '""')}"`;
const quoteQualifiedName = (name) => name
    .split('.')
    .filter(Boolean)
    .map(quoteIdent)
    .join('.');
const buildIndexName = (options) => options.indexName ?? `${options.tableName}_${options.columns.join('_')}_idx`;
exports.buildIndexName = buildIndexName;
const buildCreateIndexSql = (options) => {
    const name = (0, exports.buildIndexName)(options);
    const concurrently = options.concurrently ?? isConcurrentEnabled();
    const unique = options.unique ? 'UNIQUE ' : '';
    const concurrentClause = concurrently ? 'CONCURRENTLY ' : '';
    const predicate = options.predicate ? ` WHERE ${options.predicate}` : '';
    const columnList = options.columns.map(quoteIdent).join(', ');
    const tableName = quoteQualifiedName(options.tableName);
    return {
        name,
        concurrently,
        sql: `CREATE ${unique}INDEX ${concurrentClause}IF NOT EXISTS ${quoteIdent(name)} ON ${tableName} (${columnList})${predicate}`,
        predicate: options.predicate,
        tableName: options.tableName,
    };
};
exports.buildCreateIndexSql = buildCreateIndexSql;
const buildDropIndexSql = (options) => {
    const concurrently = options.concurrently ?? isConcurrentEnabled();
    const concurrentClause = concurrently ? 'CONCURRENTLY ' : '';
    return {
        sql: `DROP INDEX ${concurrentClause}IF EXISTS ${quoteQualifiedName(options.indexName)}`,
        concurrently,
    };
};
exports.buildDropIndexSql = buildDropIndexSql;
