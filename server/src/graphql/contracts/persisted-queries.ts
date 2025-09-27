import crypto from 'crypto';

export type OperationType = 'query' | 'mutation' | 'subscription';

export interface PersistedOperationCost {
  complexity: number;
  estimatedMs: number;
  targetSLOMs: number;
}

export interface PublicPersistedOperation {
  id: string;
  operationName: string;
  operationType: OperationType;
  document: string;
  sha256Hash: string;
  description: string;
  cost: PersistedOperationCost;
}

function normalize(document: string): string {
  return document.replace(/\s+/g, ' ').trim();
}

function hash(document: string): string {
  return crypto.createHash('sha256').update(normalize(document)).digest('hex');
}

const rawOperations: Array<Omit<PublicPersistedOperation, 'sha256Hash' | 'id'>> = [
  {
    operationName: 'PublicEntityById',
    operationType: 'query',
    description: 'Fetch a single entity with policy envelope and diagnostics.',
    document: `
      query PublicEntityById($id: ID!, $backpressure: BackpressureInput) {
        publicEntity(id: $id, backpressure: $backpressure) {
          entity {
            id
            tenantId
            kind
            labels
            confidence
            degree
            createdAt
            updatedAt
            retentionClass
            geographicScope
            investigation {
              id
              status
              ownerId
            }
          }
          policy {
            allow
            reason
          }
          diagnostics {
            durationMs
            estimatedCostMs
            sloTargetMs
          }
          errors {
            code
            message
            retryable
          }
        }
      }
    `,
    cost: { complexity: 45, estimatedMs: 120, targetSLOMs: 350 },
  },
  {
    operationName: 'PublicEntitySearch',
    operationType: 'query',
    description: 'List entities for a tenant using canonical pagination.',
    document: `
      query PublicEntitySearch($filter: PublicEntityFilter!, $pagination: PaginationInput, $sort: PublicEntitySort) {
        publicEntities(filter: $filter, pagination: $pagination, sort: $sort) {
          nodes {
            id
            kind
            labels
            confidence
            updatedAt
          }
          edges {
            cursor
            node {
              id
              kind
              properties
            }
            policy {
              allow
            }
          }
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
          diagnostics {
            durationMs
            estimatedCostMs
            sloTargetMs
          }
        }
      }
    `,
    cost: { complexity: 120, estimatedMs: 220, targetSLOMs: 350 },
  },
  {
    operationName: 'PublicRelationshipListing',
    operationType: 'query',
    description: 'List relationships for an entity with policy metadata.',
    document: `
      query PublicRelationshipListing($filter: PublicRelationshipFilter!, $pagination: PaginationInput) {
        publicRelationships(filter: $filter, pagination: $pagination) {
          nodes {
            id
            type
            confidence
            createdAt
            source { id kind }
            target { id kind }
          }
          totalCount
          pageInfo { hasNextPage endCursor }
          diagnostics { durationMs estimatedCostMs }
        }
      }
    `,
    cost: { complexity: 95, estimatedMs: 210, targetSLOMs: 350 },
  },
  {
    operationName: 'PublicInvestigations',
    operationType: 'query',
    description: 'Retrieve investigations for a tenant including counts.',
    document: `
      query PublicInvestigations($filter: PublicInvestigationFilter!, $pagination: PaginationInput) {
        publicInvestigations(filter: $filter, pagination: $pagination) {
          nodes {
            id
            name
            status
            priority
            entityCount
            relationshipCount
          }
          totalCount
          pageInfo { hasNextPage endCursor }
          diagnostics { durationMs estimatedCostMs }
        }
      }
    `,
    cost: { complexity: 80, estimatedMs: 180, targetSLOMs: 350 },
  },
  {
    operationName: 'PublicInvestigationTimeline',
    operationType: 'query',
    description: 'Fetch investigation timeline events for audit parity.',
    document: `
      query PublicInvestigationTimeline($filter: PublicTimelineFilter!, $pagination: PaginationInput) {
        publicInvestigationTimeline(filter: $filter, pagination: $pagination) {
          nodes {
            id
            kind
            occurredAt
            actorId
            payload
          }
          totalCount
          pageInfo { hasNextPage endCursor }
          errors { code message }
        }
      }
    `,
    cost: { complexity: 70, estimatedMs: 160, targetSLOMs: 350 },
  },
  {
    operationName: 'PublicEntityNeighborhood',
    operationType: 'query',
    description: 'Graph traversal bootstrap around an entity node.',
    document: `
      query PublicEntityNeighborhood($input: PublicNeighborhoodInput!) {
        publicEntityNeighborhood(input: $input) {
          center { id kind }
          entities { id kind labels }
          relationships { id type source { id } target { id } }
          backpressure { throttleSeconds recommendedPageSize }
          errors { code message }
        }
      }
    `,
    cost: { complexity: 200, estimatedMs: 320, targetSLOMs: 350 },
  },
  {
    operationName: 'PublicUpsertEntity',
    operationType: 'mutation',
    description: 'Create or update an entity with ABAC validation.',
    document: `
      mutation PublicUpsertEntity($input: PublicUpsertEntityInput!) {
        publicUpsertEntity(input: $input) {
          ok
          policy { allow reason }
          diagnostics { durationMs estimatedCostMs sloTargetMs }
          errors { code message retryable }
        }
      }
    `,
    cost: { complexity: 110, estimatedMs: 420, targetSLOMs: 700 },
  },
  {
    operationName: 'PublicLinkEntities',
    operationType: 'mutation',
    description: 'Create a relationship between two entities.',
    document: `
      mutation PublicLinkEntities($input: PublicLinkEntitiesInput!) {
        publicLinkEntities(input: $input) {
          ok
          diagnostics { durationMs estimatedCostMs }
          errors { code message }
        }
      }
    `,
    cost: { complexity: 95, estimatedMs: 480, targetSLOMs: 700 },
  },
  {
    operationName: 'PublicAddInvestigationNote',
    operationType: 'mutation',
    description: 'Append an operator note to an investigation.',
    document: `
      mutation PublicAddInvestigationNote($input: PublicAddInvestigationNoteInput!) {
        publicAddInvestigationNote(input: $input) {
          ok
          errors { code message }
          diagnostics { durationMs estimatedCostMs }
        }
      }
    `,
    cost: { complexity: 60, estimatedMs: 260, targetSLOMs: 700 },
  },
  {
    operationName: 'PublicAcknowledgeInvestigation',
    operationType: 'mutation',
    description: 'Update investigation lifecycle state with audit trail.',
    document: `
      mutation PublicAcknowledgeInvestigation($input: PublicAcknowledgeInvestigationInput!) {
        publicAcknowledgeInvestigation(input: $input) {
          ok
          errors { code message }
          diagnostics { durationMs estimatedCostMs }
        }
      }
    `,
    cost: { complexity: 70, estimatedMs: 280, targetSLOMs: 700 },
  },
  {
    operationName: 'PublicBatchIngestEntities',
    operationType: 'mutation',
    description: 'Batch ingest entities with backpressure-friendly metrics.',
    document: `
      mutation PublicBatchIngestEntities($input: [PublicUpsertEntityInput!]!, $options: PublicBatchOptions) {
        publicBatchIngestEntities(input: $input, options: $options) {
          ok
          accepted
          failed
          failures {
            input { tenantId kind }
            errors { code message }
          }
          diagnostics { durationMs estimatedCostMs }
        }
      }
    `,
    cost: { complexity: 240, estimatedMs: 640, targetSLOMs: 700 },
  },
  {
    operationName: 'PublicInvestigationsSubscription',
    operationType: 'subscription',
    description: 'Subscribe to investigation events for a tenant.',
    document: `
      subscription PublicInvestigationsSubscription($investigationId: ID!, $tenantId: String!) {
        publicInvestigationEvents(investigationId: $investigationId, tenantId: $tenantId) {
          id
          kind
          occurredAt
          payload
        }
      }
    `,
    cost: { complexity: 40, estimatedMs: 120, targetSLOMs: 250 },
  },
];

export const publicPersistedOperations: PublicPersistedOperation[] = rawOperations.map((operation) => {
  const sha256Hash = hash(operation.document);
  return {
    ...operation,
    sha256Hash,
    id: sha256Hash,
  };
});

export const publicPersistedOperationMap = new Map<string, PublicPersistedOperation>(
  publicPersistedOperations.map((operation) => [operation.sha256Hash, operation]),
);

export function getPublicPersistedOperation(id: string): PublicPersistedOperation | undefined {
  return publicPersistedOperationMap.get(id) ??
    publicPersistedOperations.find((operation) => operation.operationName === id);
}

export function listPublicPersistedOperations(): Array<{
  sha256Hash: string;
  operationName: string;
  operationType: OperationType;
  cost: PersistedOperationCost;
}> {
  return publicPersistedOperations.map(({ sha256Hash, operationName, operationType, cost }) => ({
    sha256Hash,
    operationName,
    operationType,
    cost,
  }));
}

export default publicPersistedOperations;
