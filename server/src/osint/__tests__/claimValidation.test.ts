import { describe, it, expect, beforeEach } from '@jest/globals';
import { ClaimExtractor } from '../ClaimExtractor.js';
import { ClaimValidator } from '../ClaimValidator.js';
import { ContradictionDetector } from '../ContradictionDetector.js';
import { OSINTPipeline } from '../OSINTPipeline.js';
import {
  Claim,
  Contradiction,
  OSINTEnrichmentResult,
  SocialMediaProfile,
  CorporateRecord,
} from '../types.js';

describe('ClaimExtractor', () => {
  let extractor: ClaimExtractor;

  beforeEach(() => {
    extractor = new ClaimExtractor();
  });

  describe('extract', () => {
    it('should extract claims from social profile enrichment results', () => {
      const socialProfile: SocialMediaProfile = {
        platform: 'linkedin',
        username: 'johndoe',
        url: 'https://linkedin.com/in/johndoe',
        displayName: 'John Doe',
        lastActive: '2026-01-15',
      };

      const results: OSINTEnrichmentResult[] = [
        {
          source: 'linkedin-connector',
          data: socialProfile,
          confidence: 0.8,
          timestamp: new Date().toISOString(),
        },
      ];

      const claims = extractor.extract(results);

      expect(claims.length).toBeGreaterThanOrEqual(2);

      // Check for account claim
      const accountClaim = claims.find((c) => c.predicate === 'hasAccount');
      expect(accountClaim).toBeDefined();
      expect(accountClaim?.object).toEqual({
        platform: 'linkedin',
        url: 'https://linkedin.com/in/johndoe',
      });

      // Check for display name claim
      const nameClaim = claims.find((c) => c.predicate === 'hasDisplayName');
      expect(nameClaim).toBeDefined();
      expect(nameClaim?.object).toBe('John Doe');
    });

    it('should extract claims from corporate record enrichment results', () => {
      const corpRecord: CorporateRecord = {
        companyName: 'Acme Corp',
        registrationNumber: 'REG123456',
        jurisdiction: 'Delaware',
        incorporationDate: '2020-01-01',
        status: 'active',
        officers: [{ name: 'Jane Smith', role: 'CEO' }],
      };

      const results: OSINTEnrichmentResult[] = [
        {
          source: 'delaware-registry',
          data: corpRecord,
          confidence: 0.95,
          timestamp: new Date().toISOString(),
        },
      ];

      const claims = extractor.extract(results);

      expect(claims.length).toBeGreaterThanOrEqual(3);

      // Check for company registration claim
      const regClaim = claims.find((c) => c.predicate === 'isRegisteredAs');
      expect(regClaim).toBeDefined();
      expect(regClaim?.object).toBe('Acme Corp');

      // Check for status claim
      const statusClaim = claims.find((c) => c.predicate === 'hasStatus');
      expect(statusClaim).toBeDefined();
      expect(statusClaim?.object).toBe('active');

      // Check for officer claim
      const officerClaim = claims.find((c) => c.predicate === 'hasOfficer');
      expect(officerClaim).toBeDefined();
      expect(officerClaim?.object).toEqual({ name: 'Jane Smith', role: 'CEO' });
    });

    it('should generate unique claim IDs based on content', () => {
      const results: OSINTEnrichmentResult[] = [
        {
          source: 'source-a',
          data: { platform: 'twitter', username: 'test' } as SocialMediaProfile,
          confidence: 0.7,
          timestamp: new Date().toISOString(),
        },
      ];

      const claims1 = extractor.extract(results);
      const claims2 = extractor.extract(results);

      // Same input should produce same claim IDs (content-based hashing)
      expect(claims1[0].id).toBe(claims2[0].id);
    });
  });
});

describe('ClaimValidator', () => {
  let validator: ClaimValidator;

  beforeEach(() => {
    validator = new ClaimValidator();
  });

  describe('validate', () => {
    it('should boost confidence for corroborated claims', async () => {
      const claims: Claim[] = [
        {
          id: 'claim-1',
          sourceId: 'source-a',
          subject: 'company-123',
          predicate: 'isRegisteredAs',
          object: 'Acme Corp',
          confidence: 0.7,
          timestamp: new Date().toISOString(),
        },
        {
          id: 'claim-2',
          sourceId: 'source-b',
          subject: 'company-123',
          predicate: 'isRegisteredAs',
          object: 'Acme Corp',
          confidence: 0.65,
          timestamp: new Date().toISOString(),
        },
      ];

      const validated = await validator.validate(claims);

      // Both claims should have verification history
      expect(validated[0].verificationHistory?.length).toBeGreaterThan(0);
      expect(validated[1].verificationHistory?.length).toBeGreaterThan(0);

      // Corroborated claims should have boosted confidence
      const corroborationResult = validated[0].verificationHistory?.find(
        (v) => v.verifierId === 'corroboration'
      );
      expect(corroborationResult?.status).toBe('confirmed');
    });

    it('should penalize conflicting claims', async () => {
      const claims: Claim[] = [
        {
          id: 'claim-1',
          sourceId: 'source-a',
          subject: 'company-123',
          predicate: 'hasStatus',
          object: 'active',
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        },
        {
          id: 'claim-2',
          sourceId: 'source-b',
          subject: 'company-123',
          predicate: 'hasStatus',
          object: 'dissolved',
          confidence: 0.85,
          timestamp: new Date().toISOString(),
        },
      ];

      const validated = await validator.validate(claims);

      // Check that conflicting claims are marked appropriately
      const refutedResults = validated.flatMap(
        (c) => c.verificationHistory?.filter((v) => v.status === 'refuted') || []
      );

      // At least one claim should show evidence of conflict
      expect(refutedResults.length + validated.filter(c =>
        c.verificationHistory?.some(v => v.status === 'uncertain')
      ).length).toBeGreaterThan(0);
    });

    it('should apply temporal consistency checks', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const claims: Claim[] = [
        {
          id: 'claim-1',
          sourceId: 'source-a',
          subject: 'company-123',
          predicate: 'incorporatedOn',
          object: futureDate.toISOString(),
          confidence: 0.9,
          timestamp: new Date().toISOString(),
          validFrom: futureDate.toISOString(),
        },
      ];

      const validated = await validator.validate(claims);

      // Claim with future validity should be flagged
      const temporalResult = validated[0].verificationHistory?.find(
        (v) => v.verifierId === 'temporal-consistency'
      );
      expect(temporalResult).toBeDefined();
      expect(temporalResult?.status).not.toBe('confirmed');
    });
  });
});

describe('ContradictionDetector', () => {
  let detector: ContradictionDetector;

  beforeEach(() => {
    detector = new ContradictionDetector();
  });

  describe('detect', () => {
    it('should detect temporal overlap contradictions', () => {
      const claims: Claim[] = [
        {
          id: 'claim-1',
          sourceId: 'source-a',
          subject: 'company-123',
          predicate: 'hasStatus',
          object: 'active',
          confidence: 0.9,
          timestamp: new Date().toISOString(),
          validFrom: '2020-01-01',
          validTo: '2023-12-31',
        },
        {
          id: 'claim-2',
          sourceId: 'source-b',
          subject: 'company-123',
          predicate: 'hasStatus',
          object: 'dissolved',
          confidence: 0.85,
          timestamp: new Date().toISOString(),
          validFrom: '2022-01-01',
          validTo: '2024-06-30',
        },
      ];

      const contradictions = detector.detect(claims);

      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions[0].severity).toBe('high');
      expect(contradictions[0].reason).toContain('Temporal Overlap');
    });

    it('should detect mutual exclusion contradictions', () => {
      const claims: Claim[] = [
        {
          id: 'claim-1',
          sourceId: 'source-a',
          subject: 'company-123',
          predicate: 'hasStatus',
          object: 'active',
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        },
        {
          id: 'claim-2',
          sourceId: 'source-b',
          subject: 'company-123',
          predicate: 'hasStatus',
          object: 'dissolved',
          confidence: 0.85,
          timestamp: new Date().toISOString(),
        },
      ];

      const contradictions = detector.detect(claims);

      expect(contradictions.length).toBeGreaterThan(0);
      const mutualExclusion = contradictions.find((c) =>
        c.reason.includes('Mutual Exclusion')
      );
      expect(mutualExclusion).toBeDefined();
      expect(mutualExclusion?.severity).toBe('high');
    });

    it('should not flag claims about different subjects', () => {
      const claims: Claim[] = [
        {
          id: 'claim-1',
          sourceId: 'source-a',
          subject: 'company-123',
          predicate: 'hasStatus',
          object: 'active',
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        },
        {
          id: 'claim-2',
          sourceId: 'source-b',
          subject: 'company-456', // Different subject
          predicate: 'hasStatus',
          object: 'dissolved',
          confidence: 0.85,
          timestamp: new Date().toISOString(),
        },
      ];

      const contradictions = detector.detect(claims);

      expect(contradictions.length).toBe(0);
    });

    it('should detect numeric discrepancies', () => {
      const claims: Claim[] = [
        {
          id: 'claim-1',
          sourceId: 'source-a',
          subject: 'user:twitter:johndoe',
          predicate: 'hasFollowerCount',
          object: 10000,
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        },
        {
          id: 'claim-2',
          sourceId: 'source-b',
          subject: 'user:twitter:johndoe',
          predicate: 'hasFollowerCount',
          object: 50000, // 5x difference
          confidence: 0.85,
          timestamp: new Date().toISOString(),
        },
      ];

      const contradictions = detector.detect(claims);

      // Should detect significant numeric discrepancy
      const numericContradiction = contradictions.find((c) =>
        c.reason.includes('Numeric')
      );
      expect(numericContradiction).toBeDefined();
    });
  });

  describe('detectForClaim', () => {
    it('should detect contradictions for a single new claim', () => {
      const existingClaims: Claim[] = [
        {
          id: 'existing-1',
          sourceId: 'source-a',
          subject: 'company-123',
          predicate: 'hasStatus',
          object: 'active',
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        },
      ];

      const newClaim: Claim = {
        id: 'new-1',
        sourceId: 'source-b',
        subject: 'company-123',
        predicate: 'hasStatus',
        object: 'dissolved',
        confidence: 0.85,
        timestamp: new Date().toISOString(),
      };

      const contradictions = detector.detectForClaim(newClaim, existingClaims);

      expect(contradictions.length).toBeGreaterThan(0);
    });
  });
});

describe('OSINTPipeline Integration', () => {
  describe('helper methods', () => {
    it('should get low confidence claims', () => {
      const pipeline = new OSINTPipeline();

      const mockProfile = {
        id: 'test-profile',
        tenantId: 'tenant-1',
        kind: 'person' as const,
        properties: {},
        externalRefs: [],
        labels: [],
        sourceIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        socialProfiles: [],
        corporateRecords: [],
        publicRecords: [],
        confidenceScore: 0.5,
        lastEnrichedAt: new Date().toISOString(),
        claims: [
          {
            id: 'high-conf',
            sourceId: 'source-a',
            subject: 'test',
            predicate: 'test',
            object: 'test',
            confidence: 0.9,
            timestamp: new Date().toISOString(),
          },
          {
            id: 'low-conf',
            sourceId: 'source-b',
            subject: 'test',
            predicate: 'test',
            object: 'test',
            confidence: 0.3,
            timestamp: new Date().toISOString(),
          },
        ],
        contradictions: [],
      };

      const lowConfClaims = pipeline.getLowConfidenceClaims(mockProfile, 0.5);

      expect(lowConfClaims.length).toBe(1);
      expect(lowConfClaims[0].id).toBe('low-conf');
    });

    it('should get critical contradictions', () => {
      const pipeline = new OSINTPipeline();

      const mockProfile = {
        id: 'test-profile',
        tenantId: 'tenant-1',
        kind: 'person' as const,
        properties: {},
        externalRefs: [],
        labels: [],
        sourceIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        socialProfiles: [],
        corporateRecords: [],
        publicRecords: [],
        confidenceScore: 0.5,
        lastEnrichedAt: new Date().toISOString(),
        claims: [],
        contradictions: [
          {
            id: 'high-sev',
            claimIdA: 'a',
            claimIdB: 'b',
            reason: 'Test high',
            detectedAt: new Date().toISOString(),
            severity: 'high' as const,
          },
          {
            id: 'low-sev',
            claimIdA: 'c',
            claimIdB: 'd',
            reason: 'Test low',
            detectedAt: new Date().toISOString(),
            severity: 'low' as const,
          },
        ],
      };

      const critical = pipeline.getCriticalContradictions(mockProfile);

      expect(critical.length).toBe(1);
      expect(critical[0].id).toBe('high-sev');
    });
  });
});
