/**
 * Repository Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  ThreatLibraryRepository,
  getRepository,
  resetRepository,
} from '../repository.js';
import { NotFoundError, ValidationError } from '../errors.js';
import type { ThreatArchetype, TTP, PatternTemplate, IndicatorPattern } from '../types.js';

describe('ThreatLibraryRepository', () => {
  let repository: ThreatLibraryRepository;

  beforeEach(() => {
    resetRepository();
    repository = getRepository();
  });

  afterEach(() => {
    resetRepository();
  });

  describe('ThreatArchetype operations', () => {
    const validArchetypeData: Omit<ThreatArchetype, 'id' | 'metadata'> = {
      name: 'Test Threat',
      description: 'A test threat archetype',
      summary: 'Test summary',
      sophistication: 'ADVANCED',
      motivation: ['ESPIONAGE'],
      targetSectors: ['GOVERNMENT'],
      typicalTTPs: [],
      patternTemplates: [],
      indicators: [],
      countermeasures: [
        {
          id: 'cm1',
          name: 'Test Countermeasure',
          description: 'Test description',
          effectiveness: 'HIGH',
        },
      ],
      riskScore: 75,
      prevalence: 'COMMON',
      active: true,
      status: 'ACTIVE',
    };

    it('should create a threat archetype', async () => {
      const result = await repository.createThreatArchetype(validArchetypeData, {
        author: 'test-user',
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test Threat');
      expect(result.metadata.version).toBe(1);
      expect(result.metadata.createdBy).toBe('test-user');
    });

    it('should retrieve a threat archetype by ID', async () => {
      const created = await repository.createThreatArchetype(validArchetypeData, {
        author: 'test-user',
      });

      const retrieved = await repository.getThreatArchetypeById(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.name).toBe('Test Threat');
    });

    it('should throw NotFoundError for non-existent archetype', async () => {
      await expect(
        repository.getThreatArchetypeById('non-existent-id')
      ).rejects.toThrow(NotFoundError);
    });

    it('should list threat archetypes with pagination', async () => {
      // Create multiple archetypes
      for (let i = 0; i < 5; i++) {
        await repository.createThreatArchetype(
          { ...validArchetypeData, name: `Threat ${i}`, riskScore: 50 + i * 10 },
          { author: 'test-user' }
        );
      }

      const result = await repository.listThreatArchetypes({}, { page: 1, limit: 3 });

      expect(result.items.length).toBe(3);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('should filter archetypes by status', async () => {
      await repository.createThreatArchetype(validArchetypeData, { author: 'test' });
      await repository.createThreatArchetype(
        { ...validArchetypeData, name: 'Deprecated', status: 'DEPRECATED' },
        { author: 'test' }
      );

      const activeOnly = await repository.listThreatArchetypes(
        { status: 'ACTIVE' },
        { page: 1, limit: 10 }
      );

      expect(activeOnly.items.length).toBe(1);
      expect(activeOnly.items[0].name).toBe('Test Threat');
    });

    it('should filter archetypes by search term', async () => {
      await repository.createThreatArchetype(validArchetypeData, { author: 'test' });
      await repository.createThreatArchetype(
        { ...validArchetypeData, name: 'APT Campaign', description: 'Advanced threat' },
        { author: 'test' }
      );

      const searchResult = await repository.listThreatArchetypes(
        { search: 'APT' },
        { page: 1, limit: 10 }
      );

      expect(searchResult.items.length).toBe(1);
      expect(searchResult.items[0].name).toBe('APT Campaign');
    });

    it('should update a threat archetype', async () => {
      const created = await repository.createThreatArchetype(validArchetypeData, {
        author: 'test-user',
      });

      const updated = await repository.updateThreatArchetype(
        created.id,
        { name: 'Updated Threat', riskScore: 90 },
        { author: 'updater', description: 'Updated name and score' }
      );

      expect(updated.name).toBe('Updated Threat');
      expect(updated.riskScore).toBe(90);
      expect(updated.metadata.version).toBe(2);
      expect(updated.metadata.updatedBy).toBe('updater');
      expect(updated.metadata.changelog.length).toBe(2);
    });

    it('should soft delete (archive) a threat archetype', async () => {
      const created = await repository.createThreatArchetype(validArchetypeData, {
        author: 'test-user',
      });

      await repository.deleteThreatArchetype(created.id, { author: 'deleter' });

      const archived = await repository.getThreatArchetypeById(created.id);
      expect(archived.status).toBe('ARCHIVED');
      expect(archived.active).toBe(false);
    });
  });

  describe('TTP operations', () => {
    const validTTPData: Omit<TTP, 'id' | 'metadata'> = {
      name: 'Test TTP',
      description: 'A test TTP',
      tactic: 'INITIAL_ACCESS',
      techniqueId: 'T1566',
      techniqueName: 'Phishing',
      procedures: [],
      platforms: ['WINDOWS'],
      dataSources: ['Email'],
      mitreReference: {
        techniqueId: 'T1566',
        techniqueName: 'Phishing',
        tacticIds: ['TA0001'],
        mitreUrl: 'https://attack.mitre.org/techniques/T1566/',
      },
      severity: 'HIGH',
      prevalence: 'COMMON',
      status: 'ACTIVE',
    };

    it('should create a TTP', async () => {
      const result = await repository.createTTP(validTTPData, { author: 'test' });

      expect(result.id).toBeDefined();
      expect(result.techniqueId).toBe('T1566');
    });

    it('should get TTP by ID', async () => {
      const created = await repository.createTTP(validTTPData, { author: 'test' });
      const retrieved = await repository.getTTPById(created.id);

      expect(retrieved.id).toBe(created.id);
    });

    it('should get TTPs by technique ID', async () => {
      await repository.createTTP(validTTPData, { author: 'test' });
      await repository.createTTP(
        { ...validTTPData, techniqueId: 'T1059', techniqueName: 'Command Line' },
        { author: 'test' }
      );

      const results = await repository.getTTPsByTechniqueId('T1566');

      expect(results.length).toBe(1);
      expect(results[0].techniqueId).toBe('T1566');
    });

    it('should list TTPs with tactic filter', async () => {
      await repository.createTTP(validTTPData, { author: 'test' });
      await repository.createTTP(
        {
          ...validTTPData,
          tactic: 'EXECUTION',
          techniqueId: 'T1059',
        },
        { author: 'test' }
      );

      const results = await repository.listTTPs(
        { tactic: 'INITIAL_ACCESS' },
        { page: 1, limit: 10 }
      );

      expect(results.items.length).toBe(1);
      expect(results.items[0].tactic).toBe('INITIAL_ACCESS');
    });
  });

  describe('PatternTemplate operations', () => {
    const validPatternData: Omit<PatternTemplate, 'id' | 'metadata'> = {
      name: 'Test Pattern',
      description: 'A test pattern',
      category: 'LATERAL_MOVEMENT',
      graphMotifs: [
        {
          id: 'motif-1',
          name: 'Test Motif',
          description: 'Test motif description',
          nodes: [{ id: 'n1', type: 'THREAT_ACTOR' }],
          edges: [],
          weight: 1,
        },
      ],
      signals: [],
      indicators: [],
      ttps: [],
      requiredMotifMatches: 1,
      requiredSignalMatches: 0,
      severity: 'HIGH',
      status: 'ACTIVE',
    };

    it('should create a pattern template', async () => {
      const result = await repository.createPatternTemplate(validPatternData, {
        author: 'test',
      });

      expect(result.id).toBeDefined();
      expect(result.category).toBe('LATERAL_MOVEMENT');
    });

    it('should get pattern by ID', async () => {
      const created = await repository.createPatternTemplate(validPatternData, {
        author: 'test',
      });
      const retrieved = await repository.getPatternTemplateById(created.id);

      expect(retrieved.id).toBe(created.id);
    });

    it('should list patterns with category filter', async () => {
      await repository.createPatternTemplate(validPatternData, { author: 'test' });
      await repository.createPatternTemplate(
        { ...validPatternData, category: 'DATA_EXFILTRATION' },
        { author: 'test' }
      );

      const results = await repository.listPatternTemplates(
        { category: 'LATERAL_MOVEMENT' },
        { page: 1, limit: 10 }
      );

      expect(results.items.length).toBe(1);
    });
  });

  describe('IndicatorPattern operations', () => {
    const validIndicatorData: Omit<IndicatorPattern, 'id' | 'metadata'> = {
      name: 'Test Indicator',
      description: 'A test indicator',
      type: 'IP_ADDRESS',
      pattern: '192.168.1.0/24',
      patternFormat: 'LITERAL',
      confidence: 'HIGH',
      severity: 'MEDIUM',
      validFrom: new Date().toISOString(),
      status: 'ACTIVE',
    };

    it('should create an indicator pattern', async () => {
      const result = await repository.createIndicatorPattern(validIndicatorData, {
        author: 'test',
      });

      expect(result.id).toBeDefined();
      expect(result.type).toBe('IP_ADDRESS');
    });

    it('should get indicator by ID', async () => {
      const created = await repository.createIndicatorPattern(validIndicatorData, {
        author: 'test',
      });
      const retrieved = await repository.getIndicatorPatternById(created.id);

      expect(retrieved.id).toBe(created.id);
    });
  });

  describe('Statistics', () => {
    it('should return repository statistics', async () => {
      const stats = await repository.getStatistics();

      expect(stats).toHaveProperty('threatArchetypes');
      expect(stats).toHaveProperty('ttps');
      expect(stats).toHaveProperty('patternTemplates');
      expect(stats).toHaveProperty('indicatorPatterns');
      expect(stats).toHaveProperty('cacheStats');
    });
  });
});
