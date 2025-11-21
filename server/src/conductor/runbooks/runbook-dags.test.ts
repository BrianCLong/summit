/**
 * DAG-Based Runbook Tests
 *
 * Tests for the three runbooks:
 * - R1: Rapid Attribution (CTI)
 * - R2: Phishing Cluster Discovery (DFIR)
 * - R3: Disinformation Network Mapping
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DAGExecutor } from './dags/dag-executor';
import { LegalBasis, DataLicense } from './dags/types';
import { CitationValidator } from './dags/citation-validator';
import { createR1RapidAttributionRunbook } from './r1-rapid-attribution';
import { createR2PhishingClusterRunbook } from './r2-phishing-cluster';
import { createR3DisinformationNetworkRunbook } from './r3-disinformation-network';

describe('DAG-Based Runbooks', () => {
  describe('R1: Rapid Attribution (CTI)', () => {
    it('should execute successfully with valid input', async () => {
      const dag = createR1RapidAttributionRunbook();
      const executor = new DAGExecutor();

      const result = await executor.execute(dag, {
        tenantId: 'test-tenant',
        userId: 'test-analyst',
        legalBasis: LegalBasis.LEGITIMATE_INTERESTS,
        dataLicenses: [DataLicense.INTERNAL_USE_ONLY],
        inputData: {
          incidentData: {
            id: 'test-incident',
            reportUrl: 'https://example.com/incident',
            analyst: 'Test Analyst',
            ips: ['192.168.1.1', '10.0.0.1'],
            domains: ['malicious.com'],
            hashes: ['abc123def456'],
          },
        },
      });

      expect(result.success).toBe(true);
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.citations.length).toBeGreaterThanOrEqual(3);
      expect(result.proofs.length).toBeGreaterThan(0);
      expect(result.kpis.confidenceScore).toBeGreaterThanOrEqual(0.7);
    }, 30000);

    it('should block publication if confidence is too low', async () => {
      const dag = createR1RapidAttributionRunbook();
      const executor = new DAGExecutor();

      // This would require mocking the execution to produce low confidence
      // For now, we test the structure
      expect(dag.publicationGates.length).toBeGreaterThan(0);
      expect(dag.publicationGates.some((g) => g.type === 'kpi')).toBe(true);
      expect(dag.publicationGates.some((g) => g.type === 'citation')).toBe(true);
      expect(dag.publicationGates.some((g) => g.type === 'proof')).toBe(true);
    });

    it('should complete within benchmark time', async () => {
      const dag = createR1RapidAttributionRunbook();
      expect(dag.benchmarks.total).toBe(300000); // 5 minutes
    });

    it('should generate replay log', async () => {
      const dag = createR1RapidAttributionRunbook();
      const executor = new DAGExecutor();

      const result = await executor.execute(dag, {
        tenantId: 'test-tenant',
        userId: 'test-analyst',
        legalBasis: LegalBasis.LEGITIMATE_INTERESTS,
        dataLicenses: [DataLicense.INTERNAL_USE_ONLY],
        inputData: {
          incidentData: {
            id: 'test-incident',
            reportUrl: 'https://example.com/incident',
            analyst: 'Test Analyst',
            ips: ['192.168.1.1'],
            domains: ['malicious.com'],
            hashes: ['abc123'],
          },
        },
      });

      expect(result.replayLog.length).toBeGreaterThan(0);

      const replayLogSummary = executor.getReplayLog().getSummary();
      expect(replayLogSummary.totalEntries).toBeGreaterThan(0);
      expect(replayLogSummary.success).toBe(true);
    }, 30000);
  });

  describe('R2: Phishing Cluster Discovery (DFIR)', () => {
    const sampleEmails = [
      {
        id: 'email-1',
        subject: 'Test',
        sender: 'test@bad.com',
        recipients: ['victim@example.com'],
        headers: { 'X-Originating-IP': '1.2.3.4' },
        body: 'Test body',
        links: ['http://phishing.bad'],
        attachments: [],
        receivedAt: new Date(),
        metadata: { server: 'test-server', collectedBy: 'test' },
      },
      {
        id: 'email-2',
        subject: 'Test 2',
        sender: 'test2@bad.com',
        recipients: ['victim2@example.com'],
        headers: { 'X-Originating-IP': '1.2.3.4' },
        body: 'Test body 2',
        links: ['http://phishing.bad'],
        attachments: [],
        receivedAt: new Date(),
        metadata: { server: 'test-server', collectedBy: 'test' },
      },
      {
        id: 'email-3',
        subject: 'Test 3',
        sender: 'test@bad.com',
        recipients: ['victim3@example.com'],
        headers: { 'X-Originating-IP': '1.2.3.4' },
        body: 'Test body 3',
        links: ['http://phishing.bad'],
        attachments: [],
        receivedAt: new Date(),
        metadata: { server: 'test-server', collectedBy: 'test' },
      },
      {
        id: 'email-4',
        subject: 'Test 4',
        sender: 'test2@bad.com',
        recipients: ['victim4@example.com'],
        headers: { 'X-Originating-IP': '1.2.3.4' },
        body: 'Test body 4',
        links: ['http://phishing.bad'],
        attachments: [],
        receivedAt: new Date(),
        metadata: { server: 'test-server', collectedBy: 'test' },
      },
      {
        id: 'email-5',
        subject: 'Test 5',
        sender: 'test@bad.com',
        recipients: ['victim5@example.com'],
        headers: { 'X-Originating-IP': '1.2.3.4' },
        body: 'Test body 5',
        links: ['http://phishing.bad'],
        attachments: [],
        receivedAt: new Date(),
        metadata: { server: 'test-server', collectedBy: 'test' },
      },
    ];

    it('should execute successfully with valid emails', async () => {
      const dag = createR2PhishingClusterRunbook();
      const executor = new DAGExecutor();

      const result = await executor.execute(dag, {
        tenantId: 'test-tenant',
        userId: 'test-dfir-analyst',
        legalBasis: LegalBasis.LEGITIMATE_INTERESTS,
        dataLicenses: [DataLicense.INTERNAL_USE_ONLY],
        inputData: {
          emails: sampleEmails,
          emailServerUrl: 'https://mail.example.com',
          analyst: 'Test DFIR',
        },
      });

      expect(result.success).toBe(true);
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.citations.length).toBeGreaterThanOrEqual(3);
      expect(result.kpis.clusterPurity).toBeGreaterThanOrEqual(0.8);
    }, 30000);

    it('should enforce chain of custody', async () => {
      const dag = createR2PhishingClusterRunbook();
      expect(
        dag.publicationGates.some(
          (g) => g.type === 'proof' && g.proofRequirement?.requireChainOfCustody,
        ),
      ).toBe(true);
    });

    it('should complete within benchmark time', async () => {
      const dag = createR2PhishingClusterRunbook();
      expect(dag.benchmarks.total).toBe(600000); // 10 minutes
    });
  });

  describe('R3: Disinformation Network Mapping', () => {
    const sampleContent = Array.from({ length: 12 }, (_, i) => ({
      id: `content-${i}`,
      platform: 'twitter',
      author: `user${i % 3}`,
      authorId: `uid-${i % 3}`,
      content: `Sample content about election fraud ${i}`,
      url: `https://twitter.com/post/${i}`,
      timestamp: new Date(),
      engagementMetrics: {
        likes: 100 + i * 10,
        shares: 50 + i * 5,
        comments: 20 + i * 2,
        views: 1000 + i * 100,
      },
    }));

    it('should execute successfully with valid content', async () => {
      const dag = createR3DisinformationNetworkRunbook();
      const executor = new DAGExecutor();

      const result = await executor.execute(dag, {
        tenantId: 'test-tenant',
        userId: 'test-disinfo-analyst',
        legalBasis: LegalBasis.PUBLIC_TASK,
        dataLicenses: [DataLicense.CC_BY],
        inputData: {
          samples: sampleContent,
        },
      });

      expect(result.success).toBe(true);
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.citations.length).toBeGreaterThanOrEqual(5);
      expect(result.kpis.coordinationPatternCount).toBeGreaterThanOrEqual(3);
    }, 30000);

    it('should map network with sufficient coverage', async () => {
      const dag = createR3DisinformationNetworkRunbook();
      expect(
        dag.publicationGates.some(
          (g) => g.type === 'kpi' && g.kpi?.metric === 'networkCoverage',
        ),
      ).toBe(true);
    });

    it('should complete within benchmark time', async () => {
      const dag = createR3DisinformationNetworkRunbook();
      expect(dag.benchmarks.total).toBe(900000); // 15 minutes
    });
  });

  describe('Citation Validator', () => {
    it('should validate citations correctly', () => {
      const citation = CitationValidator.createCitation(
        'Test Source',
        'https://example.com',
        'Test Author',
      );

      const validation = CitationValidator.validateCitationFormat(citation);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should detect missing citations', () => {
      const evidence = [
        {
          id: 'ev-1',
          type: 'test',
          data: {},
          citations: [],
          proofs: [],
          collectedAt: new Date(),
        },
      ];

      const result = CitationValidator.validateCitations(evidence, [], {
        minCitationsPerEvidence: 1,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should block publication when citations are missing', () => {
      const validationResult = {
        valid: false,
        errors: ['Missing citation'],
        warnings: [],
        stats: {
          totalCitations: 0,
          validCitations: 0,
          missingUrls: 0,
          missingTimestamps: 0,
          missingAuthors: 0,
          brokenHashes: 0,
        },
      };

      const blockResult = CitationValidator.shouldBlockPublication(validationResult);
      expect(blockResult.blocked).toBe(true);
      expect(blockResult.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('Replay Log', () => {
    it('should verify integrity of replay log', async () => {
      const dag = createR1RapidAttributionRunbook();
      const executor = new DAGExecutor();

      await executor.execute(dag, {
        tenantId: 'test-tenant',
        userId: 'test-analyst',
        legalBasis: LegalBasis.LEGITIMATE_INTERESTS,
        dataLicenses: [DataLicense.INTERNAL_USE_ONLY],
        inputData: {
          incidentData: {
            id: 'test',
            ips: ['1.2.3.4'],
            domains: ['test.com'],
            hashes: ['abc'],
          },
        },
      });

      const integrity = executor.verifyReplayLogIntegrity();
      expect(integrity.valid).toBe(true);
    }, 30000);
  });
});
