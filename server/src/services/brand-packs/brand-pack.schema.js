"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandPackSchema = exports.BrandPackTokensSchema = exports.BrandPackShadowsSchema = exports.BrandPackSpacingSchema = exports.BrandPackRadiiSchema = exports.BrandPackTypographySchema = exports.BrandPackPaletteSchema = void 0;
// @ts-nocheck
const zod_1 = require("zod");
exports.BrandPackPaletteSchema = zod_1.z.object({
    mode: zod_1.z.enum(['light', 'dark']).default('dark'),
    primary: zod_1.z.string(),
    secondary: zod_1.z.string().optional(),
    accent: zod_1.z.string().optional(),
    background: zod_1.z.string(),
    surface: zod_1.z.string(),
    text: zod_1.z.object({
        primary: zod_1.z.string(),
        secondary: zod_1.z.string().optional(),
    }),
});
exports.BrandPackTypographySchema = zod_1.z.object({
    fontFamily: zod_1.z.string(),
    baseSize: zod_1.z.number().optional(),
});
exports.BrandPackRadiiSchema = zod_1.z.object({
    sm: zod_1.z.number().optional(),
    md: zod_1.z.number().optional(),
    lg: zod_1.z.number().optional(),
    pill: zod_1.z.number().optional(),
});
exports.BrandPackSpacingSchema = zod_1.z.object({
    sm: zod_1.z.number().optional(),
    md: zod_1.z.number().optional(),
    lg: zod_1.z.number().optional(),
});
exports.BrandPackShadowsSchema = zod_1.z.object({
    sm: zod_1.z.string().optional(),
    md: zod_1.z.string().optional(),
    lg: zod_1.z.string().optional(),
});
exports.BrandPackTokensSchema = zod_1.z.object({
    palette: exports.BrandPackPaletteSchema,
    typography: exports.BrandPackTypographySchema.optional(),
    radii: exports.BrandPackRadiiSchema.optional(),
    spacing: exports.BrandPackSpacingSchema.optional(),
    shadows: exports.BrandPackShadowsSchema.optional(),
});
exports.BrandPackSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    websiteUrl: zod_1.z.string().url(),
    logos: zod_1.z.object({
        primary: zod_1.z.string(),
        mark: zod_1.z.string().optional(),
        inverted: zod_1.z.string().optional(),
    }),
    navLabels: zod_1.z.object({
        home: zod_1.z.string(),
        investigations: zod_1.z.string(),
        cases: zod_1.z.string().optional(),
        dashboards: zod_1.z.string().optional(),
        settings: zod_1.z.string().optional(),
        support: zod_1.z.string().optional(),
    }),
    tokens: exports.BrandPackTokensSchema,
    updatedAt: zod_1.z.string().datetime(),
});
