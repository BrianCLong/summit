/**
 * R2: Phishing Cluster Discovery (DFIR)
 *
 * Runbook for discovering and analyzing clusters of related phishing campaigns using DFIR techniques.
 *
 * Workflow:
 * 1. Collect phishing emails and artifacts
 * 2. Extract forensic indicators (headers, links, attachments, metadata)
 * 3. Perform similarity analysis to cluster related campaigns
 * 4. Build attack timeline with chain of custody
 * 5. Generate DFIR report with evidence preservation
 *
 * Preconditions:
 * - Legal basis: Legitimate interests (incident response)
 * - Data license: Internal use only (forensic evidence)
 *
 * Postconditions:
 * - KPIs: Cluster purity >= 80%, at least 2 clusters identified
 * - Citations: All evidence sources cited with chain of custody
 * - Proofs: Chain of custody for all forensic artifacts
 *
 * Benchmark: 10 minutes end-to-end
 */

import { createHash } from 'crypto';
import {
  RunbookDAG,
  DAGNode,
  RunbookContext,
  NodeExecutionResult,
  Evidence,
  Citation,
  CryptographicProof,
  LegalBasis,
  DataLicense,
} from './dags/types';
import { GateFactory } from './dags/gates';
import { CitationValidator } from './dags/citation-validator';

/**
 * Phishing email artifact
 */
interface PhishingEmail {
  id: string;
  subject: string;
  sender: string;
  recipients: string[];
  headers: Record<string, string>;
  body: string;
  links: string[];
  attachments: Array<{
    filename: string;
    hash: string;
    mimeType: string;
  }>;
  receivedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Forensic indicators
 */
interface ForensicIndicators {
  emailId: string;
  senderDomain: string;
  senderIP?: string;
  subjectPattern: string;
  linkDomains: string[];
  attachmentHashes: string[];
  spfResult?: string;
  dkimResult?: string;
  dmarcResult?: string;
  headerSignature: string; // Hash of normalized headers
}

/**
 * Phishing cluster
 */
interface PhishingCluster {
  id: string;
  name: string;
  emails: string[]; // Email IDs
  commonFeatures: {
    senderDomains: string[];
    linkDomains: string[];
    subjectPatterns: string[];
    attachmentTypes: string[];
  };
  firstSeen: Date;
  lastSeen: Date;
  victimCount: number;
  confidence: number;
}

/**
 * Create R2: Phishing Cluster Discovery runbook
 */
export function createR2PhishingClusterRunbook(): RunbookDAG {
  const nodes: DAGNode[] = [
    // Node 1: Collect Phishing Artifacts
    {
      id: 'collect-artifacts',
      name: 'Collect Phishing Artifacts',
      description: 'Collect and preserve phishing emails and related artifacts',
      dependencies: [],
      preconditions: [
        GateFactory.legalBasisGate(
          [LegalBasis.LEGITIMATE_INTERESTS, LegalBasis.LEGAL_OBLIGATION],
          'DFIR requires legitimate incident response basis',
        ),
        GateFactory.dataLicenseGate(
          [DataLicense.INTERNAL_USE_ONLY],
          'Forensic evidence must be internal use only',
        ),
      ],
      postconditions: [
        GateFactory.kpiGate('emailCount', 5, 'gte', 'Must collect at least 5 emails for clustering'),
        GateFactory.proofGate(false, true, 'All artifacts must have chain of custody'),
      ],
      execute: async (context: RunbookContext): Promise<NodeExecutionResult> => {
        const startTime = Date.now();

        // Collect phishing emails from input
        const emails: PhishingEmail[] = context.input.emails || [];

        // Generate chain of custody for each email
        const proofs: CryptographicProof[] = [];
        const citations: Citation[] = [];

        for (const email of emails) {
          // Create hash for chain of custody
          const emailHash = createHash('sha256')
            .update(JSON.stringify(email))
            .digest('hex');

          proofs.push({
            algorithm: 'sha256',
            signature: emailHash,
            timestamp: new Date(),
            chainOfCustodyHash: emailHash,
          });

          // Cite source of email
          citations.push(
            CitationValidator.createCitation(
              `Email Server: ${email.metadata?.server || 'Unknown'}`,
              email.metadata?.archiveUrl,
              email.metadata?.collectedBy,
              {
                emailId: email.id,
                receivedAt: email.receivedAt.toISOString(),
              },
            ),
          );
        }

        context.state.set('emails', emails);

        const evidence: Evidence = {
          id: `evidence-phishing-emails-${Date.now()}`,
          type: 'phishing_artifacts',
          data: { emails },
          citations,
          proofs,
          collectedAt: new Date(),
          metadata: {
            emailCount: emails.length,
            qualityScore: 0.95,
          },
        };

        return {
          success: true,
          evidence: [evidence],
          citations,
          proofs,
          kpis: {
            emailCount: emails.length,
          },
          duration: Date.now() - startTime,
        };
      },
      estimatedDuration: 60000, // 60 seconds
    },

    // Node 2: Extract Forensic Indicators
    {
      id: 'extract-indicators',
      name: 'Extract Forensic Indicators',
      description: 'Extract and normalize forensic indicators from emails',
      dependencies: ['collect-artifacts'],
      preconditions: [],
      postconditions: [
        GateFactory.citationGate(1, false, true, 'All extracted indicators must be timestamped'),
      ],
      execute: async (context: RunbookContext): Promise<NodeExecutionResult> => {
        const startTime = Date.now();
        const emails = context.state.get('emails') as PhishingEmail[];

        // Extract forensic indicators
        const indicators: ForensicIndicators[] = emails.map((email) => {
          // Extract sender domain
          const senderDomain = email.sender.split('@')[1] || '';

          // Extract link domains
          const linkDomains = email.links
            .map((link) => {
              try {
                return new URL(link).hostname;
              } catch {
                return null;
              }
            })
            .filter((d): d is string => d !== null);

          // Extract attachment hashes
          const attachmentHashes = email.attachments.map((att) => att.hash);

          // Create header signature
          const normalizedHeaders = Object.entries(email.headers)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}:${v}`)
            .join('|');
          const headerSignature = createHash('sha256')
            .update(normalizedHeaders)
            .digest('hex');

          return {
            emailId: email.id,
            senderDomain,
            senderIP: email.headers['X-Originating-IP'],
            subjectPattern: email.subject.replace(/[0-9]+/g, 'N'), // Normalize numbers
            linkDomains,
            attachmentHashes,
            spfResult: email.headers['Authentication-Results']?.includes('spf=pass')
              ? 'pass'
              : 'fail',
            dkimResult: email.headers['Authentication-Results']?.includes('dkim=pass')
              ? 'pass'
              : 'fail',
            dmarcResult: email.headers['Authentication-Results']?.includes('dmarc=pass')
              ? 'pass'
              : 'fail',
            headerSignature,
          };
        });

        context.state.set('indicators', indicators);

        const citations: Citation[] = [
          CitationValidator.createCitation(
            'DMARC/SPF/DKIM Specification',
            'https://datatracker.ietf.org/doc/html/rfc7489',
            'IETF',
          ),
        ];

        const evidence: Evidence = {
          id: `evidence-forensic-indicators-${Date.now()}`,
          type: 'forensic_indicators',
          data: { indicators },
          citations,
          proofs: [],
          collectedAt: new Date(),
          metadata: {
            indicatorCount: indicators.length,
            qualityScore: 0.9,
          },
        };

        return {
          success: true,
          evidence: [evidence],
          citations,
          proofs: [],
          kpis: {
            indicatorCount: indicators.length,
          },
          duration: Date.now() - startTime,
        };
      },
      estimatedDuration: 90000, // 90 seconds
    },

    // Node 3: Cluster Analysis
    {
      id: 'cluster-analysis',
      name: 'Cluster Analysis',
      description: 'Perform similarity analysis to identify phishing campaign clusters',
      dependencies: ['extract-indicators'],
      preconditions: [],
      postconditions: [
        GateFactory.kpiGate('clusterCount', 2, 'gte', 'Must identify at least 2 clusters'),
        GateFactory.kpiGate('clusterPurity', 0.8, 'gte', 'Cluster purity must be >= 80%'),
      ],
      execute: async (context: RunbookContext): Promise<NodeExecutionResult> => {
        const startTime = Date.now();
        const emails = context.state.get('emails') as PhishingEmail[];
        const indicators = context.state.get('indicators') as ForensicIndicators[];

        // Simple clustering algorithm (in reality, use more sophisticated methods)
        const clusters: PhishingCluster[] = [];

        // Group by sender domain first
        const domainGroups = new Map<string, ForensicIndicators[]>();
        for (const ind of indicators) {
          const existing = domainGroups.get(ind.senderDomain) || [];
          existing.push(ind);
          domainGroups.set(ind.senderDomain, existing);
        }

        // Create clusters
        let clusterIdx = 0;
        for (const [domain, inds] of domainGroups.entries()) {
          if (inds.length < 2) continue; // Skip singleton clusters

          const emailsInCluster = emails.filter((e) =>
            inds.some((ind) => ind.emailId === e.id),
          );

          // Calculate common features
          const allLinkDomains = inds.flatMap((ind) => ind.linkDomains);
          const uniqueLinkDomains = [...new Set(allLinkDomains)];

          const allSubjectPatterns = inds.map((ind) => ind.subjectPattern);
          const uniqueSubjectPatterns = [...new Set(allSubjectPatterns)];

          const allAttachmentHashes = inds.flatMap((ind) => ind.attachmentHashes);

          const firstSeen = new Date(
            Math.min(...emailsInCluster.map((e) => e.receivedAt.getTime())),
          );
          const lastSeen = new Date(
            Math.max(...emailsInCluster.map((e) => e.receivedAt.getTime())),
          );

          clusters.push({
            id: `cluster-${clusterIdx++}`,
            name: `Phishing Campaign - ${domain}`,
            emails: inds.map((ind) => ind.emailId),
            commonFeatures: {
              senderDomains: [domain],
              linkDomains: uniqueLinkDomains,
              subjectPatterns: uniqueSubjectPatterns,
              attachmentTypes: [
                ...new Set(
                  emailsInCluster.flatMap((e) => e.attachments.map((a) => a.mimeType)),
                ),
              ],
            },
            firstSeen,
            lastSeen,
            victimCount: new Set(emailsInCluster.flatMap((e) => e.recipients)).size,
            confidence: inds.length >= 5 ? 0.9 : 0.7, // Higher confidence with more samples
          });
        }

        context.state.set('clusters', clusters);

        // Calculate cluster purity (simplified)
        const clusterPurity =
          clusters.length > 0
            ? clusters.reduce((sum, c) => sum + c.confidence, 0) / clusters.length
            : 0;

        const citations: Citation[] = [
          CitationValidator.createCitation(
            'Clustering Analysis Methodology',
            'https://en.wikipedia.org/wiki/Cluster_analysis',
            'Internal Security Team',
          ),
        ];

        const evidence: Evidence = {
          id: `evidence-clusters-${Date.now()}`,
          type: 'phishing_clusters',
          data: { clusters },
          citations,
          proofs: [],
          collectedAt: new Date(),
          metadata: {
            clusterCount: clusters.length,
            clusterPurity,
            qualityScore: clusterPurity,
          },
        };

        return {
          success: true,
          evidence: [evidence],
          citations,
          proofs: [],
          kpis: {
            clusterCount: clusters.length,
            clusterPurity,
          },
          duration: Date.now() - startTime,
        };
      },
      estimatedDuration: 120000, // 120 seconds
    },

    // Node 4: Build Attack Timeline
    {
      id: 'build-timeline',
      name: 'Build Attack Timeline',
      description: 'Construct chronological timeline of phishing campaign activities',
      dependencies: ['cluster-analysis'],
      preconditions: [],
      postconditions: [
        GateFactory.citationGate(2, true, true, 'Timeline must cite all evidence sources'),
      ],
      execute: async (context: RunbookContext): Promise<NodeExecutionResult> => {
        const startTime = Date.now();
        const emails = context.state.get('emails') as PhishingEmail[];
        const clusters = context.state.get('clusters') as PhishingCluster[];

        // Build timeline
        const timeline = clusters.map((cluster) => {
          const clusterEmails = emails.filter((e) => cluster.emails.includes(e.id));

          return {
            clusterId: cluster.id,
            clusterName: cluster.name,
            events: clusterEmails
              .map((email) => ({
                timestamp: email.receivedAt,
                type: 'email_received',
                emailId: email.id,
                subject: email.subject,
                recipients: email.recipients.length,
              }))
              .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
            firstActivity: cluster.firstSeen,
            lastActivity: cluster.lastSeen,
            duration: cluster.lastSeen.getTime() - cluster.firstSeen.getTime(),
            victimCount: cluster.victimCount,
          };
        });

        context.state.set('timeline', timeline);

        const citations: Citation[] = [
          CitationValidator.createCitation(
            'Email Logs',
            context.input.emailServerUrl,
            context.input.analyst,
          ),
          CitationValidator.createCitation(
            'DFIR Timeline Analysis Best Practices',
            'https://www.sans.org/white-papers/timeline-analysis/',
            'SANS Institute',
          ),
        ];

        const evidence: Evidence = {
          id: `evidence-timeline-${Date.now()}`,
          type: 'attack_timeline',
          data: { timeline },
          citations,
          proofs: [],
          collectedAt: new Date(),
          metadata: {
            timelineCount: timeline.length,
            qualityScore: 0.88,
          },
        };

        return {
          success: true,
          evidence: [evidence],
          citations,
          proofs: [],
          kpis: {
            timelineCount: timeline.length,
          },
          duration: Date.now() - startTime,
        };
      },
      estimatedDuration: 60000, // 60 seconds
    },

    // Node 5: Generate DFIR Report
    {
      id: 'generate-dfir-report',
      name: 'Generate DFIR Report',
      description: 'Generate comprehensive DFIR report with evidence preservation',
      dependencies: ['build-timeline'],
      preconditions: [],
      postconditions: [
        GateFactory.citationGate(
          3,
          true,
          true,
          'DFIR report must cite at least 3 evidence sources',
        ),
        GateFactory.proofGate(true, true, 'DFIR report must include chain of custody'),
      ],
      execute: async (context: RunbookContext): Promise<NodeExecutionResult> => {
        const startTime = Date.now();
        const clusters = context.state.get('clusters') as PhishingCluster[];
        const timeline = context.state.get('timeline') as any[];

        // Generate DFIR report
        const report = {
          title: 'Phishing Cluster Discovery Analysis',
          executionId: context.executionId,
          analyst: context.userId,
          generatedAt: new Date(),
          summary: {
            totalClusters: clusters.length,
            totalEmails: context.state.get('emails').length,
            analysisTimeframe: {
              start: Math.min(...clusters.map((c) => c.firstSeen.getTime())),
              end: Math.max(...clusters.map((c) => c.lastSeen.getTime())),
            },
            totalVictims: clusters.reduce((sum, c) => sum + c.victimCount, 0),
          },
          clusters,
          timeline,
          recommendations: [
            'Block identified sender domains',
            'Quarantine emails matching cluster patterns',
            'Alert affected users',
            'Report malicious infrastructure to authorities',
          ],
        };

        context.state.set('dfirReport', report);

        // Generate chain of custody proof
        const reportHash = createHash('sha256').update(JSON.stringify(report)).digest('hex');

        const chainOfCustodyProof: CryptographicProof = {
          algorithm: 'sha256',
          signature: reportHash,
          timestamp: new Date(),
          chainOfCustodyHash: reportHash,
        };

        // Collect all citations
        const allCitations = context.citations;

        const evidence: Evidence = {
          id: `evidence-dfir-report-${Date.now()}`,
          type: 'dfir_report',
          data: report,
          citations: allCitations,
          proofs: [chainOfCustodyProof],
          collectedAt: new Date(),
          metadata: {
            clusterCount: clusters.length,
            qualityScore: 0.92,
          },
        };

        return {
          success: true,
          evidence: [evidence],
          citations: allCitations,
          proofs: [chainOfCustodyProof],
          kpis: {
            reportGenerated: 1,
          },
          duration: Date.now() - startTime,
        };
      },
      estimatedDuration: 30000, // 30 seconds
    },
  ];

  return {
    id: 'r2-phishing-cluster',
    name: 'R2: Phishing Cluster Discovery (DFIR)',
    description: 'Discover and analyze clusters of related phishing campaigns',
    version: '1.0.0',
    nodes,
    benchmarks: {
      total: 600000, // 10 minutes
      perNode: {
        'collect-artifacts': 60000,
        'extract-indicators': 90000,
        'cluster-analysis': 120000,
        'build-timeline': 60000,
        'generate-dfir-report': 30000,
      },
    },
    publicationGates: [
      GateFactory.citationGate(
        3,
        true,
        true,
        'Publication requires at least 3 cited evidence sources',
      ),
      GateFactory.kpiGate('clusterPurity', 0.8, 'gte', 'Publication requires cluster purity >= 80%'),
      GateFactory.proofGate(true, true, 'Publication requires complete chain of custody'),
    ],
    metadata: {
      category: 'DFIR',
      sensitivity: 'high',
      retentionYears: 7,
    },
  };
}
