// Persisted GraphQL Query Security
// Production-only allowlist to prevent arbitrary query execution

import { createHash } from 'crypto';

// SHA-256 allowlist of approved queries (populated from build process)
const queryAllowlist = new Set<string>(
  JSON.parse(process.env.GQL_SHA256_ALLOWLIST || '[]')
);

// Known conductor queries (will be populated by build process)
const CONDUCTOR_QUERIES = {
  // Preview routing query
  'query PreviewRouting($input: ConductInput!) { previewRouting(input: $input) { expert reason confidence alternatives { expert confidence } features { complexity dataIntensity timeConstraint } warnings } }': true,
  
  // Conduct execution mutation  
  'mutation Conduct($input: ConductInput!) { conduct(input: $input) { expertId auditId latencyMs cost result warnings error } }': true,
  
  // Health check query
  'query Health { health }': true,
  
  // Conductor stats query
  'query ConductorStats { conductorStats { status activeTaskCount routingStats { totalDecisions successRate avgLatencyMs expertDistribution } } }': true
};

/**
 * Check if a GraphQL query is allowed in production
 * @param query The GraphQL query string
 * @throws Error if query is not allowed in production
 */
export function checkPersistedQuery(query: string): void {
  // Skip check in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const normalizedQuery = normalizeQuery(query);
  const queryHash = createHash('sha256').update(normalizedQuery).digest('hex');
  
  // Check against allowlist
  if (!queryAllowlist.has(queryHash)) {
    // Log the blocked query for security monitoring
    console.warn('Blocked non-persisted query:', {
      hash: queryHash,
      query: normalizedQuery.substring(0, 100) + '...',
      timestamp: new Date().toISOString(),
      source: 'persisted-query-guard'
    });
    
    throw new Error('PersistedQueryDenied: Query not in production allowlist');
  }
}

/**
 * Normalize GraphQL query for consistent hashing
 * Removes whitespace variations and comments
 */
export function normalizeQuery(query: string): string {
  return query
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/#[^\n\r]*/g, '')      // Remove comments
    .trim();
}

/**
 * Generate SHA-256 hash for a query (for allowlist generation)
 */
export function generateQueryHash(query: string): string {
  const normalized = normalizeQuery(query);
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Check if introspection is allowed
 * Blocks introspection queries in production
 */
export function checkIntrospectionAllowed(query: string): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const introspectionKeywords = [
    '__schema',
    '__type',
    '__typename',
    'IntrospectionQuery'
  ];

  const hasIntrospection = introspectionKeywords.some(keyword =>
    query.includes(keyword)
  );

  if (hasIntrospection) {
    console.warn('Blocked introspection query in production:', {
      query: query.substring(0, 100) + '...',
      timestamp: new Date().toISOString(),
      source: 'introspection-guard'
    });
    
    throw new Error('IntrospectionDisabled: Schema introspection disabled in production');
  }
}

/**
 * Build allowlist from known queries
 * Used during build process to generate production allowlist
 */
export function buildQueryAllowlist(): string[] {
  const hashes: string[] = [];
  
  for (const query of Object.keys(CONDUCTOR_QUERIES)) {
    hashes.push(generateQueryHash(query));
  }
  
  return hashes;
}

/**
 * Add query to runtime allowlist (for dynamic updates)
 * Should only be used in non-production environments
 */
export function addToAllowlist(query: string): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot modify allowlist in production');
  }
  
  const hash = generateQueryHash(query);
  queryAllowlist.add(hash);
}

/**
 * Get current allowlist size for monitoring
 */
export function getAllowlistStats(): {
  size: number;
  productionMode: boolean;
  introspectionBlocked: boolean;
} {
  return {
    size: queryAllowlist.size,
    productionMode: process.env.NODE_ENV === 'production',
    introspectionBlocked: process.env.NODE_ENV === 'production'
  };
}