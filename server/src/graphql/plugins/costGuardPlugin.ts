
import { ApolloServerPlugin } from '@apollo/server';
import { GraphQLError, DocumentNode, visit, FieldNode } from 'graphql';

import config from '../../config/index.js';
import { costGuard } from '../../services/cost-guard.js';

function estimateComplexity(document: DocumentNode | undefined): number {
  if (!document) {
    return 1;
  }
  let fields = 0;
  visit(document, {
    Field(node: FieldNode) {
      if (node.name.value !== '__typename') {
        fields += 1;
      }
    }
  });
  return Math.max(1, fields / 25);
}

function inferResultCount(data: unknown): number | undefined {
  if (Array.isArray(data)) {
    return data.length;
  }
  if (data && typeof data === 'object') {
    for (const value of Object.values(data as Record<string, unknown>)) {
      const count = inferResultCount(value);
      if (typeof count === 'number' && count > 0) {
        return count;
      }
    }
  }
  return undefined;
}

export function costGuardPlugin(): ApolloServerPlugin {
  return {
    async requestDidStart(requestContext) {
      if (!config.features.costGuard) {
        return {};
      }
      const start = Date.now();
      const http = requestContext.request.http;
      const headers = http?.headers;
      const tenantId = headers?.get('x-tenant') || headers?.get('x-tenant-id') || 'default';
      const userId = headers?.get('x-user-id') || requestContext.contextValue?.user?.id || 'unknown';
      const operationId = headers?.get('x-request-id') || `gql-${Date.now()}`;
      let reservationId: string | undefined;
      let estimatedCost = 0;
      let hints: string[] = [];
      let budgetRemaining = 0;
      let bucketCapacity = 0;
      let offPeak = false;
      let rateLimited = false;
      let partialAllowed = false;
      let reservedAmount = 0;
      let costContext: any = null;

      return {
        async didResolveOperation(ctx) {
          if (!config.features.costGuard) {
            return;
          }
          const complexity = estimateComplexity(ctx.document);
          costContext = {
            tenantId,
            userId,
            operation: 'graphql_query',
            complexity,
            metadata: {
              operationName: ctx.operationName ?? requestContext.request.operationName,
              persisted: requestContext.request.extensions?.persistedQuery ? 'true' : 'false'
            },
            operationId
          };
          const costCheck = await costGuard.checkCostAllowance(costContext);
          reservationId = costCheck.reservationId;
          estimatedCost = costCheck.estimatedCost;
          hints = costCheck.hints;
          budgetRemaining = costCheck.budgetRemaining;
          bucketCapacity = costCheck.bucketCapacity;
          offPeak = costCheck.offPeak;
          rateLimited = costCheck.rateLimited;
          partialAllowed = costCheck.partialAllowed;
          reservedAmount = costCheck.reservedAmount;

          if (!costCheck.allowed) {
            costGuard.releaseReservation(costCheck.reservationId, 'graphql_deny');
            if (requestContext.response.http) {
              requestContext.response.http.status = 429;
            }
            throw new GraphQLError('Cost guard limit exceeded', {
              extensions: {
                code: 'COST_GUARD_LIMIT',
                estimatedCost: costCheck.estimatedCost,
                budgetRemaining: costCheck.budgetRemaining,
                hints: costCheck.hints
              }
            });
          }

          requestContext.contextValue = {
            ...requestContext.contextValue,
            costGuard: {
              reservationId: costCheck.reservationId,
              estimatedCost: costCheck.estimatedCost,
              hints: costCheck.hints
            }
          };
        },
        async willSendResponse(ctx) {
          if (!config.features.costGuard || !costContext) {
            return;
          }
          const headersOut = ctx.response.http?.headers;
          if (headersOut) {
            headersOut.set('X-Query-Cost', estimatedCost.toFixed(4));
            headersOut.set('X-Query-Budget-Remaining', budgetRemaining.toFixed(4));
            headersOut.set('X-Query-Bucket-Capacity', bucketCapacity.toFixed(4));
            headersOut.set('X-Query-OffPeak', offPeak ? 'true' : 'false');
            if (hints.length > 0) {
              headersOut.set('X-Query-Hints', hints.join('|'));
            }
            if (partialAllowed) {
              headersOut.set('X-Query-Partial', 'true');
            }
            if (rateLimited) {
              headersOut.set('X-RateLimit-Cost', 'true');
              headersOut.set('X-RateLimit-Budget', budgetRemaining.toFixed(4));
            }
          }

          const body = ctx.response.body;
          if (body?.kind === 'single') {
            const single = body.singleResult;
            single.extensions = {
              ...(single.extensions ?? {}),
              costGuard: {
                estimatedCost,
                budgetRemaining,
                hints,
                partial: partialAllowed,
                offPeak,
                reservedAmount
              }
            };
            if (partialAllowed) {
              single.errors = [
                ...(single.errors ?? []),
                new GraphQLError('Partial response returned to stay within tenant cost budget.', {
                  extensions: { code: 'COST_GUARD_PARTIAL', hints }
                })
              ];
            }
          }

          try {
            await costGuard.recordActualCost(
              {
                ...costContext,
                reservationId,
                duration: Date.now() - start,
                resultCount:
                  body?.kind === 'single' ? inferResultCount(body.singleResult.data) : undefined
              },
              partialAllowed ? reservedAmount : estimatedCost
            );
          } catch (error) {
            costGuard.releaseReservation(reservationId, 'graphql_record_error');
            ctx.response.http?.headers?.set('X-Cost-Guard-Error', 'record');
          }
        },
        async didEncounterErrors() {
          if (reservationId) {
            costGuard.releaseReservation(reservationId, 'graphql_error');
          }
        }
      };
    }
  };
}
