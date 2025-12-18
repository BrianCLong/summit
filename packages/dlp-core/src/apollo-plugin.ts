/**
 * DLP Apollo Server Plugin
 *
 * Apollo Server plugin for integrating DLP into GraphQL operations.
 *
 * @package dlp-core
 */

import type { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { DLPService } from './DLPService';
import type { DLPServiceConfig } from './types';

export interface DLPApolloPluginOptions {
  inspectQueries?: boolean;
  inspectMutations?: boolean;
  inspectResponses?: boolean;
  redactInResponse?: boolean;
  excludeOperations?: string[];
}

interface DLPContext {
  user?: {
    id: string;
    tenantId: string;
    roles: string[];
  };
}

/**
 * Create Apollo Server DLP plugin
 */
export function DLPApolloPlugin(
  serviceConfig: DLPServiceConfig,
  options: DLPApolloPluginOptions = {}
): ApolloServerPlugin<DLPContext> {
  const dlpService = new DLPService(serviceConfig);

  const defaultOptions: Required<DLPApolloPluginOptions> = {
    inspectQueries: true,
    inspectMutations: true,
    inspectResponses: true,
    redactInResponse: true,
    excludeOperations: ['IntrospectionQuery', '__schema', '__type'],
    ...options,
  };

  return {
    async requestDidStart({ request, contextValue }): Promise<GraphQLRequestListener<DLPContext>> {
      const operationName = request.operationName || 'unknown';

      // Skip excluded operations
      if (defaultOptions.excludeOperations.includes(operationName)) {
        return {};
      }

      return {
        async didResolveOperation({ operation }) {
          const isMutation = operation.operation === 'mutation';
          const isQuery = operation.operation === 'query';

          // Check if we should inspect this operation type
          if (isMutation && !defaultOptions.inspectMutations) return;
          if (isQuery && !defaultOptions.inspectQueries) return;

          // Inspect variables for sensitive data
          if (request.variables && Object.keys(request.variables).length > 0) {
            const result = await dlpService.scan({
              content: JSON.stringify(request.variables),
              contentType: 'application/json',
              context: {
                contentType: 'graphql-variables',
                purpose: isMutation ? 'CREATE' : 'READ',
                actor: contextValue.user,
              },
              metadata: {
                operationName,
                operationType: operation.operation,
              },
            });

            if (!result.allowed) {
              throw new Error(
                `DLP Policy Violation: ${result.violations.map((v) => v.message).join(', ')}`
              );
            }
          }
        },

        async willSendResponse({ response }) {
          if (!defaultOptions.inspectResponses) return;

          // Response inspection for GraphQL
          if (response.body.kind === 'single' && response.body.singleResult.data) {
            const responseData = JSON.stringify(response.body.singleResult.data);

            const result = await dlpService.scan({
              content: responseData,
              contentType: 'application/json',
              context: {
                contentType: 'graphql-response',
                purpose: 'EGRESS',
                actor: contextValue.user,
              },
              metadata: {
                operationName,
              },
            });

            // If redaction is needed and enabled
            if (
              defaultOptions.redactInResponse &&
              result.action === 'REDACT' &&
              result.detection.hasDetections
            ) {
              const redacted = await dlpService.redact({
                content: responseData,
                detections: result.detection.detections,
              });

              // Replace response data with redacted version
              try {
                response.body.singleResult.data = JSON.parse(redacted.redactedContent);
              } catch {
                // If parsing fails, leave original
                console.warn('[DLP] Failed to apply redaction to GraphQL response');
              }
            }

            // Add DLP headers to response
            if (result.detection.hasDetections) {
              response.http?.headers.set('X-DLP-Scanned', 'true');
              response.http?.headers.set('X-DLP-Audit-Id', result.auditEventId);
            }
          }
        },
      };
    },
  };
}

export default DLPApolloPlugin;
