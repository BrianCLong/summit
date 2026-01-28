import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  ClaimExtractor,
  ContradictionDetector,
  ClaimValidator,
} from '../OSINTPipeline.js';
import {
  Claim,
  OSINTProfile,
  SocialMediaProfile,
  CorporateRecord,
  PublicRecord,
} from '../types.js';

describe('ClaimExtractor', () => {
  let extractor: ClaimExtractor;
  const subjectId = 'test-subject-123';

  beforeEach(() => {
    extractor = new ClaimExtractor();
  });

  describe('extractFromProfile', () => {
    it('should extract claims from social profiles', () => {
      const profile: Partial<OSINTProfile> = {
        socialProfiles: [
          {
            platform: 'linkedin',
            username: 'johndoe',
            url: 'https://linkedin.com/in/johndoe',
            displayName: 'John Doe',
            lastActive: '2026-01-15',
          },
        ],
        corporateRecords: [],
        publicRecords: [],
      };

      const claims = extractor.extractFromProfile(profile, subjectId);

      expect(claims.length).toBeGreaterThanOrEqual(2);

      // Check for social account claim
      const socialClaim = claims.find(
        (c) => c.predicate === 'has_social_account'
      );
      expect(socialClaim).toBeDefined();
      expect(socialClaim?.subject).toBe(subjectId);
      expect(socialClaim?.object.platform).toBe('linkedin');
      expect(socialClaim?.confidence).toBeCloseTo(0.7, 1);

      // Check for known_as claim
      const nameClaim = claims.find((c) => c.predicate === 'known_as');
      expect(nameClaim).toBeDefined();
      expect(nameClaim?.object).toBe('John Doe');
    });

    it('should extract claims from corporate records', () => {
      const profile: Partial<OSINTProfile> = {
        socialProfiles: [],
        corporateRecords: [
          {
            companyName: 'Acme Corp',
            registrationNumber: 'REG123456',
            jurisdiction: 'Delaware',
            incorporationDate: '2020-01-01',
            status: 'active',
            officers: [{ name: 'Jane Smith', role: 'CEO' }],
          },
        ],
        publicRecords: [],
      };

      const claims = extractor.extractFromProfile(profile, subjectId);

      expect(claims.length).toBeGreaterThanOrEqual(2);

      // Check for company registration claim
      const corpClaim = claims.find(
        (c) => c.predicate === 'is_registered_company'
      );
      expect(corpClaim).toBeDefined();
      expect(corpClaim?.object.name).toBe('Acme Corp');
      expect(corpClaim?.confidence).toBeCloseTo(0.9, 1);
      expect(corpClaim?.validFrom).toBe('2020-01-01');

      // Check for officer claim
      const officerClaim = claims.find((c) => c.predicate === 'has_officer');
      expect(officerClaim).toBeDefined();
      expect(officerClaim?.object.name).toBe('Jane Smith');
    });

    it('should extract claims from public records', () => {
      const profile: Partial<OSINTProfile> = {
        socialProfiles: [],
        corporateRecords: [],
        publicRecords: [
          {
            source: 'county-records',
            recordType: 'court_filing',
            date: '2025-06-15',
            details: { caseNumber: 'CV-2025-001', type: 'civil' },
          },
        ],
      };

      const claims = extractor.extractFromProfile(profile, subjectId);

      expect(claims.length).toBe(1);

      const pubClaim = claims.find((c) => c.predicate === 'has_court_filing');
      expect(pubClaim).toBeDefined();
      expect(pubClaim?.confidence).toBeCloseTo(0.85, 1);
      expect(pubClaim?.validFrom).toBe('2025-06-15');
    });

    it('should log evidence for provenance tracking', () => {
      const profile: Partial<OSINTProfile> = {
        socialProfiles: [
          {
            platform: 'twitter',
            username: 'test',
            url: 'https://twitter.com/test',
          },
        ],
        corporateRecords: [],
        publicRecords: [],
      };

      extractor.extractFromProfile(profile, subjectId);
      const evidenceLog = extractor.getEvidenceLog();

      expect(evidenceLog.length).toBe(1);
      expect(evidenceLog[0].evidenceId).toMatch(/^E-\d{8}-\d{3}$/);
      expect(evidenceLog[0].action).toContain('extracted');
    });
  });
});

describe('ContradictionDetector', () => {
  let detector: ContradictionDetector;

  beforeEach(() => {
    detector = new ContradictionDetector();
  });

  describe('detectContradictions', () => {
    it('should detect status contradictions from different sources', () => {
      const claims: Claim[] = [
        {
          id: 'claim-1',
          sourceId: 'source-a',
          subject: 'company-123',
          predicate: 'has_status',
          object: 'active',
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        },
        {
          id: 'claim-2',
          sourceId: 'source-b',
          subject: 'company-123',
          predicate: 'has_status',
          object: 'dissolved',
          confidence: 0.85,
          timestamp: new Date().toISOString(),
        },
      ];

      const contradictions = detector.detectContradictions(claims);

      expect(contradictions.length).toBe(1);
      expect(contradictions[0].claimIdA).toBe('claim-1');
      expect(contradictions[0].claimIdB).toBe('claim-2');
      expect(contradictions[0].reason).toContain('Conflicting status');
      expect(contradictions[0].severity).toBe('high');
    });

    it('should detect temporal contradictions with overlapping periods', () => {
      const claims: Claim[] = [
        {
          id: 'claim-1',
          sourceId: 'source-a',
          subject: 'person-123',
          predicate: 'employed_at',
          object: { company: 'Acme Corp', role: 'Engineer' },
          confidence: 0.8,
          timestamp: new Date().toISOString(),
          validFrom: '2020-01-01',
          validTo: '2023-12-31',
        },
        {
          id: 'claim-2',
          sourceId: 'source-b',
          subject: 'person-123',
          predicate: 'employed_at',
          object: { company: 'Other Corp', role: 'Manager' },
          confidence: 0.75,
          timestamp: new Date().toISOString(),
          validFrom: '2022-01-01',
          validTo: '2024-06-30',
        },
      ];

      const contradictions = detector.detectContradictions(claims);

      expect(contradictions.length).toBe(1);
      expect(contradictions[0].reason).toContain('Temporal overlap');
      expect(contradictions[0].severity).toBe('medium');
    });

    it('should detect identity contradictions (different names)', () => {
      const claims: Claim[] = [
        {
          id: 'claim-1',
          sourceId: 'linkedin',
          subject: 'person-123',
          predicate: 'known_as',
          object: 'John Smith',
          confidence: 0.8,
          timestamp: new Date().toISOString(),
        },
        {
          id: 'claim-2',
          sourceId: 'twitter',
          subject: 'person-123',
          predicate: 'known_as',
          object: 'Robert Johnson',
          confidence: 0.7,
          timestamp: new Date().toISOString(),
        },
      ];

      const contradictions = detector.detectContradictions(claims);

      expect(contradictions.length).toBe(1);
      expect(contradictions[0].reason).toContain('Identity conflict');
      expect(contradictions[0].severity).toBe('high');
    });

    it('should not flag similar names as contradictions', () => {
      const claims: Claim[] = [
        {
          id: 'claim-1',
          sourceId: 'source-a',
          subject: 'person-123',
          predicate: 'known_as',
          object: 'John Smith',
          confidence: 0.8,
          timestamp: new Date().toISOString(),
        },
        {
          id: 'claim-2',
          sourceId: 'source-b',
          subject: 'person-123',
          predicate: 'known_as',
          object: 'John A. Smith',
          confidence: 0.75,
          timestamp: new Date().toISOString(),
        },
      ];

      const contradictions = detector.detectContradictions(claims);

      expect(contradictions.length).toBe(0);
    });

    it('should return empty array when no contradictions exist', () => {
      const claims: Claim[] = [
        {
          id: 'claim-1',
          sourceId: 'source-a',
          subject: 'company-123',
          predicate: 'has_status',
          object: 'active',
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        },
        {
          id: 'claim-2',
          sourceId: 'source-b',
          subject: 'company-456', // Different subject
          predicate: 'has_status',
          object: 'dissolved',
          confidence: 0.85,
          timestamp: new Date().toISOString(),
        },
      ];

      const contradictions = detector.detectContradictions(claims);

      expect(contradictions.length).toBe(0);
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
          predicate: 'is_registered_company',
          object: { name: 'Acme Corp' },
          confidence: 0.7,
          timestamp: new Date().toISOString(),
        },
        {
          id: 'claim-2',
          sourceId: 'source-b',
          subject: 'company-123',
          predicate: 'is_registered_company',
          object: { name: 'Acme Corp' },
          confidence: 0.65,
          timestamp: new Date().toISOString(),
        },
      ];

      const validated = await validator.validate(claims, []);

      // Both claims should have boosted confidence due to corroboration
      expect(validated[0].confidence).toBeGreaterThan(claims[0].confidence);
      expect(validated[1].confidence).toBeGreaterThan(claims[1].confidence);
    });

    it('should penalize contradicted claims', async () => {
      const claims: Claim[] = [
        {
          id: 'claim-1',
          sourceId: 'source-a',
          subject: 'company-123',
          predicate: 'has_status',
          object: 'active',
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        },
        {
          id: 'claim-2',
          sourceId: 'source-b',
          subject: 'company-123',
          predicate: 'has_status',
          object: 'dissolved',
          confidence: 0.85,
          timestamp: new Date().toISOString(),
        },
      ];

      const contradictions = [
        {
          id: 'c-1',
          claimIdA: 'claim-1',
          claimIdB: 'claim-2',
          reason: 'Conflicting status',
          detectedAt: new Date().toISOString(),
          severity: 'high' as const,
        },
      ];

      const validated = await validator.validate(claims, contradictions);

      // Contradicted claims should have reduced confidence
      expect(validated[0].confidence).toBeLessThan(claims[0].confidence);
      expect(validated[1].confidence).toBeLessThan(claims[1].confidence);
    });

    it('should add verification history to claims', async () => {
      const claims: Claim[] = [
        {
          id: 'claim-1',
          sourceId: 'source-a',
          subject: 'person-123',
          predicate: 'known_as',
          object: 'John Doe',
          confidence: 0.8,
          timestamp: new Date().toISOString(),
        },
      ];

      const validated = await validator.validate(claims, []);

      expect(validated[0].verificationHistory).toBeDefined();
      expect(validated[0].verificationHistory!.length).toBe(1);
      expect(validated[0].verificationHistory![0].verifierId).toBe(
        'osint-pipeline-validator'
      );
      expect(validated[0].verificationHistory![0].evidence).toBeDefined();
      expect(validated[0].verificationHistory![0].evidence![0]).toMatch(
        /^E-\d{8}-\d{3}$/
      );
    });

    it('should mark high-confidence claims as confirmed', async () => {
      const claims: Claim[] = [
        {
          id: 'claim-1',
          sourceId: 'corporate-registry',
          subject: 'company-123',
          predicate: 'is_registered_company',
          object: { name: 'Acme Corp' },
          confidence: 0.95,
          timestamp: new Date().toISOString(),
        },
      ];

      const validated = await validator.validate(claims, []);

      expect(validated[0].verificationHistory![0].status).toBe('confirmed');
    });

    it('should mark contradicted claims as uncertain', async () => {
      const claims: Claim[] = [
        {
          id: 'claim-1',
          sourceId: 'source-a',
          subject: 'company-123',
          predicate: 'has_status',
          object: 'active',
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        },
      ];

      const contradictions = [
        {
          id: 'c-1',
          claimIdA: 'claim-1',
          claimIdB: 'claim-2',
          reason: 'Test contradiction',
          detectedAt: new Date().toISOString(),
          severity: 'medium' as const,
        },
      ];

      const validated = await validator.validate(claims, contradictions);

      expect(validated[0].verificationHistory![0].status).toBe('uncertain');
    });

    it('should apply recency factor to older claims', async () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);

      const claims: Claim[] = [
        {
          id: 'claim-1',
          sourceId: 'source-a',
          subject: 'person-123',
          predicate: 'employed_at',
          object: 'Old Company',
          confidence: 0.8,
          timestamp: oldDate.toISOString(),
        },
        {
          id: 'claim-2',
          sourceId: 'source-b',
          subject: 'person-123',
          predicate: 'employed_at',
          object: 'New Company',
          confidence: 0.8,
          timestamp: new Date().toISOString(),
        },
      ];

      const validated = await validator.validate(claims, []);

      // Recent claim should have higher confidence after recency factor
      expect(validated[1].confidence).toBeGreaterThan(validated[0].confidence);
    });
  });
});

describe('Integration: Full Claim Validation Pipeline', () => {
  it('should process a complete OSINT profile through the validation pipeline', async () => {
    const extractor = new ClaimExtractor();
    const detector = new ContradictionDetector();
    const validator = new ClaimValidator();

    // Synthetic profile with potential contradictions
    const profile: Partial<OSINTProfile> = {
      socialProfiles: [
        {
          platform: 'linkedin',
          username: 'johndoe',
          url: 'https://linkedin.com/in/johndoe',
          displayName: 'John Doe',
        },
        {
          platform: 'twitter',
          username: 'jdoe_official',
          url: 'https://twitter.com/jdoe_official',
          displayName: 'Jonathan Doe',
        },
      ],
      corporateRecords: [
        {
          companyName: 'Doe Industries',
          registrationNumber: 'DI-001',
          jurisdiction: 'Delaware',
          status: 'active',
        },
      ],
      publicRecords: [],
    };

    const subjectId = 'test-subject';

    // Step 1: Extract claims
    const claims = extractor.extractFromProfile(profile, subjectId);
    expect(claims.length).toBeGreaterThan(0);

    // Step 2: Detect contradictions
    const contradictions = detector.detectContradictions(claims);
    // May or may not have contradictions depending on name similarity

    // Step 3: Validate claims
    const validatedClaims = await validator.validate(claims, contradictions);

    // All claims should have verification history
    for (const claim of validatedClaims) {
      expect(claim.verificationHistory).toBeDefined();
      expect(claim.verificationHistory!.length).toBeGreaterThan(0);
    }

    // Evidence log should be populated
    const evidenceLog = extractor.getEvidenceLog();
    expect(evidenceLog.length).toBeGreaterThan(0);
  });
});
