import LRUCache from '../utils/lruCache.js';

export interface ScopedQuery {
  query: string;
  params: any[];
  wasScoped: boolean;
}

interface QueryAnalysis {
  affectedTable?: string;
  isAlreadyScoped: boolean;
  operationType?: 'select' | 'insert' | 'update' | 'delete';
  hasWhereClause: boolean;
}

const queryAnalysisCache = new LRUCache<string, QueryAnalysis>(1000);

// Tenant scoping validation and enforcement
export function validateAndScopeQuery(
  query: string,
  params: any[],
  tenantId?: string,
): ScopedQuery {
  // Check cache first using raw query
  let analysis = queryAnalysisCache.get(query);

  if (!analysis) {
    const lowerQuery = query.toLowerCase().trim();

    // Tables that require tenant scoping
    const tenantScopedTables = [
      'coherence_scores',
      'audit_logs',
      'user_sessions',
      'api_keys',
    ];

    // Check if query affects tenant-scoped tables
    const affectedTable = tenantScopedTables.find((table) =>
      lowerQuery.includes(table),
    );

    const isAlreadyScoped = !!(lowerQuery.includes('tenant_id') && lowerQuery.includes('$'));
    const hasWhereClause = lowerQuery.includes('where');

    let operationType: 'select' | 'insert' | 'update' | 'delete' | undefined;
    if (lowerQuery.startsWith('select')) operationType = 'select';
    else if (lowerQuery.startsWith('insert')) operationType = 'insert';
    else if (lowerQuery.startsWith('update')) operationType = 'update';
    else if (lowerQuery.startsWith('delete')) operationType = 'delete';

    analysis = {
      affectedTable,
      isAlreadyScoped,
      operationType,
      hasWhereClause
    };

    queryAnalysisCache.put(query, analysis);
  }

  const { affectedTable, isAlreadyScoped, operationType, hasWhereClause } = analysis;

  if (!affectedTable) {
    // Query doesn't affect tenant-scoped tables
    return { query, params, wasScoped: false };
  }

  // For tenant-scoped tables, tenantId is required
  if (!tenantId) {
    throw new Error(`Tenant ID required for queries on ${affectedTable}`);
  }

  // Check if query already has tenant scoping
  if (isAlreadyScoped) {
    // Assume query is already properly scoped
    return { query, params, wasScoped: true };
  }

  // Security Check: Prevent SQL injection via comments that could bypass scoping
  // If auto-scoping is required, we must ensure the query structure is safe to append to.
  // Comments like '--' or '/*' can be used to comment out the appended tenant_id clause.
  if (query.includes('--') || query.includes('/*')) {
    throw new Error(
      `Unsafe query for auto-scoping: Comments detected. Please manually add 'tenant_id' clause or remove comments. Query: ${query.substring(
        0,
        50,
      )}...`,
    );
  }

  // Sanitize: Remove trailing semicolon to ensure appended clause is valid SQL
  // e.g., "SELECT * FROM table;" -> "SELECT * FROM table WHERE ..."
  let cleanQuery = query.trim();
  if (cleanQuery.endsWith(';')) {
    cleanQuery = cleanQuery.slice(0, -1);
  }

  // Auto-scope the query based on operation type
  if (operationType === 'select') {
    return applyScope(cleanQuery, params, tenantId, hasWhereClause, 'AND');
  } else if (operationType === 'insert') {
    console.warn(
      `INSERT query tenant scoping needs manual verification: ${query}`,
    );
    return { query, params, wasScoped: false };
  } else if (operationType === 'update') {
    return applyScope(cleanQuery, params, tenantId, hasWhereClause, 'AND');
  } else if (operationType === 'delete') {
    return applyScope(cleanQuery, params, tenantId, hasWhereClause, 'AND');
  }

  // Fallback for unrecognized query patterns
  console.warn(
    `Unable to auto-scope query for table ${affectedTable}: ${query}`,
  );
  return { query, params, wasScoped: false };
}

function applyScope(
  query: string,
  params: any[],
  tenantId: string,
  hasWhereClause: boolean,
  connector: 'AND' | 'WHERE' // 'WHERE' implies replacing or adding new WHERE, but logically it's: hasWhere ? AND : WHERE
): ScopedQuery {
  // If we rely on hasWhereClause from cache, we avoid repeated checking.

  if (hasWhereClause) {
    const scopedQuery = query + ` AND tenant_id = $${params.length + 1}`;
    return {
      query: scopedQuery,
      params: [...params, tenantId],
      wasScoped: true,
    };
  } else {
    const scopedQuery = query + ` WHERE tenant_id = $${params.length + 1}`;
    return {
      query: scopedQuery,
      params: [...params, tenantId],
      wasScoped: true,
    };
  }
}
