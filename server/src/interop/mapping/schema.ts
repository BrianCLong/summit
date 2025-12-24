// @ts-nocheck
import * as z from 'zod';

// Allowed transforms
export const TransformTypeSchema = (z as any).enum([
  'string',
  'number',
  'boolean',
  'trim',
  'uppercase',
  'lowercase',
  'isoDate',
  'json',
  'uuid',
]);

export type TransformType = z.infer<typeof TransformTypeSchema>;

// Individual field mapping
export const FieldMappingSchema = (z as any).object({
  source: (z as any).string(),
  target: (z as any).string(),
  transform: TransformTypeSchema.optional(),
  required: (z as any).boolean().optional().default(false),
  defaultValue: (z as any).any().optional(),
});

export type FieldMapping = z.infer<typeof FieldMappingSchema>;

// The full mapping specification
export const MappingSpecSchema = (z as any).object({
  owner: (z as any).string(),
  version: (z as any).string(),
  sourceSystem: (z as any).string(),
  license: (z as any).string(),
  mappings: (z as any).array(FieldMappingSchema),
  unknownFields: (z as any).enum(['ignore', 'quarantine', 'error']).default('error'),
});

export type MappingSpec = z.infer<typeof MappingSpecSchema>;

// Result of a mapping operation
export interface MappingResult {
  output: Record<string, any>;
  quarantined: Record<string, any>;
  errors: string[];
}
