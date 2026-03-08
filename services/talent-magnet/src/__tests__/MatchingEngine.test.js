"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MatchingEngine_js_1 = require("../services/MatchingEngine.js");
const types_js_1 = require("../models/types.js");
describe('MatchingEngine', () => {
    const mockTalent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        nationality: 'US',
        currentLocation: 'San Francisco',
        targetLocation: 'Estonia',
        status: types_js_1.TalentStatus.IDENTIFIED,
        skills: [
            {
                id: '1',
                name: 'TypeScript',
                category: 'programming',
                level: types_js_1.SkillLevel.EXPERT,
                yearsExperience: 5,
                verified: true,
            },
            {
                id: '2',
                name: 'React',
                category: 'frontend',
                level: types_js_1.SkillLevel.ADVANCED,
                yearsExperience: 4,
                verified: true,
            },
            {
                id: '3',
                name: 'Node.js',
                category: 'backend',
                level: types_js_1.SkillLevel.INTERMEDIATE,
                yearsExperience: 2,
                verified: false,
            },
        ],
        signals: [
            {
                id: 's1',
                category: 'open_source',
                source: 'github',
                title: 'Open source contributor',
                score: 80,
                confidence: 0.9,
                detectedAt: new Date(),
            },
        ],
        overallScore: 75,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    describe('calculateMatch', () => {
        it('should return high score when all required skills match', () => {
            const criteria = {
                requiredSkills: ['TypeScript', 'React'],
                preferredSkills: ['Node.js'],
                urgency: 'medium',
            };
            const result = MatchingEngine_js_1.matchingEngine.calculateMatch(mockTalent, criteria);
            expect(result.matchScore).toBeGreaterThan(70);
            expect(result.skillMatches.filter((m) => m.matched).length).toBe(3);
        });
        it('should return lower score when required skills are missing', () => {
            const criteria = {
                requiredSkills: ['Python', 'Django'],
                preferredSkills: ['TypeScript'],
                urgency: 'medium',
            };
            const result = MatchingEngine_js_1.matchingEngine.calculateMatch(mockTalent, criteria);
            expect(result.matchScore).toBeLessThan(60);
            expect(result.skillMatches.filter((m) => !m.matched && m.required).length).toBe(2);
        });
        it('should generate appropriate recommendation based on score', () => {
            const criteria = {
                requiredSkills: ['TypeScript'],
                urgency: 'high',
            };
            const result = MatchingEngine_js_1.matchingEngine.calculateMatch(mockTalent, criteria);
            expect(result.recommendation).toBeDefined();
            expect(typeof result.recommendation).toBe('string');
        });
    });
    describe('rankTalents', () => {
        it('should rank talents by match score descending', () => {
            const talents = [
                mockTalent,
                {
                    ...mockTalent,
                    id: '2',
                    skills: [],
                    overallScore: 30,
                },
            ];
            const criteria = {
                requiredSkills: ['TypeScript'],
                urgency: 'medium',
            };
            const results = MatchingEngine_js_1.matchingEngine.rankTalents(talents, criteria);
            expect(results[0].talentId).toBe(mockTalent.id);
            expect(results[0].matchScore).toBeGreaterThan(results[1].matchScore);
        });
    });
    describe('detectSignals', () => {
        it('should detect GitHub activity signal', () => {
            const data = {
                githubStars: 500,
                githubUrl: 'https://github.com/user/repo',
            };
            const signals = MatchingEngine_js_1.matchingEngine.detectSignals(data);
            expect(signals.length).toBe(1);
            expect(signals[0].category).toBe('open_source');
            expect(signals[0].source).toBe('github');
        });
        it('should detect multiple signals', () => {
            const data = {
                githubStars: 200,
                publications: 10,
                patents: 2,
            };
            const signals = MatchingEngine_js_1.matchingEngine.detectSignals(data);
            expect(signals.length).toBe(3);
        });
        it('should return empty array for no signals', () => {
            const signals = MatchingEngine_js_1.matchingEngine.detectSignals({});
            expect(signals.length).toBe(0);
        });
    });
});
