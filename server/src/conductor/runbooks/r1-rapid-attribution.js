"use strict";
/**
 * R1: Rapid Attribution (CTI)
 *
 * Runbook for rapidly attributing cyber attacks to threat actors using Cyber Threat Intelligence.
 *
 * Workflow:
 * 1. Collect threat indicators (IPs, domains, hashes, TTPs)
 * 2. Query threat intelligence feeds
 * 3. Correlate with known threat actor profiles
 * 4. Attribute to threat actor groups with confidence scores
 * 5. Generate attribution report with citations
 *
 * Preconditions:
 * - Legal basis: Legitimate interests (cybersecurity)
 * - Data license: Internal use only or compatible threat intelligence license
 *
 * Postconditions:
 * - KPIs: Confidence score >= 70%, at least 3 corroborating sources
 * - Citations: All threat intelligence sources cited with timestamps
 * - Proofs: Cryptographic proof of analysis chain
 *
 * Benchmark: 5 minutes end-to-end
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createR1RapidAttributionRunbook = createR1RapidAttributionRunbook;
const crypto_1 = require("crypto");
const types_js_1 = require("./dags/types.js");
const gates_js_1 = require("./dags/gates.js");
const citation_validator_js_1 = require("./dags/citation-validator.js");
/**
 * Create R1: Rapid Attribution runbook
 */
function createR1RapidAttributionRunbook() {
    const nodes = [
        // Node 1: Collect Threat Indicators
        {
            id: 'collect-indicators',
            name: 'Collect Threat Indicators',
            description: 'Extract and normalize threat indicators from incident data',
            dependencies: [],
            preconditions: [
                gates_js_1.GateFactory.legalBasisGate([types_js_1.LegalBasis.LEGITIMATE_INTERESTS, types_js_1.LegalBasis.PUBLIC_TASK], 'CTI requires legitimate cybersecurity interests'),
                gates_js_1.GateFactory.dataLicenseGate([types_js_1.DataLicense.INTERNAL_USE_ONLY, types_js_1.DataLicense.PROPRIETARY], 'Threat data must be licensed for security analysis'),
            ],
            postconditions: [
                gates_js_1.GateFactory.kpiGate('indicatorCount', 1, 'gte', 'Must collect at least 1 indicator'),
            ],
            execute: async (context) => {
                const startTime = Date.now();
                // Extract indicators from input
                const incidentData = context.input.incidentData || {};
                const indicators = [];
                // Simulate indicator extraction
                if (incidentData.ips) {
                    indicators.push(...incidentData.ips.map((ip) => ({
                        type: 'ip',
                        value: ip,
                        context: 'C2 communication',
                    })));
                }
                if (incidentData.domains) {
                    indicators.push(...incidentData.domains.map((domain) => ({
                        type: 'domain',
                        value: domain,
                        context: 'Malicious infrastructure',
                    })));
                }
                if (incidentData.hashes) {
                    indicators.push(...incidentData.hashes.map((hash) => ({
                        type: 'hash',
                        value: hash,
                        context: 'Malware sample',
                    })));
                }
                // Store indicators in context
                context.state.set('indicators', indicators);
                // Create evidence
                const evidence = {
                    id: `evidence-indicators-${Date.now()}`,
                    type: 'threat_indicators',
                    data: { indicators },
                    citations: [
                        citation_validator_js_1.CitationValidator.createCitation('Incident Report', incidentData.reportUrl, incidentData.analyst, { incidentId: incidentData.id }),
                    ],
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
                    citations: evidence.citations,
                    proofs: [],
                    kpis: {
                        indicatorCount: indicators.length,
                    },
                    duration: Date.now() - startTime,
                };
            },
            estimatedDuration: 30000, // 30 seconds
        },
        // Node 2: Query Threat Intelligence Feeds
        {
            id: 'query-ti-feeds',
            name: 'Query Threat Intelligence Feeds',
            description: 'Query multiple threat intelligence sources for indicator enrichment',
            dependencies: ['collect-indicators'],
            preconditions: [],
            postconditions: [
                gates_js_1.GateFactory.kpiGate('tiSourceCount', 2, 'gte', 'Must query at least 2 TI sources'),
                gates_js_1.GateFactory.citationGate(1, true, true, 'All TI sources must be cited'),
            ],
            execute: async (context) => {
                const startTime = Date.now();
                const indicators = context.state.get('indicators');
                // Simulate querying multiple TI feeds
                const tiSources = [
                    'MISP',
                    'AlienVault OTX',
                    'VirusTotal',
                    'Shodan',
                    'URLhaus',
                ];
                const enrichedData = {};
                const citations = [];
                for (const source of tiSources) {
                    // Simulate TI query
                    const sourceData = {
                        source,
                        indicators: indicators.map((ind) => ({
                            ...ind,
                            reputation: Math.random() > 0.5 ? 'malicious' : 'suspicious',
                            firstSeen: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                            lastSeen: new Date(),
                        })),
                        timestamp: new Date(),
                    };
                    enrichedData[source] = sourceData;
                    // Create citation
                    citations.push(citation_validator_js_1.CitationValidator.createCitation(source, `https://ti-feed.example.com/${source.toLowerCase()}`, 'TI Feed API', { queryTime: new Date().toISOString() }));
                }
                context.state.set('tiEnrichment', enrichedData);
                const evidence = {
                    id: `evidence-ti-enrichment-${Date.now()}`,
                    type: 'threat_intelligence',
                    data: enrichedData,
                    citations,
                    proofs: [],
                    collectedAt: new Date(),
                    metadata: {
                        sourceCount: tiSources.length,
                        qualityScore: 0.85,
                    },
                };
                return {
                    success: true,
                    evidence: [evidence],
                    citations,
                    proofs: [],
                    kpis: {
                        tiSourceCount: tiSources.length,
                    },
                    duration: Date.now() - startTime,
                };
            },
            estimatedDuration: 60000, // 60 seconds
        },
        // Node 3: Correlate with Threat Actor Profiles
        {
            id: 'correlate-actors',
            name: 'Correlate with Threat Actor Profiles',
            description: 'Correlate indicators and TTPs with known threat actor profiles',
            dependencies: ['query-ti-feeds'],
            preconditions: [],
            postconditions: [
                gates_js_1.GateFactory.kpiGate('matchedActors', 1, 'gte', 'Must match at least 1 threat actor'),
            ],
            execute: async (context) => {
                const startTime = Date.now();
                const indicators = context.state.get('indicators');
                const tiEnrichment = context.state.get('tiEnrichment');
                // Known threat actor profiles (simplified)
                const actorProfiles = [
                    {
                        id: 'apt28',
                        name: 'APT28',
                        aliases: ['Fancy Bear', 'Sofacy', 'Sednit'],
                        knownTTPs: ['spearphishing', 'credential_harvesting', 'lateral_movement'],
                        targetSectors: ['government', 'military', 'aerospace'],
                        geographicFocus: ['US', 'EU', 'NATO'],
                        motivation: 'espionage',
                        sophistication: 'advanced',
                    },
                    {
                        id: 'apt29',
                        name: 'APT29',
                        aliases: ['Cozy Bear', 'The Dukes'],
                        knownTTPs: ['spearphishing', 'cloud_exploitation', 'supply_chain'],
                        targetSectors: ['government', 'think_tanks', 'healthcare'],
                        geographicFocus: ['US', 'EU'],
                        motivation: 'espionage',
                        sophistication: 'advanced',
                    },
                    {
                        id: 'lazarus',
                        name: 'Lazarus Group',
                        aliases: ['Hidden Cobra', 'Zinc'],
                        knownTTPs: ['destructive_malware', 'cryptocurrency_theft', 'supply_chain'],
                        targetSectors: ['financial', 'cryptocurrency', 'media'],
                        geographicFocus: ['Global'],
                        motivation: 'financial_espionage',
                        sophistication: 'advanced',
                    },
                ];
                // Simulate correlation
                const matches = actorProfiles.map((actor) => {
                    const score = Math.random() * 0.5 + 0.3; // 30-80%
                    return {
                        actor,
                        score,
                        matchedIndicators: Math.floor(indicators.length * score),
                        matchedTTPs: actor.knownTTPs.slice(0, Math.floor(actor.knownTTPs.length * score)),
                    };
                });
                // Sort by score
                matches.sort((a, b) => b.score - a.score);
                context.state.set('actorMatches', matches);
                const citations = [
                    citation_validator_js_1.CitationValidator.createCitation('MITRE ATT&CK Framework', 'https://attack.mitre.org/', 'MITRE Corporation', { version: 'v13' }),
                    citation_validator_js_1.CitationValidator.createCitation('Threat Actor Encyclopedia', 'https://malpedia.caad.fkie.fraunhofer.de/', 'Fraunhofer FKIE'),
                ];
                const evidence = {
                    id: `evidence-actor-correlation-${Date.now()}`,
                    type: 'threat_actor_correlation',
                    data: { matches },
                    citations,
                    proofs: [],
                    collectedAt: new Date(),
                    metadata: {
                        matchedActors: matches.length,
                        qualityScore: 0.8,
                    },
                };
                return {
                    success: true,
                    evidence: [evidence],
                    citations,
                    proofs: [],
                    kpis: {
                        matchedActors: matches.length,
                    },
                    duration: Date.now() - startTime,
                };
            },
            estimatedDuration: 45000, // 45 seconds
        },
        // Node 4: Generate Attribution Report
        {
            id: 'generate-report',
            name: 'Generate Attribution Report',
            description: 'Generate final attribution report with confidence scores and evidence',
            dependencies: ['correlate-actors'],
            preconditions: [],
            postconditions: [
                gates_js_1.GateFactory.kpiGate('confidenceScore', 0.7, 'gte', 'Attribution confidence must be >= 70%'),
                gates_js_1.GateFactory.citationGate(3, true, true, 'Report must cite at least 3 sources'),
                gates_js_1.GateFactory.proofGate(true, false, 'Report must include cryptographic proof'),
            ],
            execute: async (context) => {
                const startTime = Date.now();
                const actorMatches = context.state.get('actorMatches');
                // Generate attribution report
                const topMatch = actorMatches[0];
                const confidenceScore = topMatch.score;
                const report = {
                    attributedActor: topMatch.actor,
                    confidenceScore,
                    supportingEvidence: {
                        matchedIndicators: topMatch.matchedIndicators,
                        matchedTTPs: topMatch.matchedTTPs,
                        correlationScore: confidenceScore,
                    },
                    alternativeCandidates: actorMatches.slice(1, 3),
                    generatedAt: new Date(),
                };
                context.state.set('attributionReport', report);
                // Generate cryptographic proof
                const reportHash = (0, crypto_1.createHash)('sha256').update(JSON.stringify(report)).digest('hex');
                const proof = {
                    algorithm: 'sha256',
                    signature: reportHash,
                    timestamp: new Date(),
                };
                // Collect all citations from previous steps
                const allCitations = context.citations;
                const evidence = {
                    id: `evidence-attribution-report-${Date.now()}`,
                    type: 'attribution_report',
                    data: report,
                    citations: allCitations,
                    proofs: [proof],
                    collectedAt: new Date(),
                    metadata: {
                        confidenceScore,
                        qualityScore: confidenceScore,
                    },
                };
                return {
                    success: true,
                    evidence: [evidence],
                    citations: allCitations,
                    proofs: [proof],
                    kpis: {
                        confidenceScore,
                    },
                    duration: Date.now() - startTime,
                };
            },
            estimatedDuration: 15000, // 15 seconds
        },
    ];
    return {
        id: 'r1-rapid-attribution',
        name: 'R1: Rapid Attribution (CTI)',
        description: 'Rapidly attribute cyber attacks to threat actors using CTI',
        version: '1.0.0',
        nodes,
        benchmarks: {
            total: 300000, // 5 minutes
            perNode: {
                'collect-indicators': 30000,
                'query-ti-feeds': 60000,
                'correlate-actors': 45000,
                'generate-report': 15000,
            },
        },
        publicationGates: [
            gates_js_1.GateFactory.citationGate(3, true, true, 'Publication requires at least 3 cited sources'),
            gates_js_1.GateFactory.kpiGate('confidenceScore', 0.7, 'gte', 'Publication requires confidence >= 70%'),
            gates_js_1.GateFactory.proofGate(true, false, 'Publication requires cryptographic proof'),
        ],
        metadata: {
            category: 'CTI',
            sensitivity: 'high',
            retentionYears: 7,
        },
    };
}
