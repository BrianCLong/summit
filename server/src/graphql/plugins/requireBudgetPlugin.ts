/**
 * Apollo Server plugin to enforce @budget directive at runtime
 * Blocks any mutation field without @budget - no ad-hoc bypasses allowed
 */

import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { GraphQLError } from 'graphql';
import {
  visit,
  Kind,
  OperationDefinitionNode,
  SelectionSetNode,
  FieldNode,
} from 'graphql';
import logger from '../../utils/logger';

interface BudgetPluginOptions {
  /**
   * Whether to enforce budget directives (feature flag)
   */
  enforceBudget?: boolean;

  /**
   * Whether to log violations for monitoring
   */
  logViolations?: boolean;

  /**
   * Tenant allowlist for bypass (emergency only)
   */
  allowlistTenants?: string[];

  /**
   * Operations allowlist for bypass (health checks, etc)
   */
  allowlistOperations?: string[];
}

interface MutationFieldInfo {
  fieldName: string;
  hasBudgetDirective: boolean;
  operationName?: string;
  tenantId?: string;
}

export function requireBudgetPlugin(
  options: BudgetPluginOptions = {},
): ApolloServerPlugin {
  const {
    enforceBudget = process.env.REQUIRE_BUDGET_PLUGIN === 'true',
    logViolations = true,
    allowlistTenants = [],
    allowlistOperations = [],
  } = options;

  return {
    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
      return {
        async didResolveOperation(requestContext) {
          // Only check mutations
          if (requestContext.operation?.operation !== 'mutation') {
            return;
          }

          const operationName =
            requestContext.operation.name?.value || 'unnamed';

          // Check operation allowlist
          if (allowlistOperations.includes(operationName)) {
            return;
          }

          // Extract tenant from context (set by auth middleware)
          const tenantId =
            requestContext.contextValue?.user?.tenantId ||
            requestContext.contextValue?.tenantId;

          // Check tenant allowlist
          if (tenantId && allowlistTenants.includes(tenantId)) {
            logger.warn('Budget enforcement bypassed for allowlisted tenant', {
              tenantId,
              operationName,
            });
            return;
          }

          const schema = requestContext.schema;
          const mutationType = schema.getMutationType();

          if (!mutationType) {
            return; // No mutation type defined
          }

          // Extract selected mutation fields
          const selectedFields = extractMutationFields(
            requestContext.operation,
          );
          const violations: MutationFieldInfo[] = [];

          // Check each selected field for @budget directive
          for (const fieldName of selectedFields) {
            const field = mutationType.getFields()[fieldName];

            if (!field) {
              continue; // Field doesn't exist (will error elsewhere)
            }

            const hasBudgetDirective = !!field.astNode?.directives?.some(
              (directive) => directive.name.value === 'budget',
            );

            const fieldInfo: MutationFieldInfo = {
              fieldName,
              hasBudgetDirective,
              operationName,
              tenantId,
            };

            if (!hasBudgetDirective) {
              violations.push(fieldInfo);
            }
          }

          // Handle violations
          if (violations.length > 0) {
            const violationFields = violations.map((v) => v.fieldName);

            if (logViolations) {
              logger.error('Mutation fields missing @budget directive', {
                operationName,
                tenantId,
                violations: violationFields,
                enforced: enforceBudget,
              });
            }

            if (enforceBudget) {
              throw new GraphQLError(
                `Mutation fields missing required @budget directive: ${violationFields.join(', ')}. ` +
                  `All mutations must declare budget limits for cost control.`,
                {
                  extensions: {
                    code: 'BUDGET_DIRECTIVE_REQUIRED',
                    violations: violationFields,
                    operationName,
                    tenantId,
                  },
                },
              );
            } else {
              // Warn mode: log but allow execution
              logger.warn(
                'Budget directive violations detected but not enforced',
                {
                  operationName,
                  tenantId,
                  violations: violationFields,
                },
              );
            }
          } else {
            logger.debug('All mutation fields have @budget directive', {
              operationName,
              tenantId,
              fields: selectedFields,
            });
          }
        },
      };
    },
  };
}

/**
 * Extract mutation field names from operation document
 */
function extractMutationFields(operation: OperationDefinitionNode): string[] {
  const fieldNames: Set<string> = new Set();

  visit(operation, {
    Field(node: FieldNode, key, parent, path, ancestors) {
      // Only consider top-level mutation fields
      // Check if this field is directly under the mutation root
      const isTopLevel = ancestors.some((ancestor, index) => {
        return (
          ancestor.kind === Kind.OPERATION_DEFINITION &&
          ancestor.operation === 'mutation' &&
          index === ancestors.length - 2 // Second to last ancestor
        );
      });

      if (isTopLevel && node.name.value) {
        fieldNames.add(node.name.value);
      }
    },
  });

  return Array.from(fieldNames);
}

/**
 * Create plugin with feature flag control
 */
export function createRequireBudgetPlugin(): ApolloServerPlugin {
  return requireBudgetPlugin({
    enforceBudget: process.env.REQUIRE_BUDGET_ENFORCEMENT === 'true',
    logViolations: process.env.LOG_BUDGET_VIOLATIONS !== 'false',
    allowlistTenants: process.env.BUDGET_ALLOWLIST_TENANTS?.split(',') || [],
    allowlistOperations: process.env.BUDGET_ALLOWLIST_OPERATIONS?.split(
      ',',
    ) || ['healthCheck', 'introspectionQuery'],
  });
}

/**
 * Metrics for monitoring plugin effectiveness
 */
export const budgetPluginMetrics = {
  violationsDetected: 0,
  violationsEnforced: 0,
  allowlistBypasses: 0,

  recordViolation(enforced: boolean): void {
    this.violationsDetected++;
    if (enforced) {
      this.violationsEnforced++;
    }
  },

  recordBypass(): void {
    this.allowlistBypasses++;
  },

  getStats() {
    return {
      violationsDetected: this.violationsDetected,
      violationsEnforced: this.violationsEnforced,
      allowlistBypasses: this.allowlistBypasses,
      enforcementRate:
        this.violationsDetected > 0
          ? this.violationsEnforced / this.violationsDetected
          : 1.0,
    };
  },
};
