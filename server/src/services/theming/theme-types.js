"use strict";
// @ts-nocheck
/**
 * Theme System Type Definitions
 * Complete type safety for Material-UI theme customization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUserThemePreferenceInputSchema = exports.UpdateThemeInputSchema = exports.CreateThemeInputSchema = exports.ThemePresetSchema = exports.ThemeComponentSchema = exports.UserThemePreferenceSchema = exports.UIThemeSchema = exports.ThemeConfigSchema = exports.ShapeSchema = exports.TypographySchema = exports.TypographyVariantSchema = exports.PaletteSchema = exports.PaletteColorSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// MUI THEME TYPES
// ============================================================================
exports.PaletteColorSchema = zod_1.z.object({
    main: zod_1.z.string(),
    light: zod_1.z.string().optional(),
    dark: zod_1.z.string().optional(),
    contrastText: zod_1.z.string().optional(),
});
exports.PaletteSchema = zod_1.z.object({
    mode: zod_1.z.enum(['light', 'dark']),
    primary: exports.PaletteColorSchema.optional(),
    secondary: exports.PaletteColorSchema.optional(),
    error: exports.PaletteColorSchema.optional(),
    warning: exports.PaletteColorSchema.optional(),
    info: exports.PaletteColorSchema.optional(),
    success: exports.PaletteColorSchema.optional(),
    background: zod_1.z
        .object({
        default: zod_1.z.string(),
        paper: zod_1.z.string(),
    })
        .optional(),
    text: zod_1.z
        .object({
        primary: zod_1.z.string(),
        secondary: zod_1.z.string(),
        disabled: zod_1.z.string().optional(),
    })
        .optional(),
});
exports.TypographyVariantSchema = zod_1.z.object({
    fontFamily: zod_1.z.string().optional(),
    fontSize: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    fontWeight: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    lineHeight: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    letterSpacing: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
});
exports.TypographySchema = zod_1.z.object({
    fontFamily: zod_1.z.string().optional(),
    fontSize: zod_1.z.number().optional(),
    h1: exports.TypographyVariantSchema.optional(),
    h2: exports.TypographyVariantSchema.optional(),
    h3: exports.TypographyVariantSchema.optional(),
    h4: exports.TypographyVariantSchema.optional(),
    h5: exports.TypographyVariantSchema.optional(),
    h6: exports.TypographyVariantSchema.optional(),
    subtitle1: exports.TypographyVariantSchema.optional(),
    subtitle2: exports.TypographyVariantSchema.optional(),
    body1: exports.TypographyVariantSchema.optional(),
    body2: exports.TypographyVariantSchema.optional(),
    button: exports.TypographyVariantSchema.optional(),
    caption: exports.TypographyVariantSchema.optional(),
    overline: exports.TypographyVariantSchema.optional(),
});
exports.ShapeSchema = zod_1.z.object({
    borderRadius: zod_1.z.number(),
});
exports.ThemeConfigSchema = zod_1.z.object({
    palette: exports.PaletteSchema.optional(),
    typography: exports.TypographySchema.optional(),
    shape: exports.ShapeSchema.optional(),
    spacing: zod_1.z.number().optional(),
    // Allow additional properties for extensibility
    // [key: string]: any;
});
// ============================================================================
// DATABASE ENTITY TYPES
// ============================================================================
exports.UIThemeSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    display_name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    role: zod_1.z.string().nullable(),
    tenant_id: zod_1.z.string().nullable(),
    theme_config: exports.ThemeConfigSchema,
    version: zod_1.z.number().int(),
    is_active: zod_1.z.boolean(),
    is_default: zod_1.z.boolean(),
    created_by: zod_1.z.string().nullable(),
    created_at: zod_1.z.string().datetime(),
    updated_by: zod_1.z.string().nullable(),
    updated_at: zod_1.z.string().datetime(),
});
exports.UserThemePreferenceSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    user_id: zod_1.z.string(),
    tenant_id: zod_1.z.string(),
    theme_id: zod_1.z.string().uuid().nullable(),
    custom_overrides: exports.ThemeConfigSchema.nullable(),
    auto_switch_by_role: zod_1.z.boolean(),
    dark_mode_preference: zod_1.z.enum(['light', 'dark', 'system']),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
exports.ThemeComponentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    component_name: zod_1.z.string(),
    display_name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    category: zod_1.z.string().nullable(),
    component_config: exports.ThemeConfigSchema,
    is_active: zod_1.z.boolean(),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
exports.ThemePresetSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    preset_name: zod_1.z.string(),
    display_name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    base_theme_id: zod_1.z.string().uuid().nullable(),
    preset_overrides: exports.ThemeConfigSchema,
    tags: zod_1.z.array(zod_1.z.string()).nullable(),
    is_public: zod_1.z.boolean(),
    is_featured: zod_1.z.boolean(),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
// ============================================================================
// API INPUT/OUTPUT TYPES
// ============================================================================
exports.CreateThemeInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    display_name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional(),
    role: zod_1.z.string().max(100).optional(),
    tenant_id: zod_1.z.string().optional(),
    theme_config: exports.ThemeConfigSchema,
    is_active: zod_1.z.boolean().optional(),
    is_default: zod_1.z.boolean().optional(),
});
exports.UpdateThemeInputSchema = zod_1.z.object({
    display_name: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().optional(),
    theme_config: exports.ThemeConfigSchema.optional(),
    is_active: zod_1.z.boolean().optional(),
    is_default: zod_1.z.boolean().optional(),
});
exports.UpdateUserThemePreferenceInputSchema = zod_1.z.object({
    theme_id: zod_1.z.string().uuid().optional(),
    custom_overrides: exports.ThemeConfigSchema.optional(),
    auto_switch_by_role: zod_1.z.boolean().optional(),
    dark_mode_preference: zod_1.z.enum(['light', 'dark', 'system']).optional(),
});
