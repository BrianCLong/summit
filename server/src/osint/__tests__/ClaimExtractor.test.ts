/**
 * ClaimExtractor Service - Test Suite
 * Tests for Automation Turn #5: Claim-Centric Validation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ClaimExtractor } from '../ClaimExtractor.js';
import { OSINTEnrichmentResult, SocialMediaProfile, CorporateRecord, PublicRecord } from '../types.js';

describe('ClaimExtractor', () => {
  let extractor: ClaimExtractor;

  beforeEach(() => {
    extractor = new ClaimExtractor();
  });

  describe('extract()', () => {
    it('should return empty array for empty input', () => {
      const claims = extractor.extract([]);
      expect(claims).toEqual([]);
    });

    it('should skip results with null data', () => {
      const results: OSINTEnrichmentResult[] = [
        { source: 'test-source', data: null, confidence: 0.8 },
      ];
      const claims = extractor.extract(results);
      expect(claims).toEqual([]);
    });
  });

  describe('Social Media Profile Extraction', () => {
    it('should extract claims from a social media profile', () => {
      const profile: SocialMediaProfile = {
        platform: 'twitter',
        username: 'testuser',
        url: 'https://twitter.com/testuser',
        displayName: 'Test User',
        bio: 'Software Engineer',
        followersCount: 1000,
        lastActive: '2026-01-01T00:00:00Z',
      };

      const results: OSINTEnrichmentResult[] = [
        { source: 'social-connector', data: profile, confidence: 0.85 },
      ];

      const claims = extractor.extract(results);

      expect(claims.length).toBeGreaterThanOrEqual(5);

      // Check for hasAccount claim
      const accountClaim = claims.find(c => c.predicate === 'hasAccount');
      expect(accountClaim).toBeDefined();
      expect(accountClaim?.subject).toBe('twitter:testuser');
      expect(accountClaim?.confidence).toBe(0.85);
      expect(accountClaim?.object).toEqual({ platform: 'twitter', url: 'https://twitter.com/testuser' });

      // Check for hasDisplayName claim
      const displayNameClaim = claims.find(c => c.predicate === 'hasDisplayName');
      expect(displayNameClaim).toBeDefined();
      expect(displayNameClaim?.object).toBe('Test User');

      // Check for hasBio claim
      const bioClaim = claims.find(c => c.predicate === 'hasBio');
      expect(bioClaim).toBeDefined();
      expect(bioClaim?.object).toBe('Software Engineer');

      // Check for hasFollowerCount claim with temporal bounds
      const followerClaim = claims.find(c => c.predicate === 'hasFollowerCount');
      expect(followerClaim).toBeDefined();
      expect(followerClaim?.object).toBe(1000);
      expect(followerClaim?.validFrom).toBeDefined();
      expect(followerClaim?.validTo).toBeDefined();

      // Check for lastActiveAt claim
      const lastActiveClaim = claims.find(c => c.predicate === 'lastActiveAt');
      expect(lastActiveClaim).toBeDefined();
      expect(lastActiveClaim?.object).toBe('2026-01-01T00:00:00Z');
    });

    it('should generate unique claim IDs based on content hash', () => {
      const profile: SocialMediaProfile = {
        platform: 'github',
        username: 'devuser',
        url: 'https://github.com/devuser',
      };

      const results: OSINTEnrichmentResult[] = [
        { source: 'github-connector', data: profile, confidence: 0.9 },
      ];

      const claims = extractor.extract(results);

      // All claims should have unique IDs starting with 'claim-'
      const ids = claims.map(c => c.id);
      expect(ids.every(id => id.startsWith('claim-'))).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('Corporate Record Extraction', () => {
    it('should extract claims from a corporate record', () => {
      const record: CorporateRecord = {
        companyName: 'Acme Corporation',
        registrationNumber: 'REG123456',
        jurisdiction: 'Delaware',
        incorporationDate: '2020-01-15',
        status: 'active',
        officers: [
          { name: 'John Doe', role: 'CEO' },
          { name: 'Jane Smith', role: 'CFO' },
        ],
        address: '123 Main St, Wilmington, DE',
      };

      const results: OSINTEnrichmentResult[] = [
        { source: 'corp-registry', data: record, confidence: 0.95 },
      ];

      const claims = extractor.extract(results);

      // Should have claims for: isRegisteredAs, registeredInJurisdiction, incorporatedOn,
      // hasStatus, 2x hasOfficer, locatedAt
      expect(claims.length).toBeGreaterThanOrEqual(7);

      // Check company registration claim
      const regClaim = claims.find(c => c.predicate === 'isRegisteredAs');
      expect(regClaim).toBeDefined();
      expect(regClaim?.object).toBe('Acme Corporation');
      expect(regClaim?.subject).toContain('corp:Delaware:REG123456');

      // Check jurisdiction claim
      const jurisdictionClaim = claims.find(c => c.predicate === 'registeredInJurisdiction');
      expect(jurisdictionClaim?.object).toBe('Delaware');

      // Check incorporation date claim
      const incorpClaim = claims.find(c => c.predicate === 'incorporatedOn');
      expect(incorpClaim?.object).toBe('2020-01-15');
      expect(incorpClaim?.validFrom).toBe('2020-01-15');

      // Check status claim
      const statusClaim = claims.find(c => c.predicate === 'hasStatus');
      expect(statusClaim?.object).toBe('active');

      // Check officer claims
      const officerClaims = claims.filter(c => c.predicate === 'hasOfficer');
      expect(officerClaims.length).toBe(2);

      // Check address claim
      const addressClaim = claims.find(c => c.predicate === 'locatedAt');
      expect(addressClaim?.object).toBe('123 Main St, Wilmington, DE');
    });

    it('should generate subject ID from company name when no registration number', () => {
      const record: CorporateRecord = {
        companyName: 'Startup Inc',
        status: 'active',
      };

      const results: OSINTEnrichmentResult[] = [
        { source: 'corp-db', data: record, confidence: 0.7 },
      ];

      const claims = extractor.extract(results);
      const regClaim = claims.find(c => c.predicate === 'isRegisteredAs');

      expect(regClaim?.subject).toBe('corp:startup-inc');
    });
  });

  describe('Public Record Extraction', () => {
    it('should extract claims from a public record', () => {
      const record: PublicRecord = {
        source: 'court-records',
        recordType: 'court_filing',
        date: '2025-06-15',
        details: {
          caseNumber: 'CASE-2025-001',
          court: 'District Court',
          filingType: 'civil',
        },
      };

      const results: OSINTEnrichmentResult[] = [
        { source: 'public-records', data: record, confidence: 0.88 },
      ];

      const claims = extractor.extract(results);

      // Should have: hasRecordType + 3 detail claims
      expect(claims.length).toBe(4);

      // Check record type claim
      const typeClaim = claims.find(c => c.predicate === 'hasRecordType');
      expect(typeClaim).toBeDefined();
      expect(typeClaim?.object).toBe('court_filing');
      expect(typeClaim?.validFrom).toBe('2025-06-15');

      // Check detail claims
      const caseNumClaim = claims.find(c => c.predicate === 'detail:caseNumber');
      expect(caseNumClaim?.object).toBe('CASE-2025-001');

      const courtClaim = claims.find(c => c.predicate === 'detail:court');
      expect(courtClaim?.object).toBe('District Court');
    });

    it('should skip null/undefined detail values', () => {
      const record: PublicRecord = {
        source: 'records',
        recordType: 'property_deed',
        date: '2024-01-01',
        details: {
          value: 100000,
          nullField: null,
          undefinedField: undefined,
        },
      };

      const results: OSINTEnrichmentResult[] = [
        { source: 'property-db', data: record, confidence: 0.9 },
      ];

      const claims = extractor.extract(results);

      // Should only have: hasRecordType + detail:value
      expect(claims.length).toBe(2);
    });
  });

  describe('Multiple Source Extraction', () => {
    it('should extract claims from multiple sources', () => {
      const socialProfile: SocialMediaProfile = {
        platform: 'linkedin',
        username: 'johndoe',
        url: 'https://linkedin.com/in/johndoe',
      };

      const corpRecord: CorporateRecord = {
        companyName: 'John Doe Consulting',
        status: 'active',
      };

      const results: OSINTEnrichmentResult[] = [
        { source: 'linkedin', data: socialProfile, confidence: 0.8 },
        { source: 'corp-registry', data: corpRecord, confidence: 0.9 },
      ];

      const claims = extractor.extract(results);

      // Should have claims from both sources
      expect(claims.some(c => c.sourceId === 'linkedin')).toBe(true);
      expect(claims.some(c => c.sourceId === 'corp-registry')).toBe(true);
    });
  });

  describe('Claim Structure Validation', () => {
    it('should include all required claim fields', () => {
      const profile: SocialMediaProfile = {
        platform: 'twitter',
        username: 'testuser',
        url: 'https://twitter.com/testuser',
      };

      const results: OSINTEnrichmentResult[] = [
        { source: 'twitter', data: profile, confidence: 0.85 },
      ];

      const claims = extractor.extract(results);

      for (const claim of claims) {
        expect(claim.id).toBeDefined();
        expect(claim.id.startsWith('claim-')).toBe(true);
        expect(claim.sourceId).toBe('twitter');
        expect(claim.subject).toBeDefined();
        expect(claim.predicate).toBeDefined();
        expect(claim.object).toBeDefined();
        expect(claim.confidence).toBeGreaterThan(0);
        expect(claim.confidence).toBeLessThanOrEqual(1);
        expect(claim.timestamp).toBeDefined();
        expect(claim.verificationHistory).toEqual([]);
      }
    });
  });
});
