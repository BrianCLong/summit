"use strict";
/**
 * ClaimExtractor Service - Test Suite
 * Tests for Automation Turn #5: Claim-Centric Validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ClaimExtractor_js_1 = require("../ClaimExtractor.js");
(0, globals_1.describe)('ClaimExtractor', () => {
    let extractor;
    (0, globals_1.beforeEach)(() => {
        extractor = new ClaimExtractor_js_1.ClaimExtractor();
    });
    (0, globals_1.describe)('extract()', () => {
        (0, globals_1.it)('should return empty array for empty input', () => {
            const claims = extractor.extract([]);
            (0, globals_1.expect)(claims).toEqual([]);
        });
        (0, globals_1.it)('should skip results with null data', () => {
            const results = [
                { source: 'test-source', data: null, confidence: 0.8 },
            ];
            const claims = extractor.extract(results);
            (0, globals_1.expect)(claims).toEqual([]);
        });
    });
    (0, globals_1.describe)('Social Media Profile Extraction', () => {
        (0, globals_1.it)('should extract claims from a social media profile', () => {
            const profile = {
                platform: 'twitter',
                username: 'testuser',
                url: 'https://twitter.com/testuser',
                displayName: 'Test User',
                bio: 'Software Engineer',
                followersCount: 1000,
                lastActive: '2026-01-01T00:00:00Z',
            };
            const results = [
                { source: 'social-connector', data: profile, confidence: 0.85 },
            ];
            const claims = extractor.extract(results);
            (0, globals_1.expect)(claims.length).toBeGreaterThanOrEqual(5);
            // Check for hasAccount claim
            const accountClaim = claims.find(c => c.predicate === 'hasAccount');
            (0, globals_1.expect)(accountClaim).toBeDefined();
            (0, globals_1.expect)(accountClaim?.subject).toBe('twitter:testuser');
            (0, globals_1.expect)(accountClaim?.confidence).toBe(0.85);
            (0, globals_1.expect)(accountClaim?.object).toEqual({ platform: 'twitter', url: 'https://twitter.com/testuser' });
            // Check for hasDisplayName claim
            const displayNameClaim = claims.find(c => c.predicate === 'hasDisplayName');
            (0, globals_1.expect)(displayNameClaim).toBeDefined();
            (0, globals_1.expect)(displayNameClaim?.object).toBe('Test User');
            // Check for hasBio claim
            const bioClaim = claims.find(c => c.predicate === 'hasBio');
            (0, globals_1.expect)(bioClaim).toBeDefined();
            (0, globals_1.expect)(bioClaim?.object).toBe('Software Engineer');
            // Check for hasFollowerCount claim with temporal bounds
            const followerClaim = claims.find(c => c.predicate === 'hasFollowerCount');
            (0, globals_1.expect)(followerClaim).toBeDefined();
            (0, globals_1.expect)(followerClaim?.object).toBe(1000);
            (0, globals_1.expect)(followerClaim?.validFrom).toBeDefined();
            (0, globals_1.expect)(followerClaim?.validTo).toBeDefined();
            // Check for lastActiveAt claim
            const lastActiveClaim = claims.find(c => c.predicate === 'lastActiveAt');
            (0, globals_1.expect)(lastActiveClaim).toBeDefined();
            (0, globals_1.expect)(lastActiveClaim?.object).toBe('2026-01-01T00:00:00Z');
        });
        (0, globals_1.it)('should generate unique claim IDs based on content hash', () => {
            const profile = {
                platform: 'github',
                username: 'devuser',
                url: 'https://github.com/devuser',
            };
            const results = [
                { source: 'github-connector', data: profile, confidence: 0.9 },
            ];
            const claims = extractor.extract(results);
            // All claims should have unique IDs starting with 'claim-'
            const ids = claims.map(c => c.id);
            (0, globals_1.expect)(ids.every(id => id.startsWith('claim-'))).toBe(true);
            (0, globals_1.expect)(new Set(ids).size).toBe(ids.length);
        });
    });
    (0, globals_1.describe)('Corporate Record Extraction', () => {
        (0, globals_1.it)('should extract claims from a corporate record', () => {
            const record = {
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
            const results = [
                { source: 'corp-registry', data: record, confidence: 0.95 },
            ];
            const claims = extractor.extract(results);
            // Should have claims for: isRegisteredAs, registeredInJurisdiction, incorporatedOn,
            // hasStatus, 2x hasOfficer, locatedAt
            (0, globals_1.expect)(claims.length).toBeGreaterThanOrEqual(7);
            // Check company registration claim
            const regClaim = claims.find(c => c.predicate === 'isRegisteredAs');
            (0, globals_1.expect)(regClaim).toBeDefined();
            (0, globals_1.expect)(regClaim?.object).toBe('Acme Corporation');
            (0, globals_1.expect)(regClaim?.subject).toContain('corp:Delaware:REG123456');
            // Check jurisdiction claim
            const jurisdictionClaim = claims.find(c => c.predicate === 'registeredInJurisdiction');
            (0, globals_1.expect)(jurisdictionClaim?.object).toBe('Delaware');
            // Check incorporation date claim
            const incorpClaim = claims.find(c => c.predicate === 'incorporatedOn');
            (0, globals_1.expect)(incorpClaim?.object).toBe('2020-01-15');
            (0, globals_1.expect)(incorpClaim?.validFrom).toBe('2020-01-15');
            // Check status claim
            const statusClaim = claims.find(c => c.predicate === 'hasStatus');
            (0, globals_1.expect)(statusClaim?.object).toBe('active');
            // Check officer claims
            const officerClaims = claims.filter(c => c.predicate === 'hasOfficer');
            (0, globals_1.expect)(officerClaims.length).toBe(2);
            // Check address claim
            const addressClaim = claims.find(c => c.predicate === 'locatedAt');
            (0, globals_1.expect)(addressClaim?.object).toBe('123 Main St, Wilmington, DE');
        });
        (0, globals_1.it)('should generate subject ID from company name when no registration number', () => {
            const record = {
                companyName: 'Startup Inc',
                status: 'active',
            };
            const results = [
                { source: 'corp-db', data: record, confidence: 0.7 },
            ];
            const claims = extractor.extract(results);
            const regClaim = claims.find(c => c.predicate === 'isRegisteredAs');
            (0, globals_1.expect)(regClaim?.subject).toBe('corp:startup-inc');
        });
    });
    (0, globals_1.describe)('Public Record Extraction', () => {
        (0, globals_1.it)('should extract claims from a public record', () => {
            const record = {
                source: 'court-records',
                recordType: 'court_filing',
                date: '2025-06-15',
                details: {
                    caseNumber: 'CASE-2025-001',
                    court: 'District Court',
                    filingType: 'civil',
                },
            };
            const results = [
                { source: 'public-records', data: record, confidence: 0.88 },
            ];
            const claims = extractor.extract(results);
            // Should have: hasRecordType + 3 detail claims
            (0, globals_1.expect)(claims.length).toBe(4);
            // Check record type claim
            const typeClaim = claims.find(c => c.predicate === 'hasRecordType');
            (0, globals_1.expect)(typeClaim).toBeDefined();
            (0, globals_1.expect)(typeClaim?.object).toBe('court_filing');
            (0, globals_1.expect)(typeClaim?.validFrom).toBe('2025-06-15');
            // Check detail claims
            const caseNumClaim = claims.find(c => c.predicate === 'detail:caseNumber');
            (0, globals_1.expect)(caseNumClaim?.object).toBe('CASE-2025-001');
            const courtClaim = claims.find(c => c.predicate === 'detail:court');
            (0, globals_1.expect)(courtClaim?.object).toBe('District Court');
        });
        (0, globals_1.it)('should skip null/undefined detail values', () => {
            const record = {
                source: 'records',
                recordType: 'property_deed',
                date: '2024-01-01',
                details: {
                    value: 100000,
                    nullField: null,
                    undefinedField: undefined,
                },
            };
            const results = [
                { source: 'property-db', data: record, confidence: 0.9 },
            ];
            const claims = extractor.extract(results);
            // Should only have: hasRecordType + detail:value
            (0, globals_1.expect)(claims.length).toBe(2);
        });
    });
    (0, globals_1.describe)('Multiple Source Extraction', () => {
        (0, globals_1.it)('should extract claims from multiple sources', () => {
            const socialProfile = {
                platform: 'linkedin',
                username: 'johndoe',
                url: 'https://linkedin.com/in/johndoe',
            };
            const corpRecord = {
                companyName: 'John Doe Consulting',
                status: 'active',
            };
            const results = [
                { source: 'linkedin', data: socialProfile, confidence: 0.8 },
                { source: 'corp-registry', data: corpRecord, confidence: 0.9 },
            ];
            const claims = extractor.extract(results);
            // Should have claims from both sources
            (0, globals_1.expect)(claims.some(c => c.sourceId === 'linkedin')).toBe(true);
            (0, globals_1.expect)(claims.some(c => c.sourceId === 'corp-registry')).toBe(true);
        });
    });
    (0, globals_1.describe)('Claim Structure Validation', () => {
        (0, globals_1.it)('should include all required claim fields', () => {
            const profile = {
                platform: 'twitter',
                username: 'testuser',
                url: 'https://twitter.com/testuser',
            };
            const results = [
                { source: 'twitter', data: profile, confidence: 0.85 },
            ];
            const claims = extractor.extract(results);
            for (const claim of claims) {
                (0, globals_1.expect)(claim.id).toBeDefined();
                (0, globals_1.expect)(claim.id.startsWith('claim-')).toBe(true);
                (0, globals_1.expect)(claim.sourceId).toBe('twitter');
                (0, globals_1.expect)(claim.subject).toBeDefined();
                (0, globals_1.expect)(claim.predicate).toBeDefined();
                (0, globals_1.expect)(claim.object).toBeDefined();
                (0, globals_1.expect)(claim.confidence).toBeGreaterThan(0);
                (0, globals_1.expect)(claim.confidence).toBeLessThanOrEqual(1);
                (0, globals_1.expect)(claim.timestamp).toBeDefined();
                (0, globals_1.expect)(claim.verificationHistory).toEqual([]);
            }
        });
    });
});
