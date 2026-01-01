
import { z } from 'zod';
import { adminConfig } from './admin-config.js';

export const ScalingGuardrailsSchema = z.object({
  api: z.object({
    maxReplicas: z.number().min(3).max(20),
    targetCpuUtilization: z.number().min(50).max(80),
    requestTimeoutMs: z.number().max(30000), // 30s max
  }),
  redis: z.object({
    clusterMode: z.boolean(),
    maxMemoryPolicy: z.enum(['allkeys-lru', 'volatile-lru', 'noeviction']),
  }),
  neo4j: z.object({
    connectionTimeout: z.number().max(10000), // 10s
    maxConnectionPoolSize: z.number().max(200),
  })
});

export type ScalingGuardrails = z.infer<typeof ScalingGuardrailsSchema>;

export const ScalingConfig: ScalingGuardrails = {
  api: {
    maxReplicas: 10, // From SCALING.md
    targetCpuUtilization: 70, // From SCALING.md
    requestTimeoutMs: 1500, // SLO p95 < 1500ms
  },
  redis: {
    clusterMode: process.env.REDIS_CLUSTER_NODES ? true : false,
    maxMemoryPolicy: 'allkeys-lru',
  },
  neo4j: {
    connectionTimeout: 5000,
    maxConnectionPoolSize: 100
  }
};

export function validateScalingConfig() {
  const result = ScalingGuardrailsSchema.safeParse(ScalingConfig);
  if (!result.success) {
    throw new Error(`Scaling Config Violation: ${JSON.stringify(result.error.format())}`);
  }

  // Cross-check with Admin Config
  if (adminConfig.PG_WRITE_POOL_SIZE > 80) {
      console.warn("PG_WRITE_POOL_SIZE exceeds recommended scaling limit of 80");
  }
}
