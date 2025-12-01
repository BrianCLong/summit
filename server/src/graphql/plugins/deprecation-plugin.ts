import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { GraphQLSchema, GraphQLField, GraphQLObjectType, getNamedType, isObjectType } from 'graphql';
import { parse, visit, FieldNode } from 'graphql';
import { logger } from '../../lib/logger';

export interface DeprecationPluginConfig {
  /** Log deprecated field usage (default: true) */
  logUsage?: boolean;
  /** Track metrics for deprecated field usage (default: true) */
  trackMetrics?: boolean;
}

interface DeprecatedField {
  path: string;
  reason: string | undefined;
  sunsetDate?: string;
  replacement?: string;
}

/**
 * Apollo plugin to track and log deprecated field usage
 */
export function deprecationTrackingPlugin(
  config: DeprecationPluginConfig = {}
): ApolloServerPlugin {
  const { logUsage = true, trackMetrics = true } = config;

  return {
    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
      return {
        async willSendResponse({ request, response, contextValue }) {
          if (!request.query || !contextValue.schema) return;

          try {
            // Extract deprecated fields from the query
            const deprecatedFields = extractDeprecatedFields(
              request.query,
              contextValue.schema
            );

            if (deprecatedFields.length === 0) return;

            // Log deprecated field usage
            if (logUsage) {
              logger.warn({
                userId: contextValue.user?.id,
                tenantId: contextValue.tenantId,
                operationName: request.operationName,
                deprecatedFields: deprecatedFields.map(f => f.path),
                query: request.query
              }, 'GraphQL query uses deprecated fields');
            }

            // Add deprecation warnings to response extensions
            if (!response.body || response.body.kind !== 'single') return;

            if (!response.body.singleResult.extensions) {
              response.body.singleResult.extensions = {};
            }

            response.body.singleResult.extensions.deprecations = deprecatedFields.map(field => ({
              field: field.path,
              reason: field.reason,
              sunsetDate: field.sunsetDate,
              replacement: field.replacement
            }));

            // Track metrics
            if (trackMetrics) {
              for (const field of deprecatedFields) {
                // Implement your metrics tracking here
                logger.info({
                  metric: 'graphql.deprecated_field.usage',
                  field: field.path,
                  userId: contextValue.user?.id
                }, 'Deprecated field metric');
              }
            }
          } catch (error) {
            logger.error({ error }, 'Error in deprecation tracking plugin');
          }
        }
      };
    }
  };
}

/**
 * Extract deprecated fields from a GraphQL query
 */
function extractDeprecatedFields(query: string, schema: GraphQLSchema): DeprecatedField[] {
  const deprecatedFields: DeprecatedField[] = [];
  const document = parse(query);
  const typeInfo: { currentType?: GraphQLObjectType; path: string[] } = { path: [] };

  visit(document, {
    Field: {
      enter(node: FieldNode) {
        const fieldName = node.name.value;
        typeInfo.path.push(fieldName);

        if (typeInfo.currentType) {
          const fields = typeInfo.currentType.getFields();
          const field = fields[fieldName];

          if (field && field.deprecationReason) {
            const path = typeInfo.path.join('.');

            // Parse deprecation reason for additional metadata
            const { reason, sunsetDate, replacement } = parseDeprecationReason(field.deprecationReason);

            deprecatedFields.push({
              path,
              reason,
              sunsetDate,
              replacement
            });
          }

          // Update current type for nested fields
          const fieldType = field ? getNamedType(field.type) : null;
          if (fieldType && isObjectType(fieldType)) {
            typeInfo.currentType = fieldType;
          }
        }
      },
      leave() {
        typeInfo.path.pop();
      }
    },
    SelectionSet: {
      enter(node, _key, parent) {
        if (parent && 'name' in parent) {
          const typeName = (parent as any).name?.value;
          if (typeName) {
            const type = schema.getType(typeName);
            if (type && isObjectType(type)) {
              typeInfo.currentType = type;
            }
          }
        }
      }
    }
  });

  return deprecatedFields;
}

/**
 * Parse structured deprecation reason
 * Expected format: "Use 'newField' instead. Sunset: 2025-12-31"
 */
function parseDeprecationReason(deprecationReason: string): {
  reason: string;
  sunsetDate?: string;
  replacement?: string;
} {
  let reason = deprecationReason;
  let sunsetDate: string | undefined;
  let replacement: string | undefined;

  // Extract sunset date
  const sunsetMatch = deprecationReason.match(/Sunset:\s*(\d{4}-\d{2}-\d{2})/i);
  if (sunsetMatch) {
    sunsetDate = sunsetMatch[1];
  }

  // Extract replacement field
  const replacementMatch = deprecationReason.match(/Use ['"]([^'"]+)['"] instead/i);
  if (replacementMatch) {
    replacement = replacementMatch[1];
  }

  return { reason, sunsetDate, replacement };
}
