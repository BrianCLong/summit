/**
 * GraphQL DLP Plugin
 *
 * Apollo Server plugin that integrates DLP scanning into GraphQL operations.
 */

import {
  ApolloServerPlugin,
  GraphQLRequestListener,
  GraphQLRequestContext,
} from '@apollo/server';
import { dlpService, DLPContext } from '../../services/DLPService.js';
import logger from '../../utils/logger.js';
import { GraphQLError } from 'graphql';

export interface DLPPluginOptions {
  enabled?: boolean;
  scanVariables?: boolean;
  scanQuery?: boolean;
  scanResponse?: boolean;
  exemptOperations?: string[];
  blockOnViolation?: boolean;
  maxContentSize?: number;
}

const defaultOptions: DLPPluginOptions = {
  enabled: true,
  scanVariables: true,
  scanQuery: false,
  scanResponse: true,
  exemptOperations: ['IntrospectionQuery', '__schema'],
  blockOnViolation: true,
  maxContentSize: 512 * 1024, // 512KB
};

export function dlpPlugin(options: DLPPluginOptions = {}): ApolloServerPlugin {
  const config = { ...defaultOptions, ...options };

  return {
    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
      return {
        async didResolveOperation(requestContext: GraphQLRequestContext<any>) {
          if (!config.enabled) return;

          const { request, contextValue, operationName } = requestContext;

          // Skip exempt operations
          if (config.exemptOperations?.includes(operationName || '')) {
            return;
          }

          try {
            // Extract DLP context
            const context: DLPContext = {
              userId: contextValue.user?.id || 'anonymous',
              tenantId: contextValue.user?.tenantId || 'default',
              userRole: contextValue.user?.role || 'user',
              operationType: getOperationType(request.query || ''),
              contentType: 'application/graphql',
              metadata: {
                operationName: operationName || 'unknown',
                operationType: requestContext.operation?.operation || 'unknown',
                fieldCount: getFieldCount(requestContext.operation),
                userAgent: contextValue.request?.headers?.['user-agent'],
              },
            };

            const violations: any[] = [];

            // Scan GraphQL variables
            if (config.scanVariables && request.variables) {
              const variablesStr = JSON.stringify(request.variables);

              if (variablesStr.length <= (config.maxContentSize || Infinity)) {
                const scanResults = await dlpService.scanContent(
                  request.variables,
                  context,
                );

                if (scanResults.length > 0) {
                  violations.push(...scanResults);

                  // Apply DLP actions to variables
                  const { processedContent, blocked } =
                    await dlpService.applyActions(
                      request.variables,
                      scanResults,
                      context,
                    );

                  if (blocked && config.blockOnViolation) {
                    throw new GraphQLError(
                      'GraphQL operation blocked due to data loss prevention policy violations',
                      {
                        extensions: {
                          code: 'DLP_VIOLATION',
                          violations: scanResults.map((v) => ({
                            policyId: v.policyId,
                            detectedEntities: v.metadata.detectedEntities,
                          })),
                        },
                      },
                    );
                  }

                  // Update variables with processed content
                  request.variables = processedContent as Record<string, any>;
                }
              } else {
                logger.warn('GraphQL DLP: Variables too large to scan', {
                  component: 'DLPPlugin',
                  operationName,
                  variablesSize: variablesStr.length,
                  maxSize: config.maxContentSize,
                  tenantId: context.tenantId,
                });
              }
            }

            // Scan GraphQL query
            if (config.scanQuery && request.query) {
              if (request.query.length <= (config.maxContentSize || Infinity)) {
                const queryContext = {
                  ...context,
                  operationType: 'read' as const,
                };

                const scanResults = await dlpService.scanContent(
                  request.query,
                  queryContext,
                );

                if (scanResults.length > 0) {
                  violations.push(...scanResults);

                  // For queries, we typically only audit/alert, not block
                  await dlpService.applyActions(
                    request.query,
                    scanResults,
                    queryContext,
                  );
                }
              }
            }

            // Store violations in context for response processing
            if (violations.length > 0) {
              contextValue.dlpViolations = violations;

              logger.info('GraphQL DLP violations detected', {
                component: 'DLPPlugin',
                operationName,
                tenantId: context.tenantId,
                userId: context.userId,
                violationCount: violations.length,
                policies: violations.map((v) => v.policyId),
              });
            }
          } catch (error) {
            if (error instanceof GraphQLError) {
              throw error;
            }

            logger.error(
              'GraphQL DLP plugin error during operation resolution',
              {
                component: 'DLPPlugin',
                error: error.message,
                operationName,
                userId: contextValue.user?.id,
              },
            );

            // Don't fail the request for DLP plugin errors unless it's a blocking violation
            if (config.blockOnViolation && error.message.includes('DLP')) {
              throw new GraphQLError(
                'Request blocked due to data protection policy',
                {
                  extensions: { code: 'DLP_ERROR' },
                },
              );
            }
          }
        },

        async willSendResponse(requestContext: GraphQLRequestContext<any>) {
          if (!config.enabled || !config.scanResponse) return;

          const { response, contextValue, operationName } = requestContext;

          // Skip if no response body or if there were previous violations that blocked
          if (
            !response.body ||
            response.body.kind !== 'single' ||
            !response.body.singleResult.data
          ) {
            return;
          }

          try {
            const context: DLPContext = {
              userId: contextValue.user?.id || 'anonymous',
              tenantId: contextValue.user?.tenantId || 'default',
              userRole: contextValue.user?.role || 'user',
              operationType: 'read',
              contentType: 'application/graphql',
              metadata: {
                operationName: operationName || 'unknown',
                responseType: 'graphql_response',
              },
            };

            const responseData = response.body.singleResult.data;
            const responseStr = JSON.stringify(responseData);

            if (responseStr.length <= (config.maxContentSize || Infinity)) {
              const scanResults = await dlpService.scanContent(
                responseData,
                context,
              );

              if (scanResults.length > 0) {
                const { processedContent } = await dlpService.applyActions(
                  responseData,
                  scanResults,
                  context,
                );

                // Update response with processed content
                response.body.singleResult.data = processedContent;

                logger.info('GraphQL DLP response processing completed', {
                  component: 'DLPPlugin',
                  operationName,
                  tenantId: context.tenantId,
                  userId: context.userId,
                  violationCount: scanResults.length,
                });
              }
            } else {
              logger.warn('GraphQL DLP: Response too large to scan', {
                component: 'DLPPlugin',
                operationName,
                responseSize: responseStr.length,
                maxSize: config.maxContentSize,
                tenantId: context.tenantId,
              });
            }
          } catch (error) {
            logger.error(
              'GraphQL DLP plugin error during response processing',
              {
                component: 'DLPPlugin',
                error: error.message,
                operationName,
                userId: contextValue.user?.id,
              },
            );

            // For response processing errors, we log but don't modify the response
            // to avoid breaking the client expectation
          }
        },
      };
    },
  };
}

/**
 * Determine operation type from GraphQL query string
 */
function getOperationType(query: string): DLPContext['operationType'] {
  const trimmed = query.trim().toLowerCase();

  if (trimmed.startsWith('mutation')) {
    if (trimmed.includes('delete') || trimmed.includes('remove')) {
      return 'delete';
    }
    return 'write';
  }

  if (trimmed.startsWith('subscription')) {
    return 'read';
  }

  // Default to read for queries
  return 'read';
}

/**
 * Count the number of fields being requested
 */
function getFieldCount(operation: any): number {
  if (!operation || !operation.selectionSet) {
    return 0;
  }

  try {
    return countSelections(operation.selectionSet);
  } catch {
    return 0;
  }
}

function countSelections(selectionSet: any): number {
  if (!selectionSet || !selectionSet.selections) {
    return 0;
  }

  let count = selectionSet.selections.length;

  for (const selection of selectionSet.selections) {
    if (selection.selectionSet) {
      count += countSelections(selection.selectionSet);
    }
  }

  return count;
}

export default dlpPlugin;
