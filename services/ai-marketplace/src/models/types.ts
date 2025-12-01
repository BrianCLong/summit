import { z } from 'zod';

// Persona types for marketplace experiences
export const PersonaType = z.enum(['citizen', 'business', 'developer']);
export type PersonaType = z.infer<typeof PersonaType>;

// AI Experience schema
export const AIExperienceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000),
  persona: PersonaType,
  category: z.string(),
  tags: z.array(z.string()),
  capabilities: z.array(z.string()),
  supportedLocales: z.array(z.string()),
  version: z.string(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().default(0),
  pricing: z.object({
    model: z.enum(['free', 'freemium', 'subscription', 'usage']),
    basePrice: z.number().optional(),
    currency: z.string().default('USD'),
  }),
  publisher: z.object({
    id: z.string(),
    name: z.string(),
    verified: z.boolean(),
  }),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type AIExperience = z.infer<typeof AIExperienceSchema>;

// User preferences for personalization
export const UserPreferencesSchema = z.object({
  userId: z.string(),
  persona: PersonaType.optional(),
  locale: z.string().default('en-US'),
  timezone: z.string().optional(),
  interests: z.array(z.string()),
  skills: z.array(z.string()),
  industry: z.string().optional(),
  preferredCategories: z.array(z.string()),
  dislikedCategories: z.array(z.string()),
  accessibilityNeeds: z.array(z.string()),
  interactionHistory: z.array(z.object({
    experienceId: z.string(),
    action: z.enum(['view', 'install', 'use', 'rate', 'uninstall']),
    timestamp: z.date(),
    duration: z.number().optional(),
  })),
  learningProfile: z.object({
    embeddingVector: z.array(z.number()).optional(),
    lastUpdated: z.date().optional(),
    confidenceScore: z.number().min(0).max(1).optional(),
  }).optional(),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// Recommendation result
export const RecommendationSchema = z.object({
  experienceId: z.string(),
  score: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  personalizedDescription: z.string().optional(),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

// Marketplace query filters
export const MarketplaceFilterSchema = z.object({
  persona: PersonaType.optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  locale: z.string().optional(),
  priceModel: z.enum(['free', 'freemium', 'subscription', 'usage']).optional(),
  minRating: z.number().min(0).max(5).optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type MarketplaceFilter = z.infer<typeof MarketplaceFilterSchema>;
