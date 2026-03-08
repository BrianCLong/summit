"use strict";
/**
 * GraphQL Query Complexity Analysis and Depth Limiting
 * Prevents expensive queries and enforces reasonable limits
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultComplexityConfig = exports.QueryComplexityAnalyzer = void 0;
exports.createComplexityLimitRule = createComplexityLimitRule;
exports.createDepthLimitRule = createDepthLimitRule;
exports.paginatedComplexity = paginatedComplexity;
exports.searchComplexity = searchComplexity;
const graphql_1 = require("graphql");
/**
 * Query Complexity Analyzer
 */
class QueryComplexityAnalyzer {
    config;
    schema;
    constructor(schema, config) {
        this.schema = schema;
        this.config = {
            maxComplexity: config?.maxComplexity ?? 1000,
            maxDepth: config?.maxDepth ?? 10,
            defaultComplexity: config?.defaultComplexity ?? 1,
            listMultiplier: config?.listMultiplier ?? 10,
            throwOnLimit: config?.throwOnLimit ?? true,
            customComplexity: config?.customComplexity ?? new Map(),
        };
    }
    /**
     * Analyze a GraphQL document
     */
    analyze(document) {
        const breakdown = [];
        const errors = [];
        let maxDepth = 0;
        let totalComplexity = 0;
        // Get operation
        const operation = document.definitions.find((def) => def.kind === graphql_1.Kind.OPERATION_DEFINITION);
        if (!operation) {
            return {
                complexity: 0,
                depth: 0,
                breakdown: [],
                violatesLimit: false,
                errors: ['No operation found in document'],
            };
        }
        // Get fragments
        const fragments = new Map();
        for (const def of document.definitions) {
            if (def.kind === graphql_1.Kind.FRAGMENT_DEFINITION) {
                fragments.set(def.name.value, def);
            }
        }
        // Determine root type
        const rootType = this.getRootType(operation.operation);
        if (!rootType) {
            return {
                complexity: 0,
                depth: 0,
                breakdown: [],
                violatesLimit: false,
                errors: [`Root type not found for operation: ${operation.operation}`],
            };
        }
        // Analyze selections
        const result = this.analyzeSelectionSet(operation.selectionSet.selections, rootType, fragments, [], 0);
        totalComplexity = result.complexity;
        maxDepth = result.depth;
        breakdown.push(...result.breakdown);
        // Check limits
        const violatesLimit = totalComplexity > this.config.maxComplexity ||
            maxDepth > this.config.maxDepth;
        if (totalComplexity > this.config.maxComplexity) {
            errors.push(`Query complexity ${totalComplexity} exceeds maximum ${this.config.maxComplexity}`);
        }
        if (maxDepth > this.config.maxDepth) {
            errors.push(`Query depth ${maxDepth} exceeds maximum ${this.config.maxDepth}`);
        }
        return {
            complexity: totalComplexity,
            depth: maxDepth,
            breakdown,
            violatesLimit,
            errors,
        };
    }
    /**
     * Analyze a selection set
     */
    analyzeSelectionSet(selections, parentType, fragments, path, currentDepth) {
        let totalComplexity = 0;
        let maxDepth = currentDepth;
        const breakdown = [];
        for (const selection of selections) {
            if (selection.kind === graphql_1.Kind.FIELD) {
                const result = this.analyzeField(selection, parentType, fragments, path, currentDepth);
                totalComplexity += result.complexity;
                maxDepth = Math.max(maxDepth, result.depth);
                breakdown.push(...result.breakdown);
            }
            else if (selection.kind === graphql_1.Kind.FRAGMENT_SPREAD) {
                const fragment = fragments.get(selection.name.value);
                if (fragment) {
                    const fragmentType = this.schema.getType(fragment.typeCondition.name.value);
                    if (fragmentType) {
                        const result = this.analyzeSelectionSet(fragment.selectionSet.selections, fragmentType, fragments, path, currentDepth);
                        totalComplexity += result.complexity;
                        maxDepth = Math.max(maxDepth, result.depth);
                        breakdown.push(...result.breakdown);
                    }
                }
            }
            else if (selection.kind === graphql_1.Kind.INLINE_FRAGMENT) {
                const fragmentType = selection.typeCondition
                    ? this.schema.getType(selection.typeCondition.name.value)
                    : parentType;
                if (fragmentType) {
                    const result = this.analyzeSelectionSet(selection.selectionSet.selections, fragmentType, fragments, path, currentDepth);
                    totalComplexity += result.complexity;
                    maxDepth = Math.max(maxDepth, result.depth);
                    breakdown.push(...result.breakdown);
                }
            }
        }
        return { complexity: totalComplexity, depth: maxDepth, breakdown };
    }
    /**
     * Analyze a field
     */
    analyzeField(field, parentType, fragments, path, currentDepth) {
        const fieldName = field.name.value;
        const fieldPath = [...path, fieldName];
        // Skip introspection fields
        if (fieldName.startsWith('__')) {
            return { complexity: 0, depth: currentDepth, breakdown: [] };
        }
        const fieldDef = parentType.getFields()[fieldName];
        if (!fieldDef) {
            return { complexity: 0, depth: currentDepth, breakdown: [] };
        }
        // Get field arguments
        const args = {};
        if (field.arguments) {
            for (const arg of field.arguments) {
                if (arg.value.kind === graphql_1.Kind.INT) {
                    args[arg.name.value] = parseInt(arg.value.value, 10);
                }
                else if (arg.value.kind === graphql_1.Kind.STRING) {
                    args[arg.name.value] = arg.value.value;
                }
                else if (arg.value.kind === graphql_1.Kind.BOOLEAN) {
                    args[arg.name.value] = arg.value.value;
                }
            }
        }
        // Calculate child complexity
        let childComplexity = 0;
        let maxChildDepth = currentDepth;
        if (field.selectionSet) {
            const fieldType = (0, graphql_1.getNamedType)(fieldDef.type);
            if (fieldType instanceof graphql_1.GraphQLObjectType) {
                const result = this.analyzeSelectionSet(field.selectionSet.selections, fieldType, fragments, fieldPath, currentDepth + 1);
                childComplexity = result.complexity;
                maxChildDepth = result.depth;
            }
        }
        // Calculate field complexity
        const customKey = `${parentType.name}.${fieldName}`;
        const customComplexity = this.config.customComplexity?.get(customKey);
        let fieldComplexity;
        if (typeof customComplexity === 'function') {
            fieldComplexity = customComplexity(args, childComplexity);
        }
        else if (typeof customComplexity === 'number') {
            fieldComplexity = customComplexity;
        }
        else {
            fieldComplexity = this.config.defaultComplexity;
        }
        // Apply list multiplier
        let multiplier = 1;
        if ((0, graphql_1.isListType)(fieldDef.type) || fieldDef.type.ofType?.name) {
            const limit = args.limit || args.first || this.config.listMultiplier;
            multiplier = Math.min(limit, this.config.listMultiplier);
        }
        const totalComplexity = (fieldComplexity + childComplexity) * multiplier;
        const breakdown = [
            {
                path: fieldPath,
                fieldComplexity,
                childComplexity,
                totalComplexity,
                multiplier: multiplier > 1 ? multiplier : undefined,
            },
        ];
        return {
            complexity: totalComplexity,
            depth: maxChildDepth,
            breakdown,
        };
    }
    /**
     * Get root type for operation
     */
    getRootType(operation) {
        switch (operation) {
            case 'query':
                return this.schema.getQueryType() || null;
            case 'mutation':
                return this.schema.getMutationType() || null;
            case 'subscription':
                return this.schema.getSubscriptionType() || null;
            default:
                return null;
        }
    }
}
exports.QueryComplexityAnalyzer = QueryComplexityAnalyzer;
/**
 * Create a validation rule for query complexity
 */
function createComplexityLimitRule(config = {}) {
    return function ComplexityLimit(context) {
        return {
            Document(node) {
                const analyzer = new QueryComplexityAnalyzer(context.getSchema(), config);
                const analysis = analyzer.analyze(node);
                if (analysis.violatesLimit && config.throwOnLimit !== false) {
                    for (const error of analysis.errors) {
                        context.reportError(new graphql_1.GraphQLError(error, {
                            extensions: {
                                code: 'COMPLEXITY_LIMIT_EXCEEDED',
                                complexity: analysis.complexity,
                                maxComplexity: config.maxComplexity,
                                depth: analysis.depth,
                                maxDepth: config.maxDepth,
                                breakdown: analysis.breakdown,
                            },
                        }));
                    }
                }
            },
        };
    };
}
/**
 * Query depth limiter validation rule
 */
function createDepthLimitRule(maxDepth = 10) {
    return function DepthLimit(context) {
        let currentDepth = 0;
        let maxDepthReached = 0;
        return {
            Field: {
                enter() {
                    currentDepth++;
                    maxDepthReached = Math.max(maxDepthReached, currentDepth);
                    if (currentDepth > maxDepth) {
                        context.reportError(new graphql_1.GraphQLError(`Query depth ${currentDepth} exceeds maximum depth ${maxDepth}`, {
                            extensions: {
                                code: 'DEPTH_LIMIT_EXCEEDED',
                                depth: currentDepth,
                                maxDepth,
                            },
                        }));
                    }
                },
                leave() {
                    currentDepth--;
                },
            },
        };
    };
}
/**
 * Helper to create custom complexity for paginated fields
 */
function paginatedComplexity(baseComplexity = 1) {
    return (args, childComplexity) => {
        const limit = args.limit || args.first || 10;
        return (baseComplexity + childComplexity) * Math.min(limit, 100);
    };
}
/**
 * Helper to create custom complexity for search fields
 */
function searchComplexity(baseComplexity = 10) {
    return (args, childComplexity) => {
        const multiplier = args.fuzzy ? 2 : 1; // Fuzzy search is more expensive
        return (baseComplexity + childComplexity) * multiplier;
    };
}
/**
 * Default complexity configuration
 */
exports.defaultComplexityConfig = {
    maxComplexity: 1000,
    maxDepth: 10,
    defaultComplexity: 1,
    listMultiplier: 10,
    throwOnLimit: true,
    customComplexity: new Map([
        // Queries
        ['Query.entities', paginatedComplexity(2)],
        ['Query.relationships', paginatedComplexity(2)],
        ['Query.investigations', paginatedComplexity(1)],
        ['Query.semanticSearch', searchComplexity(10)],
        ['Query.extractEntities', 20],
        ['Query.analyzeRelationships', 15],
        ['Query.generateEntityInsights', 25],
        ['Query.graphRagAnswer', 50],
        // Mutations
        ['Mutation.generateEntitiesFromText', 30],
        ['Mutation.enhanceEntitiesWithAI', 40],
        ['Mutation.applyAISuggestions', 20],
    ]),
};
