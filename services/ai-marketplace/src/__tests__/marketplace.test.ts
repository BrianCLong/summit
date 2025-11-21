import { describe, it, expect, beforeEach } from 'vitest';
import { AIMarketplaceService } from '../services/marketplace-service.js';
import { PreferenceLearningService } from '../services/preference-learning.js';
import { PersonalizationEngine } from '../engines/personalization-engine.js';

describe('AIMarketplaceService', () => {
  let service: AIMarketplaceService;

  beforeEach(() => {
    service = new AIMarketplaceService();
  });

  describe('browse', () => {
    it('should return experiences without filter', async () => {
      const experiences = await service.browse();
      expect(experiences.length).toBeGreaterThan(0);
    });

    it('should filter by persona', async () => {
      const citizenExperiences = await service.browse({ persona: 'citizen' });
      expect(citizenExperiences.every(e => e.persona === 'citizen')).toBe(true);

      const businessExperiences = await service.browse({ persona: 'business' });
      expect(businessExperiences.every(e => e.persona === 'business')).toBe(true);

      const developerExperiences = await service.browse({ persona: 'developer' });
      expect(developerExperiences.every(e => e.persona === 'developer')).toBe(true);
    });

    it('should filter by category', async () => {
      const experiences = await service.browse({ categories: ['healthcare'] });
      expect(experiences.every(e => e.category === 'healthcare')).toBe(true);
    });

    it('should filter by search term', async () => {
      const experiences = await service.browse({ search: 'code' });
      expect(experiences.some(e =>
        e.name.toLowerCase().includes('code') ||
        e.description.toLowerCase().includes('code')
      )).toBe(true);
    });
  });

  describe('recommendations', () => {
    it('should return personalized recommendations', async () => {
      const userId = 'test-user-1';

      // Set preferences
      await service.updateUserPreferences(userId, {
        persona: 'developer',
        locale: 'en-US',
        interests: ['code-review', 'api'],
      });

      const recommendations = await service.getRecommendations(userId);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].score).toBeGreaterThan(0);
      expect(recommendations[0].reasons.length).toBeGreaterThan(0);
    });

    it('should prioritize matching persona', async () => {
      const userId = 'test-user-2';

      await service.updateUserPreferences(userId, {
        persona: 'citizen',
        locale: 'en-US',
        interests: [],
      });

      const recommendations = await service.getRecommendations(userId);
      // Top recommendations should be for citizens
      const topRecs = recommendations.slice(0, 3);
      let hasCitizenExperience = false;
      for (const r of topRecs) {
        const exp = await service.getExperience(r.experienceId);
        if (exp?.persona === 'citizen') {
          hasCitizenExperience = true;
          break;
        }
      }
      expect(hasCitizenExperience).toBe(true);
    });
  });

  describe('installation', () => {
    it('should install and uninstall experiences', async () => {
      const userId = 'test-user-3';
      const experiences = await service.browse();
      const expId = experiences[0].id;

      // Install
      const installed = await service.installExperience(userId, expId);
      expect(installed).toBe(true);

      // Verify installed
      const installedList = await service.getInstalledExperiences(userId);
      expect(installedList.some(e => e.id === expId)).toBe(true);

      // Uninstall
      const uninstalled = await service.uninstallExperience(userId, expId);
      expect(uninstalled).toBe(true);

      // Verify uninstalled
      const afterUninstall = await service.getInstalledExperiences(userId);
      expect(afterUninstall.some(e => e.id === expId)).toBe(false);
    });
  });

  describe('ratings', () => {
    it('should rate experiences', async () => {
      const userId = 'test-user-4';
      const experiences = await service.browse();
      const expId = experiences[0].id;
      const originalRating = experiences[0].rating || 0;
      const originalCount = experiences[0].reviewCount;

      const rated = await service.rateExperience(userId, expId, 5);
      expect(rated).toBe(true);

      const updated = await service.getExperience(expId);
      expect(updated?.reviewCount).toBe(originalCount + 1);
    });

    it('should reject invalid ratings', async () => {
      const userId = 'test-user-5';
      const experiences = await service.browse();
      const expId = experiences[0].id;

      const rated = await service.rateExperience(userId, expId, 6);
      expect(rated).toBe(false);
    });
  });

  describe('publishing', () => {
    it('should publish new experiences', async () => {
      const experience = await service.publishExperience(
        'publisher-1',
        'Test Publisher',
        {
          name: 'Test Experience',
          description: 'A test AI experience',
          persona: 'developer',
          category: 'testing',
          tags: ['test', 'automation'],
          capabilities: ['test-runner'],
          supportedLocales: ['en-US'],
          version: '1.0.0',
          pricing: { model: 'free', currency: 'USD' },
          metadata: {},
        }
      );

      expect(experience.id).toBeDefined();
      expect(experience.name).toBe('Test Experience');
      expect(experience.publisher.id).toBe('publisher-1');

      // Verify it's in the catalog
      const found = await service.getExperience(experience.id);
      expect(found).toBeDefined();
    });
  });
});

describe('PreferenceLearningService', () => {
  let service: PreferenceLearningService;

  beforeEach(() => {
    service = new PreferenceLearningService();
  });

  it('should create default preferences for new users', async () => {
    const prefs = await service.getPreferences('new-user');
    expect(prefs.userId).toBe('new-user');
    expect(prefs.locale).toBe('en-US');
    expect(prefs.interactionHistory).toHaveLength(0);
  });

  it('should update preferences', async () => {
    const updated = await service.updatePreferences('user-1', {
      persona: 'business',
      interests: ['analytics', 'reporting'],
    });

    expect(updated.persona).toBe('business');
    expect(updated.interests).toContain('analytics');
  });

  it('should record interactions', async () => {
    await service.recordInteraction('user-2', 'exp-1', 'view');
    await service.recordInteraction('user-2', 'exp-1', 'install');

    const prefs = await service.getPreferences('user-2');
    expect(prefs.interactionHistory).toHaveLength(2);
    expect(prefs.interactionHistory[0].action).toBe('view');
    expect(prefs.interactionHistory[1].action).toBe('install');
  });
});

describe('PersonalizationEngine', () => {
  let engine: PersonalizationEngine;
  let learningService: PreferenceLearningService;

  beforeEach(() => {
    learningService = new PreferenceLearningService();
    engine = new PersonalizationEngine(learningService);
  });

  it('should compute similarity correctly', () => {
    const vec1 = [1, 0, 0];
    const vec2 = [1, 0, 0];
    expect(learningService.computeSimilarity(vec1, vec2)).toBeCloseTo(1);

    const vec3 = [0, 1, 0];
    expect(learningService.computeSimilarity(vec1, vec3)).toBeCloseTo(0);
  });
});
