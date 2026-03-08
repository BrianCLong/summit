"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deprecationTrackingPlugin = deprecationTrackingPlugin;
const graphql_1 = require("graphql");
const graphql_2 = require("graphql");
const logger_js_1 = require("../../config/logger.js");
/**
 * Apollo plugin to track and log deprecated field usage
 */
function deprecationTrackingPlugin(config = {}) {
    const { logUsage = true, trackMetrics = true } = config;
    return {
        async requestDidStart() {
            return {
                async willSendResponse({ request, response, contextValue }) {
                    if (!request.query || !contextValue.schema)
                        return;
                    try {
                        // Extract deprecated fields from the query
                        const deprecatedFields = extractDeprecatedFields(request.query, contextValue.schema);
                        if (deprecatedFields.length === 0)
                            return;
                        // Log deprecated field usage
                        if (logUsage) {
                            logger_js_1.logger.warn({
                                userId: contextValue.user?.id,
                                tenantId: contextValue.tenantId,
                                operationName: request.operationName,
                                deprecatedFields: deprecatedFields.map(f => f.path),
                                query: request.query
                            }, 'GraphQL query uses deprecated fields');
                        }
                        // Add deprecation warnings to response extensions
                        if (!response.body || response.body.kind !== 'single')
                            return;
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
                                logger_js_1.logger.info({
                                    metric: 'graphql.deprecated_field.usage',
                                    field: field.path,
                                    userId: contextValue.user?.id
                                }, 'Deprecated field metric');
                            }
                        }
                    }
                    catch (error) {
                        logger_js_1.logger.error({ error }, 'Error in deprecation tracking plugin');
                    }
                }
            };
        }
    };
}
/**
 * Extract deprecated fields from a GraphQL query
 */
function extractDeprecatedFields(query, schema) {
    const deprecatedFields = [];
    const document = (0, graphql_2.parse)(query);
    const typeInfo = { path: [] };
    (0, graphql_2.visit)(document, {
        Field: {
            enter(node) {
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
                    const fieldType = field ? (0, graphql_1.getNamedType)(field.type) : null;
                    if (fieldType && (0, graphql_1.isObjectType)(fieldType)) {
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
                    const typeName = parent.name?.value;
                    if (typeName) {
                        const type = schema.getType(typeName);
                        if (type && (0, graphql_1.isObjectType)(type)) {
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
function parseDeprecationReason(deprecationReason) {
    let reason = deprecationReason;
    let sunsetDate;
    let replacement;
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
