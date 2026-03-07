import { z } from 'zod';

const thresholdSchema = z
  .object({
    minAcceptanceLength: z.number().nonnegative(),
    minSpeedup: z.number().positive(),
  })
  .strict();

const speculativeConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    backend: z.enum(['none', 'http', 'sglang', 'vllm']).default('none'),
    tenantAllowlist: z.array(z.string().min(1)).default([]),
    evidenceId: z.string().min(1).optional(),
    thresholds: thresholdSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.enabled) {
      return;
    }

    if (value.backend === 'none') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Speculative mode requires a concrete backend when enabled.',
        path: ['backend'],
      });
    }

    if (value.tenantAllowlist.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Speculative mode requires a non-empty tenant allowlist when enabled.',
        path: ['tenantAllowlist'],
      });
    }

    if (!value.evidenceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Speculative mode requires an evidenceId when enabled.',
        path: ['evidenceId'],
      });
    }

    if (!value.thresholds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Speculative mode requires threshold configuration when enabled.',
        path: ['thresholds'],
      });
    }
  });

export type SpeculativeConfig = z.infer<typeof speculativeConfigSchema>;

export function parseSpeculativeConfig(input: unknown): SpeculativeConfig {
  return speculativeConfigSchema.parse(input);
}

export function loadSpeculativeConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): SpeculativeConfig {
  const enabled = env.SUMMIT_SPECULATIVE_ENABLED === 'true';
  const tenantAllowlist = env.SUMMIT_SPECULATIVE_TENANT_ALLOWLIST
    ? env.SUMMIT_SPECULATIVE_TENANT_ALLOWLIST.split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : [];

  const minAcceptanceLength = env.SUMMIT_SPECULATIVE_MIN_ACCEPTANCE_LENGTH;
  const minSpeedup = env.SUMMIT_SPECULATIVE_MIN_SPEEDUP;
  const thresholds =
    minAcceptanceLength && minSpeedup
      ? {
          minAcceptanceLength: Number(minAcceptanceLength),
          minSpeedup: Number(minSpeedup),
        }
      : undefined;

  return parseSpeculativeConfig({
    enabled,
    backend: env.SUMMIT_SPECULATIVE_BACKEND ?? 'none',
    tenantAllowlist,
    evidenceId: env.SUMMIT_SPECULATIVE_EVIDENCE_ID,
    thresholds,
  });
}

export function canUseSpeculativeMode(
  config: SpeculativeConfig,
  tenantId?: string,
): boolean {
  if (!config.enabled) {
    return false;
  }
  if (!tenantId) {
    return false;
  }
  return config.tenantAllowlist.includes(tenantId);
}
