"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IncentiveGenerator_js_1 = require("../services/IncentiveGenerator.js");
const types_js_1 = require("../models/types.js");
describe('IncentiveGenerator', () => {
    const mockTalent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john@example.com',
        nationality: 'US',
        currentLocation: 'New York',
        targetLocation: 'Estonia',
        status: types_js_1.TalentStatus.ENGAGED,
        skills: [
            {
                id: '1',
                name: 'Machine Learning',
                category: 'data-science',
                level: types_js_1.SkillLevel.EXPERT,
                yearsExperience: 6,
                verified: true,
            },
            {
                id: '2',
                name: 'Python',
                category: 'programming',
                level: types_js_1.SkillLevel.INTERMEDIATE,
                yearsExperience: 3,
                verified: true,
            },
        ],
        signals: [
            {
                id: 's1',
                category: 'publications',
                source: 'academic',
                title: 'Published researcher',
                score: 90,
                confidence: 0.95,
                detectedAt: new Date(),
            },
            {
                id: 's2',
                category: 'patents',
                source: 'patent_office',
                title: 'Patent holder',
                score: 85,
                confidence: 0.9,
                detectedAt: new Date(),
            },
        ],
        overallScore: 85,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    describe('generatePackage', () => {
        it('should generate incentive package with multiple incentives', () => {
            const pkg = IncentiveGenerator_js_1.incentiveGenerator.generatePackage(mockTalent);
            expect(pkg.talentId).toBe(mockTalent.id);
            expect(pkg.incentives.length).toBeGreaterThan(0);
            expect(pkg.currency).toBe('EUR');
            expect(pkg.generatedAt).toBeInstanceOf(Date);
        });
        it('should include relocation grant for international talents', () => {
            const pkg = IncentiveGenerator_js_1.incentiveGenerator.generatePackage(mockTalent);
            const relocationIncentive = pkg.incentives.find((i) => i.type === types_js_1.IncentiveType.RELOCATION_GRANT);
            expect(relocationIncentive).toBeDefined();
            expect(relocationIncentive.value).toBeGreaterThan(0);
        });
        it('should include research grant for published researchers', () => {
            const pkg = IncentiveGenerator_js_1.incentiveGenerator.generatePackage(mockTalent);
            const researchIncentive = pkg.incentives.find((i) => i.type === types_js_1.IncentiveType.RESEARCH_GRANT);
            expect(researchIncentive).toBeDefined();
        });
        it('should calculate total value correctly', () => {
            const pkg = IncentiveGenerator_js_1.incentiveGenerator.generatePackage(mockTalent);
            const calculatedTotal = pkg.incentives.reduce((sum, i) => sum + (i.value || 0), 0);
            expect(pkg.totalValue).toBe(calculatedTotal);
        });
        it('should identify personalization factors', () => {
            const pkg = IncentiveGenerator_js_1.incentiveGenerator.generatePackage(mockTalent);
            expect(pkg.personalizationFactors).toContain('high_potential');
            expect(pkg.personalizationFactors).toContain('international');
            expect(pkg.personalizationFactors).toContain('researcher');
        });
    });
    describe('adjustPackage', () => {
        it('should prioritize preferred incentives', () => {
            const pkg = IncentiveGenerator_js_1.incentiveGenerator.generatePackage(mockTalent);
            const preferences = [types_js_1.IncentiveType.RESEARCH_GRANT, types_js_1.IncentiveType.MENTORSHIP];
            const adjusted = IncentiveGenerator_js_1.incentiveGenerator.adjustPackage(pkg, preferences);
            expect(adjusted.personalizationFactors).toContain('preference_adjusted');
        });
    });
});
