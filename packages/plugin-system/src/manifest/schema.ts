import { z } from 'zod';
import { PluginPermission } from '../types/permissions.js';

export const PluginSignatureSchema = z
  .object({
    signature: z.string().min(1, 'Signature is required'),
    publicKey: z.string().min(1, 'Public key is required'),
    algorithm: z.string().optional(),
    timestamp: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export const PluginManifestSchema = z
  .object({
    id: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/),
    name: z.string().min(1).max(200),
    version: z.string().regex(/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?$/),
    description: z.string().max(1000),
    author: z
      .object({
        name: z.string(),
        email: z.string().email().optional(),
        url: z.string().url().optional(),
      })
      .strict(),
    homepage: z.string().url().optional(),
    repository: z.string().url().optional(),
    license: z.string(),

    category: z.enum([
      'data-source',
      'analyzer',
      'visualization',
      'export',
      'authentication',
      'search',
      'ml-model',
      'workflow',
      'ui-theme',
      'api-extension',
      'integration',
      'utility',
    ]),

    main: z.string(),
    icon: z.string().optional(),

    dependencies: z.record(z.string()).optional(),
    peerDependencies: z.record(z.string()).optional(),
    engineVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?$/),

    permissions: z.array(z.nativeEnum(PluginPermission)).nonempty(),

    resources: z
      .object({
        maxMemoryMB: z.number().int().positive().max(2048).default(256),
        maxCpuPercent: z.number().int().positive().max(100).default(50),
        maxStorageMB: z.number().int().positive().max(1024).default(100),
        maxNetworkMbps: z.number().int().positive().max(1000).default(10),
      })
      .strict()
      .optional(),

    extensionPoints: z
      .array(
        z
          .object({
            id: z.string(),
            type: z.string(),
            config: z.record(z.any()).optional(),
          })
          .strict()
      )
      .optional(),

    configSchema: z.record(z.any()).optional(),

    webhooks: z
      .array(
        z
          .object({
            event: z.string(),
            handler: z.string(),
          })
          .strict()
      )
      .optional(),

    apiEndpoints: z
      .array(
        z
          .object({
            method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
            path: z.string(),
            handler: z.string(),
          })
          .strict()
      )
      .optional(),

    signature: PluginSignatureSchema.optional(),
  })
  .strict();

export type PluginSignature = z.infer<typeof PluginSignatureSchema>;
export type PluginManifest = z.infer<typeof PluginManifestSchema>;
