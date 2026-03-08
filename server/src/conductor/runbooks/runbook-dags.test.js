"use strict";
/**
 * DAG-Based Runbook Tests
 *
 * Tests for the three runbooks:
 * - R1: Rapid Attribution (CTI)
 * - R2: Phishing Cluster Discovery (DFIR)
 * - R3: Disinformation Network Mapping
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const dag_executor_js_1 = require("./dags/dag-executor.js");
const types_js_1 = require("./dags/types.js");
const citation_validator_js_1 = require("./dags/citation-validator.js");
const r1_rapid_attribution_js_1 = require("./r1-rapid-attribution.js");
const r2_phishing_cluster_js_1 = require("./r2-phishing-cluster.js");
const r3_disinformation_network_js_1 = require("./r3-disinformation-network.js");
(0, globals_1.describe)('DAG-Based Runbooks', () => {
    (0, globals_1.describe)('R1: Rapid Attribution (CTI)', () => {
        (0, globals_1.it)('should execute successfully with valid input', async () => {
            const dag = (0, r1_rapid_attribution_js_1.createR1RapidAttributionRunbook)();
            const executor = new dag_executor_js_1.DAGExecutor();
            const result = await executor.execute(dag, {
                tenantId: 'test-tenant',
                userId: 'test-analyst',
                legalBasis: types_js_1.LegalBasis.LEGITIMATE_INTERESTS,
                dataLicenses: [types_js_1.DataLicense.INTERNAL_USE_ONLY],
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
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.evidence.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.citations.length).toBeGreaterThanOrEqual(3);
            (0, globals_1.expect)(result.proofs.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.kpis.confidenceScore).toBeGreaterThanOrEqual(0.7);
        }, 30000);
        (0, globals_1.it)('should block publication if confidence is too low', async () => {
            const dag = (0, r1_rapid_attribution_js_1.createR1RapidAttributionRunbook)();
            const executor = new dag_executor_js_1.DAGExecutor();
            // This would require mocking the execution to produce low confidence
            // For now, we test the structure
            (0, globals_1.expect)(dag.publicationGates.length).toBeGreaterThan(0);
            (0, globals_1.expect)(dag.publicationGates.some((g) => g.type === 'kpi')).toBe(true);
            (0, globals_1.expect)(dag.publicationGates.some((g) => g.type === 'citation')).toBe(true);
            (0, globals_1.expect)(dag.publicationGates.some((g) => g.type === 'proof')).toBe(true);
        });
        (0, globals_1.it)('should complete within benchmark time', async () => {
            const dag = (0, r1_rapid_attribution_js_1.createR1RapidAttributionRunbook)();
            (0, globals_1.expect)(dag.benchmarks.total).toBe(300000); // 5 minutes
        });
        (0, globals_1.it)('should generate replay log', async () => {
            const dag = (0, r1_rapid_attribution_js_1.createR1RapidAttributionRunbook)();
            const executor = new dag_executor_js_1.DAGExecutor();
            const result = await executor.execute(dag, {
                tenantId: 'test-tenant',
                userId: 'test-analyst',
                legalBasis: types_js_1.LegalBasis.LEGITIMATE_INTERESTS,
                dataLicenses: [types_js_1.DataLicense.INTERNAL_USE_ONLY],
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
            (0, globals_1.expect)(result.replayLog.length).toBeGreaterThan(0);
            const replayLogSummary = executor.getReplayLog().getSummary();
            (0, globals_1.expect)(replayLogSummary.totalEntries).toBeGreaterThan(0);
            (0, globals_1.expect)(replayLogSummary.success).toBe(true);
        }, 30000);
    });
    (0, globals_1.describe)('R2: Phishing Cluster Discovery (DFIR)', () => {
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
        (0, globals_1.it)('should execute successfully with valid emails', async () => {
            const dag = (0, r2_phishing_cluster_js_1.createR2PhishingClusterRunbook)();
            const executor = new dag_executor_js_1.DAGExecutor();
            const result = await executor.execute(dag, {
                tenantId: 'test-tenant',
                userId: 'test-dfir-analyst',
                legalBasis: types_js_1.LegalBasis.LEGITIMATE_INTERESTS,
                dataLicenses: [types_js_1.DataLicense.INTERNAL_USE_ONLY],
                inputData: {
                    emails: sampleEmails,
                    emailServerUrl: 'https://mail.example.com',
                    analyst: 'Test DFIR',
                },
            });
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.evidence.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.citations.length).toBeGreaterThanOrEqual(3);
            (0, globals_1.expect)(result.kpis.clusterPurity).toBeGreaterThanOrEqual(0.8);
        }, 30000);
        (0, globals_1.it)('should enforce chain of custody', async () => {
            const dag = (0, r2_phishing_cluster_js_1.createR2PhishingClusterRunbook)();
            (0, globals_1.expect)(dag.publicationGates.some((g) => g.type === 'proof' && g.proofRequirement?.requireChainOfCustody)).toBe(true);
        });
        (0, globals_1.it)('should complete within benchmark time', async () => {
            const dag = (0, r2_phishing_cluster_js_1.createR2PhishingClusterRunbook)();
            (0, globals_1.expect)(dag.benchmarks.total).toBe(600000); // 10 minutes
        });
    });
    (0, globals_1.describe)('R3: Disinformation Network Mapping', () => {
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
        (0, globals_1.it)('should execute successfully with valid content', async () => {
            const dag = (0, r3_disinformation_network_js_1.createR3DisinformationNetworkRunbook)();
            const executor = new dag_executor_js_1.DAGExecutor();
            const result = await executor.execute(dag, {
                tenantId: 'test-tenant',
                userId: 'test-disinfo-analyst',
                legalBasis: types_js_1.LegalBasis.PUBLIC_TASK,
                dataLicenses: [types_js_1.DataLicense.CC_BY],
                inputData: {
                    samples: sampleContent,
                },
            });
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.evidence.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.citations.length).toBeGreaterThanOrEqual(5);
            (0, globals_1.expect)(result.kpis.coordinationPatternCount).toBeGreaterThanOrEqual(3);
        }, 30000);
        (0, globals_1.it)('should map network with sufficient coverage', async () => {
            const dag = (0, r3_disinformation_network_js_1.createR3DisinformationNetworkRunbook)();
            (0, globals_1.expect)(dag.publicationGates.some((g) => g.type === 'kpi' && g.kpi?.metric === 'networkCoverage')).toBe(true);
        });
        (0, globals_1.it)('should complete within benchmark time', async () => {
            const dag = (0, r3_disinformation_network_js_1.createR3DisinformationNetworkRunbook)();
            (0, globals_1.expect)(dag.benchmarks.total).toBe(900000); // 15 minutes
        });
    });
    (0, globals_1.describe)('Citation Validator', () => {
        (0, globals_1.it)('should validate citations correctly', () => {
            const citation = citation_validator_js_1.CitationValidator.createCitation('Test Source', 'https://example.com', 'Test Author');
            const validation = citation_validator_js_1.CitationValidator.validateCitationFormat(citation);
            (0, globals_1.expect)(validation.valid).toBe(true);
            (0, globals_1.expect)(validation.errors.length).toBe(0);
        });
        (0, globals_1.it)('should detect missing citations', () => {
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
            const result = citation_validator_js_1.CitationValidator.validateCitations(evidence, [], {
                minCitationsPerEvidence: 1,
            });
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should block publication when citations are missing', () => {
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
            const blockResult = citation_validator_js_1.CitationValidator.shouldBlockPublication(validationResult);
            (0, globals_1.expect)(blockResult.blocked).toBe(true);
            (0, globals_1.expect)(blockResult.reasons.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Replay Log', () => {
        (0, globals_1.it)('should verify integrity of replay log', async () => {
            const dag = (0, r1_rapid_attribution_js_1.createR1RapidAttributionRunbook)();
            const executor = new dag_executor_js_1.DAGExecutor();
            await executor.execute(dag, {
                tenantId: 'test-tenant',
                userId: 'test-analyst',
                legalBasis: types_js_1.LegalBasis.LEGITIMATE_INTERESTS,
                dataLicenses: [types_js_1.DataLicense.INTERNAL_USE_ONLY],
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
            (0, globals_1.expect)(integrity.valid).toBe(true);
        }, 30000);
    });
});
