/**
 * Theme System Type Definitions
 * Complete type safety for Material-UI theme customization
 */

import { z } from 'zod';

// ============================================================================
// MUI THEME TYPES
// ============================================================================

export const PaletteColorSchema = z.object({
  main: z.string(),
  light: z.string().optional(),
  dark: z.string().optional(),
  contrastText: z.string().optional(),
});

export const PaletteSchema = z.object({
  mode: z.enum(['light', 'dark']),
  primary: PaletteColorSchema.optional(),
  secondary: PaletteColorSchema.optional(),
  error: PaletteColorSchema.optional(),
  warning: PaletteColorSchema.optional(),
  info: PaletteColorSchema.optional(),
  success: PaletteColorSchema.optional(),
  background: z
    .object({
      default: z.string(),
      paper: z.string(),
    })
    .optional(),
  text: z
    .object({
      primary: z.string(),
      secondary: z.string(),
      disabled: z.string().optional(),
    })
    .optional(),
});

export const TypographyVariantSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.union([z.string(), z.number()]).optional(),
  fontWeight: z.union([z.string(), z.number()]).optional(),
  lineHeight: z.union([z.string(), z.number()]).optional(),
  letterSpacing: z.union([z.string(), z.number()]).optional(),
});

export const TypographySchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  h1: TypographyVariantSchema.optional(),
  h2: TypographyVariantSchema.optional(),
  h3: TypographyVariantSchema.optional(),
  h4: TypographyVariantSchema.optional(),
  h5: TypographyVariantSchema.optional(),
  h6: TypographyVariantSchema.optional(),
  subtitle1: TypographyVariantSchema.optional(),
  subtitle2: TypographyVariantSchema.optional(),
  body1: TypographyVariantSchema.optional(),
  body2: TypographyVariantSchema.optional(),
  button: TypographyVariantSchema.optional(),
  caption: TypographyVariantSchema.optional(),
  overline: TypographyVariantSchema.optional(),
});

export const ShapeSchema = z.object({
  borderRadius: z.number(),
});

export const ThemeConfigSchema = z.object({
  palette: PaletteSchema.optional(),
  typography: TypographySchema.optional(),
  shape: ShapeSchema.optional(),
  spacing: z.number().optional(),
  // Allow additional properties for extensibility
  // [key: string]: any;
});

export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;

// ============================================================================
// DATABASE ENTITY TYPES
// ============================================================================

export const UIThemeSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  display_name: z.string(),
  description: z.string().nullable(),
  role: z.string().nullable(),
  tenant_id: z.string().nullable(),
  theme_config: ThemeConfigSchema,
  version: z.number().int(),
  is_active: z.boolean(),
  is_default: z.boolean(),
  created_by: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_by: z.string().nullable(),
  updated_at: z.string().datetime(),
});

export type UITheme = z.infer<typeof UIThemeSchema>;

export const UserThemePreferenceSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  tenant_id: z.string(),
  theme_id: z.string().uuid().nullable(),
  custom_overrides: ThemeConfigSchema.nullable(),
  auto_switch_by_role: z.boolean(),
  dark_mode_preference: z.enum(['light', 'dark', 'system']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type UserThemePreference = z.infer<typeof UserThemePreferenceSchema>;

export const ThemeComponentSchema = z.object({
  id: z.string().uuid(),
  component_name: z.string(),
  display_name: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  component_config: ThemeConfigSchema,
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ThemeComponent = z.infer<typeof ThemeComponentSchema>;

export const ThemePresetSchema = z.object({
  id: z.string().uuid(),
  preset_name: z.string(),
  display_name: z.string(),
  description: z.string().nullable(),
  base_theme_id: z.string().uuid().nullable(),
  preset_overrides: ThemeConfigSchema,
  tags: z.array(z.string()).nullable(),
  is_public: z.boolean(),
  is_featured: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ThemePreset = z.infer<typeof ThemePresetSchema>;

// ============================================================================
// API INPUT/OUTPUT TYPES
// ============================================================================

export const CreateThemeInputSchema = z.object({
  name: z.string().min(1).max(100),
  display_name: z.string().min(1).max(255),
  description: z.string().optional(),
  role: z.string().max(100).optional(),
  tenant_id: z.string().optional(),
  theme_config: ThemeConfigSchema,
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
});

export type CreateThemeInput = z.infer<typeof CreateThemeInputSchema>;

export const UpdateThemeInputSchema = z.object({
  display_name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  theme_config: ThemeConfigSchema.optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
});

export type UpdateThemeInput = z.infer<typeof UpdateThemeInputSchema>;

export const UpdateUserThemePreferenceInputSchema = z.object({
  theme_id: z.string().uuid().optional(),
  custom_overrides: ThemeConfigSchema.optional(),
  auto_switch_by_role: z.boolean().optional(),
  dark_mode_preference: z.enum(['light', 'dark', 'system']).optional(),
});

export type UpdateUserThemePreferenceInput = z.infer<
  typeof UpdateUserThemePreferenceInputSchema
>;

export interface EffectiveThemeResult {
  theme: ThemeConfig;
  source: 'user_preference' | 'role_based' | 'default';
  theme_id?: string;
  theme_name?: string;
}

// ============================================================================
// THEME RESOLUTION CONTEXT
// ============================================================================

export interface ThemeResolutionContext {
  userId: string;
  tenantId: string;
  userRole?: string;
  systemDarkMode?: boolean;
}

// ============================================================================
// THEME VALIDATION
// ============================================================================

export interface ThemeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// THEME DIFF
// ============================================================================

export interface ThemeDiff {
  palette?: {
    added?: string[];
    removed?: string[];
    changed?: Record<string, { from: any; to: any }>;
  };
  typography?: {
    added?: string[];
    removed?: string[];
    changed?: Record<string, { from: any; to: any }>;
  };
  other?: {
    added?: string[];
    removed?: string[];
    changed?: Record<string, { from: any; to: any }>;
  };
}
