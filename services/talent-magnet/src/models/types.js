"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchCriteriaSchema = exports.SearchTalentRequestSchema = exports.CreateTalentRequestSchema = exports.OnboardingPlanSchema = exports.IncentivePackageSchema = exports.TalentProfileSchema = exports.SkillSchema = exports.TalentSignalSchema = exports.IncentiveType = exports.TalentStatus = exports.SkillLevel = exports.TalentSignalCategory = void 0;
const zod_1 = require("zod");
// Talent Signal Categories
exports.TalentSignalCategory = {
    ACADEMIC: 'academic',
    PROFESSIONAL: 'professional',
    OPEN_SOURCE: 'open_source',
    PATENTS: 'patents',
    PUBLICATIONS: 'publications',
    AWARDS: 'awards',
    CERTIFICATIONS: 'certifications',
    SOCIAL: 'social',
};
// Skill Level
exports.SkillLevel = {
    BEGINNER: 'beginner',
    INTERMEDIATE: 'intermediate',
    ADVANCED: 'advanced',
    EXPERT: 'expert',
    THOUGHT_LEADER: 'thought_leader',
};
// Talent Status
exports.TalentStatus = {
    IDENTIFIED: 'identified',
    CONTACTED: 'contacted',
    ENGAGED: 'engaged',
    ONBOARDING: 'onboarding',
    ACTIVE: 'active',
    DECLINED: 'declined',
    INACTIVE: 'inactive',
};
// Incentive Type
exports.IncentiveType = {
    RELOCATION_GRANT: 'relocation_grant',
    TAX_BENEFIT: 'tax_benefit',
    VISA_FAST_TRACK: 'visa_fast_track',
    HOUSING_SUBSIDY: 'housing_subsidy',
    RESEARCH_GRANT: 'research_grant',
    STARTUP_FUNDING: 'startup_funding',
    MENTORSHIP: 'mentorship',
    NETWORK_ACCESS: 'network_access',
    UPSKILLING: 'upskilling',
};
// Zod Schemas for validation
exports.TalentSignalSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    category: zod_1.z.nativeEnum(exports.TalentSignalCategory),
    source: zod_1.z.string(),
    sourceUrl: zod_1.z.string().url().optional(),
    title: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    score: zod_1.z.number().min(0).max(100),
    confidence: zod_1.z.number().min(0).max(1),
    detectedAt: zod_1.z.date(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.SkillSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    category: zod_1.z.string(),
    level: zod_1.z.nativeEnum(exports.SkillLevel),
    yearsExperience: zod_1.z.number().min(0).optional(),
    verified: zod_1.z.boolean().default(false),
    verificationSource: zod_1.z.string().optional(),
});
exports.TalentProfileSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    externalId: zod_1.z.string().optional(),
    firstName: zod_1.z.string(),
    lastName: zod_1.z.string(),
    email: zod_1.z.string().email().optional(),
    nationality: zod_1.z.string().optional(),
    currentLocation: zod_1.z.string().optional(),
    targetLocation: zod_1.z.string().default('Estonia'),
    status: zod_1.z.nativeEnum(exports.TalentStatus),
    skills: zod_1.z.array(exports.SkillSchema),
    signals: zod_1.z.array(exports.TalentSignalSchema),
    overallScore: zod_1.z.number().min(0).max(100),
    matchScore: zod_1.z.number().min(0).max(100).optional(),
    priorityRank: zod_1.z.number().int().positive().optional(),
    preferredIncentives: zod_1.z.array(zod_1.z.string()).optional(),
    notes: zod_1.z.string().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.IncentivePackageSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    talentId: zod_1.z.string().uuid(),
    incentives: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.nativeEnum(exports.IncentiveType),
        value: zod_1.z.number().optional(),
        currency: zod_1.z.string().default('EUR'),
        description: zod_1.z.string(),
        validUntil: zod_1.z.date().optional(),
    })),
    totalValue: zod_1.z.number(),
    currency: zod_1.z.string().default('EUR'),
    personalizationFactors: zod_1.z.array(zod_1.z.string()),
    generatedAt: zod_1.z.date(),
    expiresAt: zod_1.z.date().optional(),
    acceptedAt: zod_1.z.date().optional(),
});
exports.OnboardingPlanSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    talentId: zod_1.z.string().uuid(),
    phases: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        duration: zod_1.z.string(),
        tasks: zod_1.z.array(zod_1.z.object({
            title: zod_1.z.string(),
            description: zod_1.z.string(),
            dueDate: zod_1.z.date().optional(),
            completed: zod_1.z.boolean().default(false),
            resources: zod_1.z.array(zod_1.z.string()).optional(),
        })),
    })),
    upskillingSuggestions: zod_1.z.array(zod_1.z.object({
        skill: zod_1.z.string(),
        currentLevel: zod_1.z.string(),
        targetLevel: zod_1.z.string(),
        resources: zod_1.z.array(zod_1.z.string()),
        estimatedDuration: zod_1.z.string(),
    })),
    mentorAssigned: zod_1.z.string().optional(),
    createdAt: zod_1.z.date(),
    startDate: zod_1.z.date().optional(),
});
// API Request/Response types
exports.CreateTalentRequestSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    email: zod_1.z.string().email().optional(),
    nationality: zod_1.z.string().optional(),
    currentLocation: zod_1.z.string().optional(),
    skills: zod_1.z
        .array(zod_1.z.object({
        name: zod_1.z.string(),
        category: zod_1.z.string(),
        level: zod_1.z.string(),
        yearsExperience: zod_1.z.number().optional(),
    }))
        .optional(),
});
exports.SearchTalentRequestSchema = zod_1.z.object({
    query: zod_1.z.string().optional(),
    skills: zod_1.z.array(zod_1.z.string()).optional(),
    minScore: zod_1.z.number().min(0).max(100).optional(),
    status: zod_1.z.array(zod_1.z.string()).optional(),
    nationality: zod_1.z.string().optional(),
    limit: zod_1.z.number().int().positive().default(20),
    offset: zod_1.z.number().int().nonnegative().default(0),
});
exports.MatchCriteriaSchema = zod_1.z.object({
    requiredSkills: zod_1.z.array(zod_1.z.string()),
    preferredSkills: zod_1.z.array(zod_1.z.string()).optional(),
    minExperience: zod_1.z.number().optional(),
    targetIndustries: zod_1.z.array(zod_1.z.string()).optional(),
    urgency: zod_1.z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});
