"use strict";
// @ts-nocheck
/**
 * GraphQL @budget directive - Enforces token and cost limits at the resolver level
 * Provides deterministic budget enforcement with comprehensive telemetry
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetError = void 0;
exports.budgetDirective = budgetDirective;
exports.createBudgetContext = createBudgetContext;
const graphql_1 = require("graphql");
const utils_1 = require("@graphql-tools/utils");
const tokcount_enhanced_js_1 = require("../../lib/tokcount-enhanced.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
class BudgetError extends Error {
    details;
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = 'BudgetError';
    }
}
exports.BudgetError = BudgetError;
/**
 * Default prompt builder - extracts relevant input from GraphQL args
 */
function defaultPromptBuilder(fieldName, args, ctx) {
    // Extract common patterns from mutation arguments
    const input = args.input || args;
    const messages = [];
    // Build contextual messages based on mutation type
    if (typeof input.prompt === 'string') {
        messages.push({ role: 'user', content: input.prompt });
    }
    else if (typeof input.description === 'string' || typeof input.content === 'string') {
        messages.push({
            role: 'user',
            content: (input.description || input.content),
        });
    }
    else if (typeof input.query === 'string') {
        messages.push({ role: 'user', content: input.query });
    }
    else {
        // Generic serialization for complex inputs
        const serialized = JSON.stringify(input).substring(0, 10000); // Limit to prevent huge payloads
        messages.push({ role: 'user', content: `Process: ${serialized}` });
    }
    return { messages };
}
/**
 * Wraps GraphQL resolvers with OTEL spans
 */
async function withOTEL(spanName, fn, ctx) {
    // Simple span simulation - in production, use actual OTEL
    const span = {
        spanName,
        attributes: {},
        setAttributes: (attrs) => {
            Object.assign(span.attributes, attrs);
        },
        end: () => {
            logger_js_1.default.debug('OTEL Span completed', {
                spanName,
                attributes: span.attributes,
            });
        },
    };
    if (ctx)
        ctx.span = span;
    try {
        const result = await fn(span);
        span.end();
        return result;
    }
    catch (error) {
        span.setAttributes({
            'error.message': error instanceof Error ? error.message : String(error),
        });
        span.end();
        throw error;
    }
}
/**
 * Creates the @budget directive transformer
 */
function budgetDirective(directiveName = 'budget') {
    const typeDefs = `
    directive @budget(
      capUSD: Float!
      tokenCeiling: Int = 0
      provider: String
      model: String
    ) on FIELD_DEFINITION
  `;
    const transformer = (schema) => (0, utils_1.mapSchema)(schema, {
        [utils_1.MapperKind.OBJECT_FIELD]: (fieldConfig) => {
            const directive = (0, utils_1.getDirective)(schema, fieldConfig, directiveName)?.[0];
            if (!directive)
                return fieldConfig;
            const { capUSD, tokenCeiling, provider, model } = directive;
            const originalResolve = fieldConfig.resolve ?? graphql_1.defaultFieldResolver;
            // Create the budget-enforced resolver
            const budgetEnforcedResolver = async (source, args, context, info) => {
                return withOTEL(`graphql.budget.${info.fieldName}`, async (span) => {
                    const startTime = Date.now();
                    try {
                        // 1. Build prompt payload for token estimation
                        const promptBuilder = context.safePromptBuilder || defaultPromptBuilder;
                        const promptPayload = promptBuilder(info.fieldName, args, context);
                        // 2. Estimate tokens and cost
                        const estimation = await (0, tokcount_enhanced_js_1.estimateTokensAndCost)({
                            payload: promptPayload,
                            provider: provider,
                            model,
                        });
                        // 3. Set telemetry attributes
                        span.setAttributes({
                            'budget.field_name': info.fieldName,
                            'budget.estimated.tokens': estimation.totalTokens,
                            'budget.estimated.usd': estimation.totalUSD,
                            'budget.provider': estimation.provider,
                            'budget.model': estimation.model,
                            'budget.cap_usd': capUSD,
                            'budget.token_ceiling': tokenCeiling || 0,
                            'user.tenant_id': context.user?.tenantId,
                            'user.id': context.user?.id,
                        });
                        // 4. Enforce token ceiling
                        if (tokenCeiling &&
                            tokenCeiling > 0 &&
                            estimation.totalTokens > tokenCeiling) {
                            context.metrics?.budget_denials_total.inc({
                                reason: 'token_ceiling',
                                tenant: context.user?.tenantId,
                                provider: estimation.provider,
                            });
                            const error = new BudgetError(`Token ceiling exceeded: ${estimation.totalTokens} > ${tokenCeiling}`, {
                                estimated: {
                                    tokens: estimation.totalTokens,
                                    usd: estimation.totalUSD,
                                },
                                limits: { capUSD, tokenCeiling },
                                provider: estimation.provider,
                                model: estimation.model,
                            });
                            span.setAttributes({
                                'budget.denied': true,
                                'budget.denial_reason': 'token_ceiling',
                            });
                            throw error;
                        }
                        // 5. Enforce cost cap
                        if (estimation.totalUSD > capUSD) {
                            context.metrics?.budget_denials_total.inc({
                                reason: 'cap_usd',
                                tenant: context.user?.tenantId,
                                provider: estimation.provider,
                            });
                            const error = new BudgetError(`Budget cap exceeded: $${estimation.totalUSD.toFixed(6)} > $${capUSD.toFixed(6)}`, {
                                estimated: {
                                    tokens: estimation.totalTokens,
                                    usd: estimation.totalUSD,
                                },
                                limits: { capUSD, tokenCeiling },
                                provider: estimation.provider,
                                model: estimation.model,
                            });
                            span.setAttributes({
                                'budget.denied': true,
                                'budget.denial_reason': 'cap_usd',
                            });
                            throw error;
                        }
                        // 6. Attach budget metadata to context for resolver use
                        context.__budget = estimation;
                        // 7. Audit log the budget check
                        await context.audit?.log({
                            type: 'BUDGET_CHECK_PASSED',
                            fieldName: info.fieldName,
                            estimation,
                            limits: { capUSD, tokenCeiling },
                            tenantId: context.user?.tenantId,
                            userId: context.user?.id,
                            timestamp: new Date().toISOString(),
                        });
                        // 8. Execute the original resolver
                        span.setAttributes({ 'budget.approved': true });
                        const result = await originalResolve(source, args, context, info);
                        // 9. Post-hoc reconciliation with actual usage (non-blocking)
                        setImmediate(async () => {
                            try {
                                const actualUsage = await context.tokcount?.reconcile(estimation);
                                if (actualUsage) {
                                    const errorRatio = (actualUsage.totalTokens || 1) /
                                        (estimation.totalTokens || 1);
                                    context.metrics?.token_estimation_error_ratio.observe(errorRatio);
                                    await context.audit?.log({
                                        type: 'TOKEN_USAGE_RECONCILED',
                                        fieldName: info.fieldName,
                                        estimated: estimation,
                                        actual: actualUsage,
                                        errorRatio,
                                        tenantId: context.user?.tenantId,
                                        timestamp: new Date().toISOString(),
                                    });
                                }
                            }
                            catch (reconcileError) {
                                logger_js_1.default.warn('Token usage reconciliation failed', {
                                    error: reconcileError instanceof Error
                                        ? reconcileError.message
                                        : String(reconcileError),
                                    fieldName: info.fieldName,
                                });
                            }
                        });
                        // 10. Set success telemetry
                        const duration = Date.now() - startTime;
                        span.setAttributes({
                            'budget.execution_time_ms': duration,
                            'budget.success': true,
                        });
                        return result;
                    }
                    catch (error) {
                        const duration = Date.now() - startTime;
                        span.setAttributes({
                            'budget.execution_time_ms': duration,
                            'budget.success': false,
                            'budget.error': error instanceof Error ? error.message : String(error),
                        });
                        // Audit log budget failures
                        await context.audit?.log({
                            type: 'BUDGET_CHECK_FAILED',
                            fieldName: info.fieldName,
                            error: error instanceof Error ? error.message : String(error),
                            tenantId: context.user?.tenantId,
                            userId: context.user?.id,
                            timestamp: new Date().toISOString(),
                        });
                        throw error;
                    }
                }, context);
            };
            return {
                ...fieldConfig,
                resolve: budgetEnforcedResolver,
            };
        },
    });
    return { typeDefs, transformer };
}
/**
 * Helper to create budget-aware GraphQL context
 */
function createBudgetContext(baseContext) {
    return {
        ...baseContext,
        safePromptBuilder: baseContext.safePromptBuilder || defaultPromptBuilder,
        metrics: baseContext.metrics || {
            budget_denials_total: { inc: () => { } },
            token_estimation_error_ratio: { observe: () => { } },
        },
        tokcount: baseContext.tokcount || { reconcile: async () => null },
        audit: baseContext.audit || { log: async () => { } },
    };
}
