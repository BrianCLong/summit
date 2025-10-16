/**
 * Maestro Safe Mutations
 * Type-safe, validated mutations for Maestro operations with rollback capabilities
 */

import { z } from 'zod';
import { maestroApi } from '../api/client';

// Validation schemas for mutation inputs
const RunConfigSchema = z.object({
  pipeline: z.string().min(1, 'Pipeline name required'),
  autonomyLevel: z.number().min(0).max(5, 'Autonomy level must be 0-5'),
  budgetCap: z.number().positive('Budget cap must be positive'),
  canaryPercent: z.number().min(0).max(1, 'Canary percent must be 0-1'),
  metadata: z.record(z.unknown()).optional(),
  approvalRequired: z.boolean().default(false),
});

const PolicyUpdateSchema = z.object({
  id: z.string().min(1, 'Policy ID required'),
  enabled: z.boolean(),
  rules: z.array(
    z.object({
      condition: z.string(),
      action: z.enum(['allow', 'deny', 'warn']),
      priority: z.number().default(100),
    }),
  ),
  dryRun: z.boolean().default(false),
});

const BudgetUpdateSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID required'),
  monthlyUsd: z.number().positive('Monthly budget must be positive'),
  alertThresholds: z
    .object({
      warning: z
        .number()
        .min(0)
        .max(1, 'Warning threshold must be 0-1')
        .default(0.8),
      critical: z
        .number()
        .min(0)
        .max(1, 'Critical threshold must be 0-1')
        .default(0.95),
    })
    .optional(),
});

const RoutingPinSchema = z.object({
  route: z.string().min(1, 'Route required'),
  model: z.string().min(1, 'Model required'),
  note: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

export type RunConfig = z.infer<typeof RunConfigSchema>;
export type PolicyUpdate = z.infer<typeof PolicyUpdateSchema>;
export type BudgetUpdate = z.infer<typeof BudgetUpdateSchema>;
export type RoutingPin = z.infer<typeof RoutingPinSchema>;

export interface MutationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  rollbackFn?: () => Promise<void>;
  validationErrors?: z.ZodError;
}

export interface MutationContext {
  userId: string;
  tenantId: string;
  timestamp: string;
  source: 'ui' | 'api' | 'automation';
}

/**
 * Safe mutation wrapper with validation, error handling, and rollback
 */
async function safeMutation<TInput, TOutput>(
  schema: z.ZodSchema<TInput>,
  input: unknown,
  mutationFn: (
    validInput: TInput,
    context: MutationContext,
  ) => Promise<TOutput>,
  rollbackFn?: (output: TOutput, context: MutationContext) => Promise<void>,
): Promise<MutationResult<TOutput>> {
  const context: MutationContext = {
    userId: 'current-user', // TODO: Get from auth context
    tenantId: 'current-tenant', // TODO: Get from auth context
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
  } catch (error) {
    if (error instanceof z.ZodError) {
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
export const MaestroSafeMutations = {
  /**
   * Safely create a new run with validation and budget checks
   */
  async createRun(input: unknown): Promise<MutationResult> {
    return safeMutation(
      RunConfigSchema,
      input,
      async (config: RunConfig, context) => {
        // Pre-flight checks
        const budgetCheck = await maestroApi.getBudgets();
        if (budgetCheck.remaining < config.budgetCap) {
          throw new Error(
            `Insufficient budget: ${budgetCheck.remaining} < ${config.budgetCap}`,
          );
        }

        // Create the run
        const run = await maestroApi.createRun({
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (run, _context) => {
        if (run.status === 'queued' || run.status === 'running') {
          await maestroApi.cancelRun(run.id);
        }
      },
    );
  },

  /**
   * Safely update policy with validation and rollback
   */
  async updatePolicy(input: unknown): Promise<MutationResult> {
    return safeMutation(
      PolicyUpdateSchema,
      input,
      async (policy: PolicyUpdate, context) => {
        // Get current policy for rollback
        const currentPolicy = await maestroApi.getPolicy(policy.id);

        // Update policy
        const updatedPolicy = await maestroApi.updatePolicy(policy.id, {
          ...policy,
          updatedBy: context.userId,
          updatedAt: context.timestamp,
        });

        // Store original for rollback
        (updatedPolicy as { _original: PolicyUpdate })._original =
          currentPolicy;

        return updatedPolicy;
      },
      // Rollback function - restore original policy
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (updatedPolicy, _context) => {
        const original = (updatedPolicy as { _original: PolicyUpdate })
          ._original;
        if (original) {
          await maestroApi.updatePolicy(updatedPolicy.id, original);
        }
      },
    );
  },

  /**
   * Safely update tenant budget with validation
   */
  async updateBudget(input: unknown): Promise<MutationResult> {
    return safeMutation(
      BudgetUpdateSchema,
      input,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (budget: BudgetUpdate, _context) => {
        // Get current budget for rollback
        const currentBudget = await maestroApi.getTenantBudget(budget.tenantId);

        // Validate business rules
        if (budget.monthlyUsd < currentBudget.spent) {
          throw new Error(
            'New budget cannot be less than amount already spent',
          );
        }

        // Update budget
        const updatedBudget = await maestroApi.putTenantBudget(
          budget.tenantId,
          budget.monthlyUsd,
        );

        // Store original for rollback
        (updatedBudget as { _original: BudgetUpdate })._original =
          currentBudget;

        return updatedBudget;
      },
      // Rollback function
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (updatedBudget, _context) => {
        const original = (updatedBudget as { _original: BudgetUpdate })
          ._original;
        if (original) {
          await maestroApi.putTenantBudget(
            original.tenantId,
            original.monthlyUsd,
          );
        }
      },
    );
  },

  /**
   * Safely pin routing with validation and auto-expiry
   */
  async pinRouting(input: unknown): Promise<MutationResult> {
    return safeMutation(
      RoutingPinSchema,
      input,
      async (pin: RoutingPin, context) => {
        // Validate model is available
        const providers = await maestroApi.getProviders();
        const modelExists = providers.items.some((p: { models: string[] }) =>
          p.models.includes(pin.model),
        );

        if (!modelExists) {
          throw new Error(`Model not available: ${pin.model}`);
        }

        // Pin the route
        const result = await maestroApi.putRoutingPin({
          route: pin.route,
          model: pin.model,
          note:
            pin.note || `Pinned by ${context.userId} at ${context.timestamp}`,
        });

        // Schedule auto-unpin if expiry set
        if (pin.expiresAt) {
          const expiryDate = new Date(pin.expiresAt);
          const now = new Date();
          const delay = expiryDate.getTime() - now.getTime();

          if (delay > 0) {
            setTimeout(async () => {
              try {
                await maestroApi.deleteRoutingPin(pin.route);
              } catch (_error) {
                console.warn('Failed to auto-unpin route:', _error);
              }
            }, delay);
          }
        }

        return result;
      },
      // Rollback function - unpin the route
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (result, _context) => {
        await maestroApi.deleteRoutingPin(result.route);
      },
    );
  },

  /**
   * Safely update autonomy level with gradual rollout
   */
  async updateAutonomyLevel(level: number): Promise<MutationResult> {
    return safeMutation(
      z.object({ level: z.number().min(0).max(5) }),
      { level },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async ({ level }, _context) => {
        // Get current level for rollback
        const current = await maestroApi.getAutonomy();
        const currentLevel = current.data?.level || 0;

        // Gradual rollout for safety - limit increases
        if (level > currentLevel + 1) {
          throw new Error(
            `Autonomy level can only be increased by 1 at a time. ` +
              `Current: ${currentLevel}, Requested: ${level}, Max allowed: ${currentLevel + 1}`,
          );
        }

        // Update autonomy level
        const result = await maestroApi.setAutonomyLevel(level);

        // Store original for rollback
        (result as { _originalLevel: number })._originalLevel = currentLevel;

        return result;
      },
      // Rollback function
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (result, _context) => {
        const originalLevel = (result as { _originalLevel: number })
          ._originalLevel;
        if (originalLevel !== undefined) {
          await maestroApi.setAutonomyLevel(originalLevel);
        }
      },
    );
  },

  /**
   * Batch mutation with partial rollback support
   */
  async batchMutations(mutations: (() => Promise<MutationResult>)[]): Promise<{
    success: boolean;
    results: MutationResult[];
    rollbackAll: () => Promise<void>;
  }> {
    const results: MutationResult[] = [];
    const rollbacks: (() => Promise<void>)[] = [];

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
            } catch (error) {
              console.error('Rollback failed:', error);
            }
          }
        },
      };
    } catch (
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _error
    ) {
      // Execute any rollbacks we have so far
      for (const rollback of rollbacks.reverse()) {
        try {
          await rollback();
        } catch (rollbackError) {
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
