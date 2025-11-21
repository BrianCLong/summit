import { z } from 'zod';

// Talent Signal Categories
export const TalentSignalCategory = {
  ACADEMIC: 'academic',
  PROFESSIONAL: 'professional',
  OPEN_SOURCE: 'open_source',
  PATENTS: 'patents',
  PUBLICATIONS: 'publications',
  AWARDS: 'awards',
  CERTIFICATIONS: 'certifications',
  SOCIAL: 'social',
} as const;

export type TalentSignalCategoryType =
  (typeof TalentSignalCategory)[keyof typeof TalentSignalCategory];

// Skill Level
export const SkillLevel = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  EXPERT: 'expert',
  THOUGHT_LEADER: 'thought_leader',
} as const;

export type SkillLevelType = (typeof SkillLevel)[keyof typeof SkillLevel];

// Talent Status
export const TalentStatus = {
  IDENTIFIED: 'identified',
  CONTACTED: 'contacted',
  ENGAGED: 'engaged',
  ONBOARDING: 'onboarding',
  ACTIVE: 'active',
  DECLINED: 'declined',
  INACTIVE: 'inactive',
} as const;

export type TalentStatusType = (typeof TalentStatus)[keyof typeof TalentStatus];

// Incentive Type
export const IncentiveType = {
  RELOCATION_GRANT: 'relocation_grant',
  TAX_BENEFIT: 'tax_benefit',
  VISA_FAST_TRACK: 'visa_fast_track',
  HOUSING_SUBSIDY: 'housing_subsidy',
  RESEARCH_GRANT: 'research_grant',
  STARTUP_FUNDING: 'startup_funding',
  MENTORSHIP: 'mentorship',
  NETWORK_ACCESS: 'network_access',
  UPSKILLING: 'upskilling',
} as const;

export type IncentiveTypeValue =
  (typeof IncentiveType)[keyof typeof IncentiveType];

// Zod Schemas for validation
export const TalentSignalSchema = z.object({
  id: z.string().uuid(),
  category: z.nativeEnum(
    TalentSignalCategory as unknown as { [k: string]: string },
  ),
  source: z.string(),
  sourceUrl: z.string().url().optional(),
  title: z.string(),
  description: z.string().optional(),
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  detectedAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

export type TalentSignal = z.infer<typeof TalentSignalSchema>;

export const SkillSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.string(),
  level: z.nativeEnum(SkillLevel as unknown as { [k: string]: string }),
  yearsExperience: z.number().min(0).optional(),
  verified: z.boolean().default(false),
  verificationSource: z.string().optional(),
});

export type Skill = z.infer<typeof SkillSchema>;

export const TalentProfileSchema = z.object({
  id: z.string().uuid(),
  externalId: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email().optional(),
  nationality: z.string().optional(),
  currentLocation: z.string().optional(),
  targetLocation: z.string().default('Estonia'),
  status: z.nativeEnum(TalentStatus as unknown as { [k: string]: string }),
  skills: z.array(SkillSchema),
  signals: z.array(TalentSignalSchema),
  overallScore: z.number().min(0).max(100),
  matchScore: z.number().min(0).max(100).optional(),
  priorityRank: z.number().int().positive().optional(),
  preferredIncentives: z.array(z.string()).optional(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TalentProfile = z.infer<typeof TalentProfileSchema>;

export const IncentivePackageSchema = z.object({
  id: z.string().uuid(),
  talentId: z.string().uuid(),
  incentives: z.array(
    z.object({
      type: z.nativeEnum(IncentiveType as unknown as { [k: string]: string }),
      value: z.number().optional(),
      currency: z.string().default('EUR'),
      description: z.string(),
      validUntil: z.date().optional(),
    }),
  ),
  totalValue: z.number(),
  currency: z.string().default('EUR'),
  personalizationFactors: z.array(z.string()),
  generatedAt: z.date(),
  expiresAt: z.date().optional(),
  acceptedAt: z.date().optional(),
});

export type IncentivePackage = z.infer<typeof IncentivePackageSchema>;

export const OnboardingPlanSchema = z.object({
  id: z.string().uuid(),
  talentId: z.string().uuid(),
  phases: z.array(
    z.object({
      name: z.string(),
      duration: z.string(),
      tasks: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          dueDate: z.date().optional(),
          completed: z.boolean().default(false),
          resources: z.array(z.string()).optional(),
        }),
      ),
    }),
  ),
  upskillingSuggestions: z.array(
    z.object({
      skill: z.string(),
      currentLevel: z.string(),
      targetLevel: z.string(),
      resources: z.array(z.string()),
      estimatedDuration: z.string(),
    }),
  ),
  mentorAssigned: z.string().optional(),
  createdAt: z.date(),
  startDate: z.date().optional(),
});

export type OnboardingPlan = z.infer<typeof OnboardingPlanSchema>;

// API Request/Response types
export const CreateTalentRequestSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  nationality: z.string().optional(),
  currentLocation: z.string().optional(),
  skills: z
    .array(
      z.object({
        name: z.string(),
        category: z.string(),
        level: z.string(),
        yearsExperience: z.number().optional(),
      }),
    )
    .optional(),
});

export type CreateTalentRequest = z.infer<typeof CreateTalentRequestSchema>;

export const SearchTalentRequestSchema = z.object({
  query: z.string().optional(),
  skills: z.array(z.string()).optional(),
  minScore: z.number().min(0).max(100).optional(),
  status: z.array(z.string()).optional(),
  nationality: z.string().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
});

export type SearchTalentRequest = z.infer<typeof SearchTalentRequestSchema>;

export const MatchCriteriaSchema = z.object({
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()).optional(),
  minExperience: z.number().optional(),
  targetIndustries: z.array(z.string()).optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

export type MatchCriteria = z.infer<typeof MatchCriteriaSchema>;
