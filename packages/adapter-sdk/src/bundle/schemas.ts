// @ts-nocheck
import { z } from "zod";

export const compatibilitySchema = z.object({
  companyOs: z.string().min(1),
  platform: z.string().optional(),
});

export const manifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  entrypoint: z.string().min(1),
  capabilities: z.array(z.string()).min(1),
  requiredPermissions: z.array(z.string()).min(1),
  claims: z.array(z.string()).optional(),
  compatibility: compatibilitySchema,
  configSchema: z.record(z.unknown()).optional(),
  sbomPath: z.string().optional(),
  slsaPath: z.string().optional(),
  signature: z.string().optional(),
});

export type BundleManifest = z.infer<typeof manifestSchema>;
