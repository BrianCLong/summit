// @ts-nocheck
import { z } from 'zod';

export const BrandPackPaletteSchema = z.object({
  mode: z.enum(['light', 'dark']).default('dark'),
  primary: z.string(),
  secondary: z.string().optional(),
  accent: z.string().optional(),
  background: z.string(),
  surface: z.string(),
  text: z.object({
    primary: z.string(),
    secondary: z.string().optional(),
  }),
});

export const BrandPackTypographySchema = z.object({
  fontFamily: z.string(),
  baseSize: z.number().optional(),
});

export const BrandPackRadiiSchema = z.object({
  sm: z.number().optional(),
  md: z.number().optional(),
  lg: z.number().optional(),
  pill: z.number().optional(),
});

export const BrandPackSpacingSchema = z.object({
  sm: z.number().optional(),
  md: z.number().optional(),
  lg: z.number().optional(),
});

export const BrandPackShadowsSchema = z.object({
  sm: z.string().optional(),
  md: z.string().optional(),
  lg: z.string().optional(),
});

export const BrandPackTokensSchema = z.object({
  palette: BrandPackPaletteSchema,
  typography: BrandPackTypographySchema.optional(),
  radii: BrandPackRadiiSchema.optional(),
  spacing: BrandPackSpacingSchema.optional(),
  shadows: BrandPackShadowsSchema.optional(),
});

export const BrandPackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  websiteUrl: z.string().url(),
  logos: z.object({
    primary: z.string(),
    mark: z.string().optional(),
    inverted: z.string().optional(),
  }),
  navLabels: z.object({
    home: z.string(),
    investigations: z.string(),
    cases: z.string().optional(),
    dashboards: z.string().optional(),
    settings: z.string().optional(),
    support: z.string().optional(),
  }),
  tokens: BrandPackTokensSchema,
  updatedAt: z.string().datetime(),
});

export type BrandPack = z.infer<typeof BrandPackSchema>;
