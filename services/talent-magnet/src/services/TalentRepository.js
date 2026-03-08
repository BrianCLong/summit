"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.talentRepository = exports.TalentRepository = void 0;
const uuid_1 = require("uuid");
const types_js_1 = require("../models/types.js");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createChildLogger)('TalentRepository');
// In-memory store for demo - replace with PostgreSQL/Neo4j in production
const talentStore = new Map();
const incentiveStore = new Map();
const onboardingStore = new Map();
class TalentRepository {
    async create(data) {
        const now = new Date();
        const id = (0, uuid_1.v4)();
        const talent = {
            id,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            nationality: data.nationality,
            currentLocation: data.currentLocation,
            targetLocation: 'Estonia',
            status: types_js_1.TalentStatus.IDENTIFIED,
            skills: (data.skills || []).map((s) => ({
                id: (0, uuid_1.v4)(),
                name: s.name,
                category: s.category,
                level: s.level,
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
    async findById(id) {
        return talentStore.get(id) || null;
    }
    async findAll(params) {
        let results = Array.from(talentStore.values());
        // Filter by query (name search)
        if (params.query) {
            const q = params.query.toLowerCase();
            results = results.filter((t) => t.firstName.toLowerCase().includes(q) ||
                t.lastName.toLowerCase().includes(q));
        }
        // Filter by skills
        if (params.skills && params.skills.length > 0) {
            results = results.filter((t) => params.skills.some((skill) => t.skills.some((s) => s.name.toLowerCase() === skill.toLowerCase())));
        }
        // Filter by min score
        if (params.minScore !== undefined) {
            results = results.filter((t) => t.overallScore >= params.minScore);
        }
        // Filter by status
        if (params.status && params.status.length > 0) {
            results = results.filter((t) => params.status.includes(t.status));
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
    async update(id, updates) {
        const existing = talentStore.get(id);
        if (!existing)
            return null;
        if (!existing) {
            return null;
        }
        const updated = {
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
    async delete(id) {
        const existed = talentStore.has(id);
        talentStore.delete(id);
        incentiveStore.delete(id);
        onboardingStore.delete(id);
        if (existed) {
            logger.info({ talentId: id }, 'Talent deleted');
        }
        return existed;
    }
    async updateScore(id, score) {
        return this.update(id, { overallScore: Math.min(100, Math.max(0, score)) });
    }
    async updateStatus(id, status) {
        return this.update(id, { status: status });
    }
    // Incentive methods
    async saveIncentivePackage(pkg) {
        incentiveStore.set(pkg.talentId, pkg);
    }
    async getIncentivePackage(talentId) {
        return incentiveStore.get(talentId) || null;
    }
    // Onboarding methods
    async saveOnboardingPlan(plan) {
        onboardingStore.set(plan.talentId, plan);
    }
    async getOnboardingPlan(talentId) {
        return onboardingStore.get(talentId) || null;
    }
    // Analytics
    async getStats() {
        const talents = Array.from(talentStore.values());
        const byStatus = {};
        const skillCounts = {};
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
exports.TalentRepository = TalentRepository;
exports.talentRepository = new TalentRepository();
