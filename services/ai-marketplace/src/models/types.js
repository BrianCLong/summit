"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceFilterSchema = exports.RecommendationSchema = exports.UserPreferencesSchema = exports.AIExperienceSchema = exports.PersonaType = void 0;
const zod_1 = require("zod");
// Persona types for marketplace experiences
exports.PersonaType = zod_1.z.enum(['citizen', 'business', 'developer']);
// AI Experience schema
exports.AIExperienceSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(1000),
    persona: exports.PersonaType,
    category: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()),
    capabilities: zod_1.z.array(zod_1.z.string()),
    supportedLocales: zod_1.z.array(zod_1.z.string()),
    version: zod_1.z.string(),
    rating: zod_1.z.number().min(0).max(5).optional(),
    reviewCount: zod_1.z.number().default(0),
    pricing: zod_1.z.object({
        model: zod_1.z.enum(['free', 'freemium', 'subscription', 'usage']),
        basePrice: zod_1.z.number().optional(),
        currency: zod_1.z.string().default('USD'),
    }),
    publisher: zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        verified: zod_1.z.boolean(),
    }),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// User preferences for personalization
exports.UserPreferencesSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    persona: exports.PersonaType.optional(),
    locale: zod_1.z.string().default('en-US'),
    timezone: zod_1.z.string().optional(),
    interests: zod_1.z.array(zod_1.z.string()),
    skills: zod_1.z.array(zod_1.z.string()),
    industry: zod_1.z.string().optional(),
    preferredCategories: zod_1.z.array(zod_1.z.string()),
    dislikedCategories: zod_1.z.array(zod_1.z.string()),
    accessibilityNeeds: zod_1.z.array(zod_1.z.string()),
    interactionHistory: zod_1.z.array(zod_1.z.object({
        experienceId: zod_1.z.string(),
        action: zod_1.z.enum(['view', 'install', 'use', 'rate', 'uninstall']),
        timestamp: zod_1.z.date(),
        duration: zod_1.z.number().optional(),
    })),
    learningProfile: zod_1.z.object({
        embeddingVector: zod_1.z.array(zod_1.z.number()).optional(),
        lastUpdated: zod_1.z.date().optional(),
        confidenceScore: zod_1.z.number().min(0).max(1).optional(),
    }).optional(),
});
// Recommendation result
exports.RecommendationSchema = zod_1.z.object({
    experienceId: zod_1.z.string(),
    score: zod_1.z.number().min(0).max(1),
    reasons: zod_1.z.array(zod_1.z.string()),
    personalizedDescription: zod_1.z.string().optional(),
});
// Marketplace query filters
exports.MarketplaceFilterSchema = zod_1.z.object({
    persona: exports.PersonaType.optional(),
    categories: zod_1.z.array(zod_1.z.string()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    locale: zod_1.z.string().optional(),
    priceModel: zod_1.z.enum(['free', 'freemium', 'subscription', 'usage']).optional(),
    minRating: zod_1.z.number().min(0).max(5).optional(),
    search: zod_1.z.string().optional(),
    limit: zod_1.z.number().min(1).max(100).default(20),
    offset: zod_1.z.number().min(0).default(0),
});
