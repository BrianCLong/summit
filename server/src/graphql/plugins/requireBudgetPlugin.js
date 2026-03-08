"use strict";
// @ts-nocheck
/**
 * Apollo Server plugin to enforce @budget directive at runtime
 * Blocks any mutation field without @budget - no ad-hoc bypasses allowed
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.budgetPluginMetrics = void 0;
exports.requireBudgetPlugin = requireBudgetPlugin;
exports.createRequireBudgetPlugin = createRequireBudgetPlugin;
const graphql_1 = require("graphql");
const graphql_2 = require("graphql");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
function requireBudgetPlugin(options = {}) {
    const { enforceBudget = process.env.REQUIRE_BUDGET_PLUGIN === 'true', logViolations = true, allowlistTenants = [], allowlistOperations = [], } = options;
    return {
        async requestDidStart() {
            return {
                async didResolveOperation(requestContext) {
                    // Only check mutations
                    if (requestContext.operation?.operation !== 'mutation') {
                        return;
                    }
                    const operationName = requestContext.operation.name?.value || 'unnamed';
                    // Check operation allowlist
                    if (allowlistOperations.includes(operationName)) {
                        return;
                    }
                    // Extract tenant from context (set by auth middleware)
                    const tenantId = requestContext.contextValue?.user?.tenantId ||
                        requestContext.contextValue?.tenantId;
                    // Check tenant allowlist
                    if (tenantId && allowlistTenants.includes(tenantId)) {
                        logger_js_1.default.warn('Budget enforcement bypassed for allowlisted tenant', {
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
                    const selectedFields = extractMutationFields(requestContext.operation);
                    const violations = [];
                    // Check each selected field for @budget directive
                    for (const fieldName of selectedFields) {
                        const field = mutationType.getFields()[fieldName];
                        if (!field) {
                            continue; // Field doesn't exist (will error elsewhere)
                        }
                        const hasBudgetDirective = !!field.astNode?.directives?.some((directive) => directive.name.value === 'budget');
                        const fieldInfo = {
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
                            logger_js_1.default.error('Mutation fields missing @budget directive', {
                                operationName,
                                tenantId,
                                violations: violationFields,
                                enforced: enforceBudget,
                            });
                        }
                        if (enforceBudget) {
                            throw new graphql_1.GraphQLError(`Mutation fields missing required @budget directive: ${violationFields.join(', ')}. ` +
                                `All mutations must declare budget limits for cost control.`, {
                                extensions: {
                                    code: 'BUDGET_DIRECTIVE_REQUIRED',
                                    violations: violationFields,
                                    operationName,
                                    tenantId,
                                },
                            });
                        }
                        else {
                            // Warn mode: log but allow execution
                            logger_js_1.default.warn('Budget directive violations detected but not enforced', {
                                operationName,
                                tenantId,
                                violations: violationFields,
                            });
                        }
                    }
                    else {
                        logger_js_1.default.debug('All mutation fields have @budget directive', {
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
function extractMutationFields(operation) {
    const fieldNames = new Set();
    (0, graphql_2.visit)(operation, {
        Field(node, key, parent, path, ancestors) {
            // Only consider top-level mutation fields
            // Check if this field is directly under the mutation root
            const isTopLevel = ancestors.some((ancestor, index) => {
                return (!Array.isArray(ancestor) &&
                    ancestor.kind === graphql_2.Kind.OPERATION_DEFINITION &&
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
function createRequireBudgetPlugin() {
    return requireBudgetPlugin({
        enforceBudget: process.env.REQUIRE_BUDGET_ENFORCEMENT === 'true',
        logViolations: process.env.LOG_BUDGET_VIOLATIONS !== 'false',
        allowlistTenants: process.env.BUDGET_ALLOWLIST_TENANTS?.split(',') || [],
        allowlistOperations: process.env.BUDGET_ALLOWLIST_OPERATIONS?.split(',') || ['healthCheck', 'introspectionQuery'],
    });
}
/**
 * Metrics for monitoring plugin effectiveness
 */
exports.budgetPluginMetrics = {
    violationsDetected: 0,
    violationsEnforced: 0,
    allowlistBypasses: 0,
    recordViolation(enforced) {
        this.violationsDetected++;
        if (enforced) {
            this.violationsEnforced++;
        }
    },
    recordBypass() {
        this.allowlistBypasses++;
    },
    getStats() {
        return {
            violationsDetected: this.violationsDetected,
            violationsEnforced: this.violationsEnforced,
            allowlistBypasses: this.allowlistBypasses,
            enforcementRate: this.violationsDetected > 0
                ? this.violationsEnforced / this.violationsDetected
                : 1.0,
        };
    },
};
