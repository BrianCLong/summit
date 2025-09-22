import neo4j from 'neo4j-driver';
import { trace, Span } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';

const tracer = trace.getTracer('maestro-neo4j', '24.3.0');

// Neo4j region-aware metrics
const neo4jConnectionsActive = new Counter({
  name: 'neo4j_connections_active_total',
  help: 'Total active Neo4j connections',
  labelNames: ['region', 'driver_type', 'tenant_id']
});

const neo4jQueryDuration = new Histogram({
  name: 'neo4j_query_duration_seconds',
  help: 'Neo4j query duration',
  labelNames: ['region', 'driver_type', 'operation', 'tenant_id'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

const neo4jReplicationLag = new Gauge({
  name: 'neo4j_replication_lag_seconds',
  help: 'Neo4j replication lag in seconds',
  labelNames: ['region', 'primary_region']
});

// Write driver (primary region)
const writeDriver = neo4j.driver(
  process.env.NEO4J_URI || process.env.NEO4J_WRITE_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  ),
  {
    encrypted: process.env.NODE_ENV === 'production' ? 'ENCRYPTION_ON' : 'ENCRYPTION_OFF',
    maxConnectionPoolSize: 30,
    maxTransactionRetryTime: 30000,
    connectionAcquisitionTimeout: 60000,
    userAgent: `maestro-write-${process.env.CURRENT_REGION || 'unknown'}`
  }
);

// Read driver (can be replica or primary)
const readDriver = neo4j.driver(
  process.env.NEO4J_READ_URI || process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  ),
  {
    encrypted: process.env.NODE_ENV === 'production' ? 'ENCRYPTION_ON' : 'ENCRYPTION_OFF',
    maxConnectionPoolSize: 50, // More read connections
    maxTransactionRetryTime: 30000,
    connectionAcquisitionTimeout: 60000,
    userAgent: `maestro-read-${process.env.CURRENT_REGION || 'unknown'}`
  }
);

// Legacy driver for backward compatibility
const driver = writeDriver;

export const neo = {
  run: async (query: string, params: any = {}, options?: { region?: string; routerHint?: string; tenantId?: string }) => {
    return tracer.startActiveSpan('neo4j.query', async (span: Span) => {
      span.setAttributes({
        'db.system': 'neo4j',
        'db.statement': query,
        'db.operation': query.split(' ')[0].toLowerCase(),
        'tenant_id': options?.tenantId || 'unknown'
      });

      const session = driver.session({
        defaultAccessMode: neo4j.session.WRITE
      });

      // Enhanced tenant scoping for Neo4j queries
      const scopedQuery = validateAndScopeNeo4jQuery(query, params, options?.tenantId);

      try {
        const result = await session.run(scopedQuery.query, scopedQuery.params);
        span.setAttributes({
          'db.rows_affected': result.records.length,
          'db.tenant_scoped': scopedQuery.wasScoped
        });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        await session.close();
        span.end();
      }
    });
  },

  // Convenience method for idempotent writes (MERGE operations)
  merge: async (query: string, params: any = {}, options?: { tenantId?: string }) => {
    return tracer.startActiveSpan('neo4j.merge', async (span: Span) => {
      span.setAttributes({
        'db.system': 'neo4j',
        'db.statement': query,
        'db.operation': 'merge',
        'tenant_id': options?.tenantId || 'unknown'
      });

      const session = driver.session({
        defaultAccessMode: neo4j.session.WRITE
      });

      const scopedQuery = validateAndScopeNeo4jQuery(query, params, options?.tenantId);

      try {
        const result = await session.run(scopedQuery.query, scopedQuery.params);
        span.setAttributes({
          'db.rows_affected': result.records.length,
          'db.tenant_scoped': scopedQuery.wasScoped
        });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        await session.close();
        span.end();
      }
    });
  },

  // Tenant-scoped transaction support
  withTenant: async <T>(tenantId: string, callback: (scopedNeo: any) => Promise<T>): Promise<T> => {
    return tracer.startActiveSpan('neo4j.with_tenant', async (span: Span) => {
      span.setAttributes({
        'tenant_id': tenantId,
        'db.system': 'neo4j'
      });

      const scopedNeo = {
        run: (query: string, params: any = {}) => 
          neo.run(query, params, { tenantId }),
        merge: (query: string, params: any = {}) => 
          neo.merge(query, params, { tenantId })
      };

      try {
        return await callback(scopedNeo);
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  },

  // Health check
  healthCheck: async () => {
    const session = driver.session();
    try {
      await session.run('CALL db.ping()');
      return true;
    } catch (error) {
      try {
        // Fallback health check for older Neo4j versions
        await session.run('RETURN 1');
        return true;
      } catch (fallbackError) {
        console.error('Neo4j health check failed:', error);
        return false;
      }
    } finally {
      await session.close();
    }
  },

  close: async () => {
    await driver.close();
  }
};

interface ScopedNeo4jQuery {
  query: string;
  params: any;
  wasScoped: boolean;
}

// Neo4j tenant scoping validation and enforcement
function validateAndScopeNeo4jQuery(query: string, params: any, tenantId?: string): ScopedNeo4jQuery {
  const lowerQuery = query.toLowerCase().trim();
  
  // Node labels that require tenant scoping
  const tenantScopedLabels = ['Signal', 'User', 'Session', 'ApiKey'];
  
  // Check if query affects tenant-scoped nodes
  const affectedLabel = tenantScopedLabels.find(label => 
    lowerQuery.includes(label.toLowerCase())
  );

  if (!affectedLabel) {
    // Query doesn't affect tenant-scoped nodes
    return { query, params, wasScoped: false };
  }

  // For tenant-scoped nodes, tenantId is required
  if (!tenantId) {
    throw new Error(`Tenant ID required for queries on ${affectedLabel} nodes`);
  }

  // Check if query already has tenant scoping
  if (lowerQuery.includes('tenant_id') && (lowerQuery.includes('$tenantid') || params.tenantId)) {
    // Assume query is already properly scoped
    return { query, params: { ...params, tenantId }, wasScoped: true };
  }

  // Auto-scope the query based on Cypher patterns
  if (lowerQuery.includes('match')) {
    return scopeMatchQuery(query, params, tenantId, affectedLabel);
  } else if (lowerQuery.includes('merge')) {
    return scopeMergeQuery(query, params, tenantId, affectedLabel);
  } else if (lowerQuery.includes('create')) {
    return scopeCreateQuery(query, params, tenantId, affectedLabel);
  }

  // Fallback for unrecognized query patterns
  console.warn(`Unable to auto-scope Neo4j query for label ${affectedLabel}: ${query}`);
  return { query, params, wasScoped: false };
}

function scopeMatchQuery(query: string, params: any, tenantId: string, label: string): ScopedNeo4jQuery {
  // Add tenant_id filter to MATCH clauses
  const regex = new RegExp(`\\(([^)]*):${label}([^)]*)\\)`, 'gi');
  
  let scopedQuery = query.replace(regex, (match, varName, props) => {
    // Add tenant_id property constraint
    if (props && props.includes('{')) {
      // Already has properties, add tenant_id
      const propsWithTenant = props.replace('{', '{tenant_id: $tenantId, ');
      return `(${varName}:${label}${propsWithTenant})`;
    } else {
      // No properties, add tenant_id constraint
      return `(${varName}:${label} {tenant_id: $tenantId})`;
    }
  });

  return {
    query: scopedQuery,
    params: { ...params, tenantId },
    wasScoped: true
  };
}

function scopeMergeQuery(query: string, params: any, tenantId: string, label: string): ScopedNeo4jQuery {
  // For MERGE queries, ensure tenant_id is set in the properties
  const regex = new RegExp(`\\(([^)]*):${label}([^)]*)\\)`, 'gi');
  
  let scopedQuery = query.replace(regex, (match, varName, props) => {
    if (props && props.includes('{')) {
      // Already has properties, ensure tenant_id is included
      if (!props.includes('tenant_id')) {
        const propsWithTenant = props.replace('{', '{tenant_id: $tenantId, ');
        return `(${varName}:${label}${propsWithTenant})`;
      }
    } else {
      // No properties, add tenant_id
      return `(${varName}:${label} {tenant_id: $tenantId})`;
    }
    return match;
  });

  return {
    query: scopedQuery,
    params: { ...params, tenantId },
    wasScoped: true
  };
}

function scopeCreateQuery(query: string, params: any, tenantId: string, label: string): ScopedNeo4jQuery {
  // For CREATE queries, ensure tenant_id is set
  const regex = new RegExp(`\\(([^)]*):${label}([^)]*)\\)`, 'gi');

  let scopedQuery = query.replace(regex, (match, varName, props) => {
    if (props && props.includes('{')) {
      // Already has properties, ensure tenant_id is included
      if (!props.includes('tenant_id')) {
        const propsWithTenant = props.replace('{', '{tenant_id: $tenantId, ');
        return `(${varName}:${label}${propsWithTenant})`;
      }
    } else {
      // No properties, add tenant_id
      return `(${varName}:${label} {tenant_id: $tenantId})`;
    }
    return match;
  });

  return {
    query: scopedQuery,
    params: { ...params, tenantId },
    wasScoped: true
  };
}

// Export driver function for compatibility
export function getNeo4jDriver() {
  return driver;
}

// Export service class for compatibility
export class Neo4jService {
  constructor() {}

  getDriver() {
    return driver;
  }

  async run(query: string, params: any = {}) {
    return neo.run(query, params);
  }
}