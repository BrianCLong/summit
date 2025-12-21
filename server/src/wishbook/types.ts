import { z } from 'zod';

export enum RiskTier {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RevenueImpact {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  GAME_CHANGER = 'GAME_CHANGER',
}

export enum DependencyClass {
  NONE = 'NONE',
  PLATFORM = 'PLATFORM',
  EXTERNAL = 'EXTERNAL',
  CROSS_TEAM = 'CROSS_TEAM',
}

export enum WishbookStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  TRIAGED = 'TRIAGED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export const WishbookPrioritizationSchema = z.object({
  whyNow: z.string().min(1, 'Why Now is required'),
  whatBreaks: z.string().min(1, 'What Breaks is required'),
});

export type WishbookPrioritization = z.infer<typeof WishbookPrioritizationSchema>;

export const WishbookTagsSchema = z.object({
  domain: z.string().optional(),
  segment: z.string().optional(),
  workflow: z.string().optional(),
  riskTier: z.nativeEnum(RiskTier).default(RiskTier.LOW),
  revenueImpact: z.nativeEnum(RevenueImpact).default(RevenueImpact.NONE),
  dependencyClass: z.nativeEnum(DependencyClass).default(DependencyClass.NONE),
});

export type WishbookTags = z.infer<typeof WishbookTagsSchema>;

export const CreateWishbookItemSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  problem: z.string().min(10, 'Problem description must be at least 10 characters'),
  user: z.string().min(1, 'User/Stakeholder is required'),
  impact: z.string().min(1, 'Impact description is required'),
  evidence: z.string().optional(),
  dependencies: z.string().optional(),
  cost: z.string().optional(),
  tags: WishbookTagsSchema.optional(),
  prioritization: WishbookPrioritizationSchema.optional(),
});

export type CreateWishbookItemDTO = z.infer<typeof CreateWishbookItemSchema>;

export interface WishbookItem extends CreateWishbookItemDTO {
  id: string;
  status: WishbookStatus;
  canonicalId?: string; // If merged into another item
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
