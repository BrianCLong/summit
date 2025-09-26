import type { Driver, QueryResult } from 'neo4j-driver';
import {
  CypherExecutor,
  CypherQueryResult,
  GraphCypherRule,
  GraphValidationError,
  GraphValidationPayload,
} from './types.js';

function recordToObject(record: any): Record<string, unknown> {
  if (!record) return {};
  if (typeof record.toObject === 'function') {
    return record.toObject();
  }
  return record as Record<string, unknown>;
}

export function createCypherExecutorFromDriver(driver: Driver): CypherExecutor {
  return {
    async run<T = any>(statement: string, params: Record<string, unknown> = {}): Promise<CypherQueryResult<T>> {
      if (typeof (driver as any).executeQuery === 'function') {
        const result: QueryResult = await (driver as any).executeQuery(statement, params);
        return {
          records: (result.records || []).map((record: any) => recordToObject(record)) as T[],
        };
      }

      const session = driver.session();
      try {
        const result = await session.run(statement, params);
        return {
          records: result.records.map((record: any) => recordToObject(record)) as T[],
        };
      } finally {
        await session.close();
      }
    },
  };
}

function buildTenantError(violation: Record<string, any>, payload: GraphValidationPayload): GraphValidationError {
  const nodeId = violation.id ?? 'unknown';
  const tenantId = violation.tenantId ?? 'null';
  return {
    code: 'TENANT_ID_MISMATCH',
    message: `Node ${nodeId} has tenantId ${tenantId}, expected ${payload.tenantId}.`,
    path: `nodes[id=${nodeId}].properties.tenantId`,
    rule: 'tenant-consistency',
    severity: 'ERROR',
    details: violation,
  };
}

function buildRelationshipTypeError(violation: Record<string, any>): GraphValidationError {
  const relationshipId = violation.id ?? `${violation.sourceId}->${violation.targetId}`;
  return {
    code: 'RELATIONSHIP_TYPE_NOT_ALLOWED',
    message: `Relationship ${relationshipId} uses unsupported type ${violation.type}.`,
    path: `relationships[id=${relationshipId}].type`,
    rule: 'relationship-allowlist',
    severity: 'ERROR',
    details: violation,
  };
}

function buildRelationshipEndpointError(violation: Record<string, any>): GraphValidationError {
  const relationshipId = violation.id ?? `${violation.sourceId}->${violation.targetId}`;
  return {
    code: 'RELATIONSHIP_ENDPOINT_NOT_FOUND',
    message: `Relationship ${relationshipId} references missing node(s).`,
    path: `relationships[id=${relationshipId}]`,
    rule: 'relationship-endpoints',
    severity: 'ERROR',
    details: violation,
  };
}

export const defaultGraphCypherRules: GraphCypherRule[] = [
  {
    name: 'tenant-consistency',
    description: 'Ensures every node carries the tenantId matching the mutation input.',
    statement: `
      UNWIND $nodes AS node
      WITH node
      WHERE node.properties.tenantId IS NULL OR node.properties.tenantId <> $tenantId
      RETURN collect({ id: node.id, tenantId: node.properties.tenantId }) AS violations
    `,
    errorCode: 'TENANT_ID_MISMATCH',
    severity: 'ERROR',
    buildError: (violation, payload) => buildTenantError(violation, payload),
  },
  {
    name: 'relationship-allowlist',
    description: 'Rejects relationships that use disallowed types.',
    statement: `
      UNWIND $relationships AS rel
      WITH rel
      WHERE NOT rel.type IN $allowedRelationshipTypes
      RETURN collect({
        id: coalesce(rel.id, rel.sourceId + '->' + rel.targetId),
        type: rel.type,
        sourceId: rel.sourceId,
        targetId: rel.targetId
      }) AS violations
    `,
    errorCode: 'RELATIONSHIP_TYPE_NOT_ALLOWED',
    severity: 'ERROR',
    buildError: (violation) => buildRelationshipTypeError(violation),
  },
  {
    name: 'relationship-endpoints',
    description: 'Verifies that every relationship endpoint exists in the payload.',
    statement: `
      UNWIND $relationships AS rel
      WITH rel, $nodes AS nodes
      WHERE NOT any(n IN nodes WHERE n.id = rel.sourceId)
         OR NOT any(n IN nodes WHERE n.id = rel.targetId)
      RETURN collect({
        id: coalesce(rel.id, rel.sourceId + '->' + rel.targetId),
        sourceId: rel.sourceId,
        targetId: rel.targetId
      }) AS violations
    `,
    errorCode: 'RELATIONSHIP_ENDPOINT_NOT_FOUND',
    severity: 'ERROR',
    buildError: (violation) => buildRelationshipEndpointError(violation),
  },
];
