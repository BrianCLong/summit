"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemas = void 0;
exports.validate = validate;
exports.sanitizeString = sanitizeString;
exports.sanitizeObject = sanitizeObject;
const zod_1 = require("zod");
// Validation middleware factory
function validate(schema, source = 'body') {
    return (req, res, next) => {
        try {
            const data = schema.parse(req[source]);
            req[source] = data;
            next();
        }
        catch (err) {
            if (err instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    error: 'Validation error',
                    details: err.errors.map((e) => ({
                        path: e.path.join('.'),
                        message: e.message,
                    })),
                });
            }
            else {
                next(err);
            }
        }
    };
}
// Common validation schemas
exports.schemas = {
    uuid: zod_1.z.string().uuid(),
    pagination: zod_1.z.object({
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
        offset: zod_1.z.coerce.number().int().min(0).default(0),
    }),
    productSearch: zod_1.z.object({
        query: zod_1.z.string().max(200).optional(),
        category: zod_1.z.string().optional(),
        maxRiskLevel: zod_1.z.enum(['low', 'medium', 'high', 'critical']).optional(),
        minPrice: zod_1.z.coerce.number().int().min(0).optional(),
        maxPrice: zod_1.z.coerce.number().int().min(0).optional(),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
        offset: zod_1.z.coerce.number().int().min(0).default(0),
    }),
    createProduct: zod_1.z.object({
        name: zod_1.z.string().min(1).max(255),
        description: zod_1.z.string().max(5000).optional(),
        category: zod_1.z.enum([
            'financial', 'healthcare', 'geospatial', 'demographic',
            'behavioral', 'industrial', 'environmental', 'government',
            'research', 'other'
        ]),
        tags: zod_1.z.array(zod_1.z.string().max(50)).max(20).default([]),
        schemaDefinition: zod_1.z.record(zod_1.z.any()),
        classification: zod_1.z.enum(['public', 'internal', 'confidential', 'restricted', 'top_secret']),
        piiFields: zod_1.z.array(zod_1.z.string()).default([]),
        regulations: zod_1.z.array(zod_1.z.enum(['GDPR', 'CCPA', 'HIPAA', 'SOX', 'PCI_DSS', 'FERPA', 'GLBA'])).default([]),
        pricingModel: zod_1.z.enum(['one_time', 'subscription', 'usage_based', 'negotiated', 'free']),
        basePriceCents: zod_1.z.number().int().min(0),
        currency: zod_1.z.string().length(3).default('USD'),
    }),
    initiateTransaction: zod_1.z.object({
        productId: zod_1.z.string().uuid(),
        licenseType: zod_1.z.enum(['single_use', 'unlimited', 'time_limited', 'usage_based', 'enterprise']),
        usageTerms: zod_1.z.record(zod_1.z.any()),
        durationDays: zod_1.z.number().int().positive().optional(),
    }),
    payment: zod_1.z.object({
        paymentMethodId: zod_1.z.string().min(1),
        savePaymentMethod: zod_1.z.boolean().default(false),
    }),
    recordConsent: zod_1.z.object({
        dataSubjectId: zod_1.z.string().min(1).max(255),
        productId: zod_1.z.string().uuid().optional(),
        providerId: zod_1.z.string().uuid(),
        purposes: zod_1.z.array(zod_1.z.enum(['analytics', 'research', 'marketing', 'ai_training', 'resale', 'internal_use'])).min(1),
        scope: zod_1.z.record(zod_1.z.any()),
        consentMethod: zod_1.z.enum(['explicit', 'opt-in', 'contractual']),
        expiresAt: zod_1.z.coerce.date().optional(),
    }),
    submitReview: zod_1.z.object({
        transactionId: zod_1.z.string().uuid(),
        overallRating: zod_1.z.number().int().min(1).max(5),
        qualityRating: zod_1.z.number().int().min(1).max(5).optional(),
        accuracyRating: zod_1.z.number().int().min(1).max(5).optional(),
        title: zod_1.z.string().max(255).optional(),
        content: zod_1.z.string().max(5000).optional(),
    }),
};
// Sanitization helpers
function sanitizeString(input) {
    return input
        .replace(/[<>]/g, '') // Remove angle brackets
        .trim();
}
function sanitizeObject(obj) {
    const sanitized = { ...obj };
    for (const [key, value] of Object.entries(sanitized)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        }
    }
    return sanitized;
}
