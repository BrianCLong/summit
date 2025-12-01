import { v4 as uuidv4 } from 'uuid';
import {
  TalentProfile,
  TalentStatus,
  CreateTalentRequest,
  SearchTalentRequest,
  IncentivePackage,
  OnboardingPlan,
} from '../models/types.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('TalentRepository');

// In-memory store for demo - replace with PostgreSQL/Neo4j in production
const talentStore = new Map<string, TalentProfile>();
const incentiveStore = new Map<string, IncentivePackage>();
const onboardingStore = new Map<string, OnboardingPlan>();

export class TalentRepository {
  async create(data: CreateTalentRequest): Promise<TalentProfile> {
    const now = new Date();
    const id = uuidv4();

    const talent: TalentProfile = {
      id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      nationality: data.nationality,
      currentLocation: data.currentLocation,
      targetLocation: 'Estonia',
      status: TalentStatus.IDENTIFIED,
      skills: (data.skills || []).map((s) => ({
        id: uuidv4(),
        name: s.name,
        category: s.category,
        level: s.level as 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'thought_leader',
        yearsExperience: s.yearsExperience,
        verified: false,
      })),
      signals: [],
      overallScore: 50, // Default score, will be calculated
      createdAt: now,
      updatedAt: now,
    };

    talentStore.set(id, talent);
    logger.info({ talentId: id }, 'Talent created');
    return talent;
  }

  async findById(id: string): Promise<TalentProfile | null> {
    return talentStore.get(id) || null;
  }

  async findAll(params: SearchTalentRequest): Promise<{
    talents: TalentProfile[];
    total: number;
  }> {
    let results = Array.from(talentStore.values());

    // Filter by query (name search)
    if (params.query) {
      const q = params.query.toLowerCase();
      results = results.filter(
        (t) =>
          t.firstName.toLowerCase().includes(q) ||
          t.lastName.toLowerCase().includes(q),
      );
    }

    // Filter by skills
    if (params.skills && params.skills.length > 0) {
      results = results.filter((t) =>
        params.skills!.some((skill) =>
          t.skills.some((s) => s.name.toLowerCase() === skill.toLowerCase()),
        ),
      );
    }

    // Filter by min score
    if (params.minScore !== undefined) {
      results = results.filter((t) => t.overallScore >= params.minScore!);
    }

    // Filter by status
    if (params.status && params.status.length > 0) {
      results = results.filter((t) => params.status!.includes(t.status));
    }

    // Filter by nationality
    if (params.nationality) {
      results = results.filter((t) => t.nationality === params.nationality);
    }

    const total = results.length;

    // Apply pagination
    results = results.slice(params.offset, params.offset + params.limit);

    return { talents: results, total };
  }

  async update(
    id: string,
    updates: Partial<TalentProfile>,
  ): Promise<TalentProfile | null> {
    const existing = talentStore.get(id);
    if (!existing) return null;

    const updated: TalentProfile = {
      ...existing,
      ...updates,
      id, // Prevent ID override
      createdAt: existing.createdAt, // Prevent createdAt override
      updatedAt: new Date(),
    };

    talentStore.set(id, updated);
    logger.info({ talentId: id }, 'Talent updated');
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existed = talentStore.has(id);
    talentStore.delete(id);
    incentiveStore.delete(id);
    onboardingStore.delete(id);
    if (existed) {
      logger.info({ talentId: id }, 'Talent deleted');
    }
    return existed;
  }

  async updateScore(id: string, score: number): Promise<TalentProfile | null> {
    return this.update(id, { overallScore: Math.min(100, Math.max(0, score)) });
  }

  async updateStatus(
    id: string,
    status: string,
  ): Promise<TalentProfile | null> {
    return this.update(id, { status: status as TalentProfile['status'] });
  }

  // Incentive methods
  async saveIncentivePackage(pkg: IncentivePackage): Promise<void> {
    incentiveStore.set(pkg.talentId, pkg);
  }

  async getIncentivePackage(talentId: string): Promise<IncentivePackage | null> {
    return incentiveStore.get(talentId) || null;
  }

  // Onboarding methods
  async saveOnboardingPlan(plan: OnboardingPlan): Promise<void> {
    onboardingStore.set(plan.talentId, plan);
  }

  async getOnboardingPlan(talentId: string): Promise<OnboardingPlan | null> {
    return onboardingStore.get(talentId) || null;
  }

  // Analytics
  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    avgScore: number;
    topSkills: { skill: string; count: number }[];
  }> {
    const talents = Array.from(talentStore.values());

    const byStatus: Record<string, number> = {};
    const skillCounts: Record<string, number> = {};
    let totalScore = 0;

    for (const talent of talents) {
      byStatus[talent.status] = (byStatus[talent.status] || 0) + 1;
      totalScore += talent.overallScore;
      for (const skill of talent.skills) {
        skillCounts[skill.name] = (skillCounts[skill.name] || 0) + 1;
      }
    }

    const topSkills = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: talents.length,
      byStatus,
      avgScore: talents.length > 0 ? Math.round(totalScore / talents.length) : 0,
      topSkills,
    };
  }
}

export const talentRepository = new TalentRepository();
