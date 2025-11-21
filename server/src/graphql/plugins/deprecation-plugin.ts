import type {
  ApolloServerPlugin,
  GraphQLRequestListener,
} from '@apollo/server';
import {
  GraphQLSchema,
  getNamedType,
  isObjectType,
  parse,
  visit,
  Kind,
  type DocumentNode,
  type FieldNode,
  type GraphQLField,
  type GraphQLObjectType,
} from 'graphql';
import pino from 'pino';

const logger = pino({ name: 'graphql-deprecation' });

export interface DeprecationPluginConfig {
  /** Log deprecated field usage (default: true) */
  logUsage?: boolean;
  /** Track metrics for deprecated field usage (default: true) */
  trackMetrics?: boolean;
  /** Custom metrics handler */
  onDeprecatedFieldUsed?: (info: DeprecatedFieldInfo) => void;
}

export interface DeprecatedFieldInfo {
  path: string;
  reason: string | undefined;
  sunsetDate?: string;
  replacement?: string;
  userId?: string;
  tenantId?: string;
  operationName?: string | null;
}

// In-memory metrics tracking
const deprecatedFieldMetrics = new Map<string, {
  field: string;
  count: number;
  lastAccess: Date;
  uniqueUsers: Set<string>;
}>();

/**
 * Get current deprecated field usage metrics
 */
export function getDeprecatedFieldMetrics() {
  return Array.from(deprecatedFieldMetrics.entries()).map(([field, data]) => ({
    field,
    count: data.count,
    lastAccess: data.lastAccess,
    uniqueUserCount: data.uniqueUsers.size,
  }));
}

/**
 * Clear deprecated field metrics (useful for testing)
 */
export function clearDeprecatedFieldMetrics(): void {
  deprecatedFieldMetrics.clear();
}

/**
 * Parse structured deprecation reason to extract metadata
 * Expected format: "Use 'newField' instead. Sunset: 2025-12-31"
 */
function parseDeprecationReason(deprecationReason: string): {
  reason: string;
  sunsetDate?: string;
  replacement?: string;
} {
  const reason = deprecationReason;
  let sunsetDate: string | undefined;
  let replacement: string | undefined;

  // Extract sunset date (formats: "Sunset: 2025-12-31" or "removed after 2025-12-31")
  const sunsetMatch = deprecationReason.match(/(?:Sunset:\s*|removed (?:after|on)\s*)(\d{4}-\d{2}-\d{2})/i);
  if (sunsetMatch) {
    sunsetDate = sunsetMatch[1];
  }

  // Extract replacement field (formats: "Use 'newField'" or "Use `newField`")
  const replacementMatch = deprecationReason.match(/Use ['"`]([^'"`]+)['"`]/i);
  if (replacementMatch) {
    replacement = replacementMatch[1];
  }

  return { reason, sunsetDate, replacement };
}

/**
 * Extract deprecated fields from a GraphQL query
 */
function extractDeprecatedFields(
  document: DocumentNode,
  schema: GraphQLSchema
): DeprecatedFieldInfo[] {
  const deprecatedFields: DeprecatedFieldInfo[] = [];
  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  const subscriptionType = schema.getSubscriptionType();

  if (!queryType && !mutationType && !subscriptionType) {
    return deprecatedFields;
  }

  // Track the current type context as we traverse
  const typeStack: (GraphQLObjectType | null)[] = [];
  const pathStack: string[] = [];

  visit(document, {
    OperationDefinition: {
      enter(node) {
        switch (node.operation) {
          case 'query':
            typeStack.push(queryType || null);
            break;
          case 'mutation':
            typeStack.push(mutationType || null);
            break;
          case 'subscription':
            typeStack.push(subscriptionType || null);
            break;
        }
      },
      leave() {
        typeStack.pop();
      },
    },
    Field: {
      enter(node: FieldNode) {
        const fieldName = node.name.value;
        pathStack.push(fieldName);

        const currentType = typeStack[typeStack.length - 1];
        if (!currentType) return;

        const fields = currentType.getFields();
        const field: GraphQLField<any, any> | undefined = fields[fieldName];

        if (field) {
          // Check if field is deprecated
          if (field.deprecationReason) {
            const { reason, sunsetDate, replacement } = parseDeprecationReason(
              field.deprecationReason
            );

            deprecatedFields.push({
              path: pathStack.join('.'),
              reason,
              sunsetDate,
              replacement,
            });
          }

          // Update type context for nested fields
          const fieldType = getNamedType(field.type);
          if (isObjectType(fieldType)) {
            typeStack.push(fieldType);
          } else {
            typeStack.push(null);
          }
        } else {
          typeStack.push(null);
        }
      },
      leave() {
        pathStack.pop();
        typeStack.pop();
      },
    },
  });

  return deprecatedFields;
}

/**
 * Apollo Server plugin to track and log deprecated field usage.
 *
 * Features:
 * - Logs when deprecated fields are accessed
 * - Adds deprecation warnings to response extensions
 * - Tracks usage metrics for monitoring/alerting
 * - Parses structured deprecation reasons for sunset dates
 *
 * @example
 * const server = new ApolloServer({
 *   typeDefs,
 *   resolvers,
 *   plugins: [
 *     deprecationTrackingPlugin({ logUsage: true }),
 *   ]
 * });
 */
export function deprecationTrackingPlugin(
  config: DeprecationPluginConfig = {}
): ApolloServerPlugin {
  const { logUsage = true, trackMetrics = true, onDeprecatedFieldUsed } = config;

  return {
    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
      return {
        async willSendResponse(ctx) {
          // Skip introspection queries
          if (ctx.operationName === 'IntrospectionQuery') {
            return;
          }

          // Get schema from context
          const schema = ctx.contextValue?.schema as GraphQLSchema | undefined;
          if (!schema || !ctx.document) {
            return;
          }

          try {
            // Extract deprecated fields from the query
            const deprecatedFields = extractDeprecatedFields(ctx.document, schema);

            if (deprecatedFields.length === 0) {
              return;
            }

            // Add user/tenant context
            const userId = ctx.contextValue?.user?.id;
            const tenantId = ctx.contextValue?.tenantId;

            const fieldsWithContext = deprecatedFields.map(field => ({
              ...field,
              userId,
              tenantId,
              operationName: ctx.operationName,
            }));

            // Log deprecated field usage
            if (logUsage) {
              logger.warn({
                userId,
                tenantId,
                operationName: ctx.operationName,
                deprecatedFields: fieldsWithContext.map(f => f.path),
                query: ctx.request.query,
              }, 'GraphQL query uses deprecated fields');
            }

            // Track metrics
            if (trackMetrics) {
              for (const field of fieldsWithContext) {
                const existing = deprecatedFieldMetrics.get(field.path);
                if (existing) {
                  existing.count++;
                  existing.lastAccess = new Date();
                  if (userId) {
                    existing.uniqueUsers.add(userId);
                  }
                } else {
                  deprecatedFieldMetrics.set(field.path, {
                    field: field.path,
                    count: 1,
                    lastAccess: new Date(),
                    uniqueUsers: new Set(userId ? [userId] : []),
                  });
                }
              }
            }

            // Call custom handler
            if (onDeprecatedFieldUsed) {
              for (const field of fieldsWithContext) {
                onDeprecatedFieldUsed(field);
              }
            }

            // Add deprecation warnings to response extensions
            if (ctx.response.body?.kind === 'single') {
              const result = ctx.response.body.singleResult;
              if (!result.extensions) {
                result.extensions = {};
              }

              result.extensions.deprecations = fieldsWithContext.map(field => ({
                field: field.path,
                reason: field.reason,
                sunsetDate: field.sunsetDate,
                replacement: field.replacement,
              }));
            }
          } catch (error) {
            logger.error({ error }, 'Error in deprecation tracking plugin');
          }
        },
      };
    },
  };
}

// Default export for consistency with other plugins
const deprecationPlugin = deprecationTrackingPlugin();
export default deprecationPlugin;
