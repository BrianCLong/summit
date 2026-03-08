"use strict";
/**
 * Maestro Safe Mutations
 * Type-safe, validated mutations for Maestro operations with rollback capabilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaestroSafeMutations = void 0;
exports.initializeAuthContext = initializeAuthContext;
const zod_1 = require("zod");
const client_1 = require("../api/client");
// Validation schemas for mutation inputs
const RunConfigSchema = zod_1.z.object({
    pipeline: zod_1.z.string().min(1, 'Pipeline name required'),
    autonomyLevel: zod_1.z.number().min(0).max(5, 'Autonomy level must be 0-5'),
    budgetCap: zod_1.z.number().positive('Budget cap must be positive'),
    canaryPercent: zod_1.z.number().min(0).max(1, 'Canary percent must be 0-1'),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    approvalRequired: zod_1.z.boolean().default(false),
});
const PolicyUpdateSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'Policy ID required'),
    enabled: zod_1.z.boolean(),
    rules: zod_1.z.array(zod_1.z.object({
        condition: zod_1.z.string(),
        action: zod_1.z.enum(['allow', 'deny', 'warn']),
        priority: zod_1.z.number().default(100),
    })),
    dryRun: zod_1.z.boolean().default(false),
});
const BudgetUpdateSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1, 'Tenant ID required'),
    monthlyUsd: zod_1.z.number().positive('Monthly budget must be positive'),
    alertThresholds: zod_1.z
        .object({
        warning: zod_1.z
            .number()
            .min(0)
            .max(1, 'Warning threshold must be 0-1')
            .default(0.8),
        critical: zod_1.z
            .number()
            .min(0)
            .max(1, 'Critical threshold must be 0-1')
            .default(0.95),
    })
        .optional(),
});
const RoutingPinSchema = zod_1.z.object({
    route: zod_1.z.string().min(1, 'Route required'),
    model: zod_1.z.string().min(1, 'Model required'),
    note: zod_1.z.string().optional(),
    expiresAt: zod_1.z.string().datetime().optional(),
});
let authContextProvider = null;
/**
 * Initialize the auth context provider - MUST be called before using mutations
 */
function initializeAuthContext(provider) {
    authContextProvider = provider;
}
/**
 * Get auth context with validation - throws if not properly initialized
 */
function getAuthContext() {
    if (!authContextProvider) {
        throw new Error('Auth context not initialized. Call initializeAuthContext() before using mutations.');
    }
    const userId = authContextProvider.getUserId();
    const tenantId = authContextProvider.getTenantId();
    if (!userId || userId === 'current-user') {
        throw new Error('Invalid userId: authentication required');
    }
    if (!tenantId || tenantId === 'current-tenant') {
        throw new Error('Invalid tenantId: tenant context required');
    }
    return { userId, tenantId };
}
/**
 * Safe mutation wrapper with validation, error handling, and rollback
 */
async function safeMutation(schema, input, mutationFn, rollbackFn) {
    // Get authenticated user and tenant from auth context
    const authContext = getAuthContext();
    const context = {
        userId: authContext.userId,
        tenantId: authContext.tenantId,
        timestamp: new Date().toISOString(),
        source: 'ui',
    };
    try {
        // Validate input
        const validInput = schema.parse(input);
        // Execute mutation
        const result = await mutationFn(validInput, context);
        // Create rollback function if provided
        const rollback = rollbackFn
            ? async () => await rollbackFn(result, context)
            : undefined;
        return {
            success: true,
            data: result,
            rollbackFn: rollback,
        };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return {
                success: false,
                error: 'Validation failed',
                validationErrors: error,
            };
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
/**
 * Maestro Safe Mutations API
 */
exports.MaestroSafeMutations = {
    /**
     * Safely create a new run with validation and budget checks
     */
    async createRun(input) {
        return safeMutation(RunConfigSchema, input, async (config, context) => {
            // Pre-flight checks
            const budgetCheck = await client_1.maestroApi.getBudgets();
            if (budgetCheck.remaining < config.budgetCap) {
                throw new Error(`Insufficient budget: ${budgetCheck.remaining} < ${config.budgetCap}`);
            }
            // Create the run
            const run = await client_1.maestroApi.createRun({
                ...config,
                metadata: {
                    ...config.metadata,
                    createdBy: context.userId,
                    tenantId: context.tenantId,
                },
            });
            return run;
        }, 
        // Rollback function - cancel the run if needed
        async (run, _context) => {
            if (run.status === 'queued' || run.status === 'running') {
                await client_1.maestroApi.cancelRun(run.id);
            }
        });
    },
    /**
     * Safely update policy with validation and rollback
     */
    async updatePolicy(input) {
        return safeMutation(PolicyUpdateSchema, input, async (policy, context) => {
            // Get current policy for rollback
            const currentPolicy = await client_1.maestroApi.getPolicy(policy.id);
            // Update policy
            const updatedPolicy = await client_1.maestroApi.updatePolicy(policy.id, {
                ...policy,
                updatedBy: context.userId,
                updatedAt: context.timestamp,
            });
            // Store original for rollback
            updatedPolicy._original =
                currentPolicy;
            return updatedPolicy;
        }, 
        // Rollback function - restore original policy
        async (updatedPolicy, _context) => {
            const original = updatedPolicy
                ._original;
            if (original) {
                await client_1.maestroApi.updatePolicy(updatedPolicy.id, original);
            }
        });
    },
    /**
     * Safely update tenant budget with validation
     */
    async updateBudget(input) {
        return safeMutation(BudgetUpdateSchema, input, async (budget, _context) => {
            // Get current budget for rollback
            const currentBudget = await client_1.maestroApi.getTenantBudget(budget.tenantId);
            // Validate business rules
            if (budget.monthlyUsd < currentBudget.spent) {
                throw new Error('New budget cannot be less than amount already spent');
            }
            // Update budget
            const updatedBudget = await client_1.maestroApi.putTenantBudget(budget.tenantId, budget.monthlyUsd);
            // Store original for rollback
            updatedBudget._original =
                currentBudget;
            return updatedBudget;
        }, 
        // Rollback function
        async (updatedBudget, _context) => {
            const original = updatedBudget
                ._original;
            if (original) {
                await client_1.maestroApi.putTenantBudget(original.tenantId, original.monthlyUsd);
            }
        });
    },
    /**
     * Safely pin routing with validation and auto-expiry
     */
    async pinRouting(input) {
        return safeMutation(RoutingPinSchema, input, async (pin, context) => {
            // Validate model is available
            const providers = await client_1.maestroApi.getProviders();
            const modelExists = providers.items.some((p) => p.models.includes(pin.model));
            if (!modelExists) {
                throw new Error(`Model not available: ${pin.model}`);
            }
            // Pin the route
            const result = await client_1.maestroApi.putRoutingPin({
                route: pin.route,
                model: pin.model,
                note: pin.note || `Pinned by ${context.userId} at ${context.timestamp}`,
            });
            // Schedule auto-unpin if expiry set
            if (pin.expiresAt) {
                const expiryDate = new Date(pin.expiresAt);
                const now = new Date();
                const delay = expiryDate.getTime() - now.getTime();
                if (delay > 0) {
                    setTimeout(async () => {
                        try {
                            await client_1.maestroApi.deleteRoutingPin(pin.route);
                        }
                        catch (_error) {
                            console.warn('Failed to auto-unpin route:', _error);
                        }
                    }, delay);
                }
            }
            return result;
        }, 
        // Rollback function - unpin the route
        async (result, _context) => {
            await client_1.maestroApi.deleteRoutingPin(result.route);
        });
    },
    /**
     * Safely update autonomy level with gradual rollout
     */
    async updateAutonomyLevel(level) {
        return safeMutation(zod_1.z.object({ level: zod_1.z.number().min(0).max(5) }), { level }, async ({ level }, _context) => {
            // Get current level for rollback
            const current = await client_1.maestroApi.getAutonomy();
            const currentLevel = current.data?.level || 0;
            // Gradual rollout for safety - limit increases
            if (level > currentLevel + 1) {
                throw new Error(`Autonomy level can only be increased by 1 at a time. ` +
                    `Current: ${currentLevel}, Requested: ${level}, Max allowed: ${currentLevel + 1}`);
            }
            // Update autonomy level
            const result = await client_1.maestroApi.setAutonomyLevel(level);
            // Store original for rollback
            result._originalLevel = currentLevel;
            return result;
        }, 
        // Rollback function
        async (result, _context) => {
            const originalLevel = result
                ._originalLevel;
            if (originalLevel !== undefined) {
                await client_1.maestroApi.setAutonomyLevel(originalLevel);
            }
        });
    },
    /**
     * Batch mutation with partial rollback support
     */
    async batchMutations(mutations) {
        const results = [];
        const rollbacks = [];
        try {
            for (const mutation of mutations) {
                const result = await mutation();
                results.push(result);
                if (result.rollbackFn) {
                    rollbacks.push(result.rollbackFn);
                }
                // Stop on first failure
                if (!result.success) {
                    break;
                }
            }
            const allSuccess = results.every((r) => r.success);
            return {
                success: allSuccess,
                results,
                rollbackAll: async () => {
                    // Execute rollbacks in reverse order
                    for (const rollback of rollbacks.reverse()) {
                        try {
                            await rollback();
                        }
                        catch (error) {
                            console.error('Rollback failed:', error);
                        }
                    }
                },
            };
        }
        catch (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _error) {
            // Execute any rollbacks we have so far
            for (const rollback of rollbacks.reverse()) {
                try {
                    await rollback();
                }
                catch (rollbackError) {
                    console.error('Rollback failed:', rollbackError);
                }
            }
            return {
                success: false,
                results,
                rollbackAll: async () => {
                    /* No-op */
                },
            };
        }
    },
};
