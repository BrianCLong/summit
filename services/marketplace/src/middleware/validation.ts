import type { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

// Validation middleware factory
export function validate<T extends ZodSchema>(
  schema: T,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = schema.parse(req[source]);
      req[source] = data;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: err.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      } else {
        next(err);
      }
    }
  };
}

// Common validation schemas
export const schemas = {
  uuid: z.string().uuid(),

  pagination: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  }),

  productSearch: z.object({
    query: z.string().max(200).optional(),
    category: z.string().optional(),
    maxRiskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  }),

  createProduct: z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(5000).optional(),
    category: z.enum([
      'financial', 'healthcare', 'geospatial', 'demographic',
      'behavioral', 'industrial', 'environmental', 'government',
      'research', 'other'
    ]),
    tags: z.array(z.string().max(50)).max(20).default([]),
    schemaDefinition: z.record(z.any()),
    classification: z.enum(['public', 'internal', 'confidential', 'restricted', 'top_secret']),
    piiFields: z.array(z.string()).default([]),
    regulations: z.array(z.enum(['GDPR', 'CCPA', 'HIPAA', 'SOX', 'PCI_DSS', 'FERPA', 'GLBA'])).default([]),
    pricingModel: z.enum(['one_time', 'subscription', 'usage_based', 'negotiated', 'free']),
    basePriceCents: z.number().int().min(0),
    currency: z.string().length(3).default('USD'),
  }),

  initiateTransaction: z.object({
    productId: z.string().uuid(),
    licenseType: z.enum(['single_use', 'unlimited', 'time_limited', 'usage_based', 'enterprise']),
    usageTerms: z.record(z.any()),
    durationDays: z.number().int().positive().optional(),
  }),

  payment: z.object({
    paymentMethodId: z.string().min(1),
    savePaymentMethod: z.boolean().default(false),
  }),

  recordConsent: z.object({
    dataSubjectId: z.string().min(1).max(255),
    productId: z.string().uuid().optional(),
    providerId: z.string().uuid(),
    purposes: z.array(z.enum(['analytics', 'research', 'marketing', 'ai_training', 'resale', 'internal_use'])).min(1),
    scope: z.record(z.any()),
    consentMethod: z.enum(['explicit', 'opt-in', 'contractual']),
    expiresAt: z.coerce.date().optional(),
  }),

  submitReview: z.object({
    transactionId: z.string().uuid(),
    overallRating: z.number().int().min(1).max(5),
    qualityRating: z.number().int().min(1).max(5).optional(),
    accuracyRating: z.number().int().min(1).max(5).optional(),
    title: z.string().max(255).optional(),
    content: z.string().max(5000).optional(),
  }),
};

// Sanitization helpers
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeString(value);
    }
  }
  return sanitized;
}
