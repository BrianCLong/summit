import { z } from 'zod';
import type { ComponentType, ReactNode } from 'react';

/**
 * Plugin metadata schema
 */
export const PluginMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  category: z.enum(['chart', 'map', 'network', 'statistical', 'custom']).default('custom'),
  icon: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export type PluginMetadata = z.infer<typeof PluginMetadataSchema>;

/**
 * Visualization registration
 */
export interface VisualizationRegistration<TData = unknown, TConfig = unknown> {
  metadata: PluginMetadata;
  component: ComponentType<VisualizationComponentProps<TData, TConfig>>;
  dataSchema?: z.ZodType<TData>;
  configSchema?: z.ZodType<TConfig>;
  defaultConfig?: Partial<TConfig>;
  thumbnail?: string;
}

/**
 * Props passed to visualization components
 */
export interface VisualizationComponentProps<TData = unknown, TConfig = unknown> {
  data: TData;
  config: TConfig;
  width: number;
  height: number;
  theme?: VisualizationTheme;
  onDataPointClick?: (point: unknown) => void;
  onBrush?: (selection: unknown) => void;
  children?: ReactNode;
}

/**
 * Visualization theme
 */
export interface VisualizationTheme {
  backgroundColor: string;
  textColor: string;
  gridColor: string;
  accentColor: string;
  colors: string[];
  fontSize: number;
  fontFamily: string;
}

/**
 * Export format options
 */
export const ExportFormatSchema = z.enum(['png', 'svg', 'pdf', 'csv', 'json']);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

/**
 * Export options
 */
export const ExportOptionsSchema = z.object({
  format: ExportFormatSchema,
  width: z.number().optional(),
  height: z.number().optional(),
  scale: z.number().default(2),
  backgroundColor: z.string().optional(),
  filename: z.string().optional(),
  quality: z.number().min(0).max(1).default(0.95),
});

export type ExportOptions = z.infer<typeof ExportOptionsSchema>;

/**
 * Plugin lifecycle hooks
 */
export interface PluginLifecycle {
  onRegister?: () => void | Promise<void>;
  onUnregister?: () => void | Promise<void>;
  onMount?: () => void | Promise<void>;
  onUnmount?: () => void | Promise<void>;
}

/**
 * Plugin context
 */
export interface PluginContext {
  theme: VisualizationTheme;
  locale: string;
  timezone: string;
}
