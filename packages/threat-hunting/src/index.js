"use strict";
/**
 * Advanced Threat Hunting Framework
 *
 * Hypothesis-driven threat hunting with automated discovery,
 * behavioral analytics, and kill chain mapping
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatHuntingEngine = exports.HuntMissionSchema = void 0;
const zod_1 = require("zod");
// Hunt Types
exports.HuntMissionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    classification: zod_1.z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),
    status: zod_1.z.enum(['DRAFT', 'APPROVED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']),
    type: zod_1.z.enum([
        'HYPOTHESIS_DRIVEN',
        'INTELLIGENCE_DRIVEN',
        'ANOMALY_DRIVEN',
        'TTP_DRIVEN',
        'IOC_DRIVEN',
        'BASELINE_DEVIATION'
    ]),
    priority: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    hypothesis: zod_1.z.object({
        statement: zod_1.z.string(),
        attackerProfile: zod_1.z.string().optional(),
        expectedTTPs: zod_1.z.array(zod_1.z.string()),
        targetAssets: zod_1.z.array(zod_1.z.string()),
        indicators: zod_1.z.array(zod_1.z.string()),
        dataSourcesRequired: zod_1.z.array(zod_1.z.string())
    }),
    scope: zod_1.z.object({
        timeRange: zod_1.z.object({ start: zod_1.z.date(), end: zod_1.z.date() }),
        systems: zod_1.z.array(zod_1.z.string()),
        networks: zod_1.z.array(zod_1.z.string()),
        users: zod_1.z.array(zod_1.z.string()).optional()
    }),
    queries: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        dataSource: zod_1.z.string(),
        query: zod_1.z.string(),
        language: zod_1.z.enum(['KQL', 'SPL', 'SQL', 'YARA', 'SIGMA', 'LUCENE', 'CYPHER']),
        expectedResults: zod_1.z.string(),
        actualResults: zod_1.z.number().optional()
    })),
    findings: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        timestamp: zod_1.z.date(),
        type: zod_1.z.enum(['CONFIRMED_THREAT', 'SUSPICIOUS', 'ANOMALY', 'FALSE_POSITIVE', 'IMPROVEMENT']),
        description: zod_1.z.string(),
        evidence: zod_1.z.array(zod_1.z.string()),
        severity: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']),
        relatedEntities: zod_1.z.array(zod_1.z.string()),
        mitreMapping: zod_1.z.array(zod_1.z.string()),
        actionTaken: zod_1.z.string().optional()
    })),
    metrics: zod_1.z.object({
        hoursInvested: zod_1.z.number(),
        systemsAnalyzed: zod_1.z.number(),
        eventsProcessed: zod_1.z.number(),
        findingsCount: zod_1.z.number(),
        truePositiveRate: zod_1.z.number()
    }).optional(),
    team: zod_1.z.array(zod_1.z.object({ id: zod_1.z.string(), role: zod_1.z.string() })),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
/**
 * Advanced Threat Hunting Engine
 */
class ThreatHuntingEngine {
    missions = new Map();
    playbooks = new Map();
    hypotheses = new Map();
    analytics;
    behaviorProfiles = new Map();
    constructor() {
        this.analytics = {
            statisticalBaseline: new Map(),
            anomalyThresholds: new Map(),
            behaviorProfiles: new Map(),
            killChainCoverage: new Map()
        };
        this.initializeDefaultPlaybooks();
    }
    /**
     * Create hypothesis-driven hunt mission
     */
    async createHuntMission(hypothesis, scope, team) {
        // Generate hunting queries based on hypothesis
        const queries = await this.generateHuntingQueries(hypothesis);
        const mission = {
            id: crypto.randomUUID(),
            name: `Hunt: ${hypothesis.statement.substring(0, 50)}...`,
            classification: 'SECRET',
            status: 'DRAFT',
            type: 'HYPOTHESIS_DRIVEN',
            priority: this.assessHypothesisPriority(hypothesis),
            hypothesis: {
                statement: hypothesis.statement,
                attackerProfile: hypothesis.supportingIntelligence[0],
                expectedTTPs: hypothesis.requiredData,
                targetAssets: [],
                indicators: [],
                dataSourcesRequired: hypothesis.requiredData
            },
            scope,
            queries,
            findings: [],
            team,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.missions.set(mission.id, mission);
        return mission;
    }
    /**
     * Execute automated hunt using playbook
     */
    async executePlaybookHunt(playbookId, dataConnector) {
        const playbook = this.playbooks.get(playbookId);
        if (!playbook)
            throw new Error(`Playbook ${playbookId} not found`);
        const findings = [];
        const coverage = new Map();
        // Execute each query step
        for (const step of playbook.queries) {
            try {
                const results = await dataConnector.executeQuery(step.query);
                coverage.set(`step_${step.step}`, true);
                if (results.length > 0) {
                    // Analyze results for threats
                    const analyzedFindings = await this.analyzeQueryResults(results, playbook, step);
                    findings.push(...analyzedFindings);
                }
            }
            catch (error) {
                coverage.set(`step_${step.step}`, false);
            }
        }
        // Create mission record
        const mission = await this.createMissionFromPlaybook(playbook, findings);
        return {
            missionId: mission.id,
            findings,
            coverage,
            recommendations: this.generateHuntRecommendations(findings, coverage, playbook)
        };
    }
    /**
     * Perform behavioral baseline analysis
     */
    async analyzeBaseline(entityId, entityType, historicalData, windowDays = 30) {
        // Calculate statistical baselines
        const accessPatterns = this.calculateTimeSeriesBaseline(historicalData.map(d => d.accessCount || 0));
        const networkActivity = this.calculateTimeSeriesBaseline(historicalData.map(d => d.networkBytes || 0));
        // Extract process and file patterns
        const processExecution = this.extractFrequentPatterns(historicalData.flatMap(d => d.processes || []));
        const fileOperations = this.extractFrequentPatterns(historicalData.flatMap(d => d.fileOps || []));
        // Calculate authentication patterns
        const authPatterns = this.analyzeAuthenticationPatterns(historicalData);
        const profile = {
            entityId,
            entityType,
            normalBehavior: {
                accessPatterns: accessPatterns.values,
                networkActivity: networkActivity.values,
                processExecution,
                fileOperations,
                authenticationPatterns: authPatterns
            },
            deviations: [],
            riskScore: 0,
            lastUpdated: new Date()
        };
        this.behaviorProfiles.set(entityId, profile);
        this.analytics.behaviorProfiles.set(entityId, profile);
        return profile;
    }
    /**
     * Detect deviations from baseline
     */
    async detectDeviations(entityId, currentData) {
        const profile = this.behaviorProfiles.get(entityId);
        if (!profile) {
            return { deviations: [], riskScore: 0, alerts: [] };
        }
        const deviations = [];
        const alerts = [];
        // Check access pattern deviation
        const accessDeviation = this.calculateDeviation(currentData.accessCount || 0, profile.normalBehavior.accessPatterns);
        if (accessDeviation.severity > 2) {
            deviations.push({
                timestamp: new Date(),
                metric: 'access_count',
                expected: accessDeviation.expected,
                actual: currentData.accessCount,
                severity: accessDeviation.severity
            });
            alerts.push({
                type: 'ACCESS_ANOMALY',
                severity: accessDeviation.severity > 3 ? 'HIGH' : 'MEDIUM',
                description: `Unusual access pattern: ${accessDeviation.severity.toFixed(1)} sigma deviation`
            });
        }
        // Check network activity deviation
        const networkDeviation = this.calculateDeviation(currentData.networkBytes || 0, profile.normalBehavior.networkActivity);
        if (networkDeviation.severity > 2) {
            deviations.push({
                timestamp: new Date(),
                metric: 'network_bytes',
                expected: networkDeviation.expected,
                actual: currentData.networkBytes,
                severity: networkDeviation.severity
            });
            alerts.push({
                type: 'NETWORK_ANOMALY',
                severity: networkDeviation.severity > 3 ? 'HIGH' : 'MEDIUM',
                description: `Unusual network activity: ${networkDeviation.severity.toFixed(1)} sigma deviation`
            });
        }
        // Check for unusual processes
        const unusualProcesses = (currentData.processes || []).filter((p) => !profile.normalBehavior.processExecution.includes(p));
        if (unusualProcesses.length > 0) {
            alerts.push({
                type: 'PROCESS_ANOMALY',
                severity: 'MEDIUM',
                description: `Unusual processes detected: ${unusualProcesses.join(', ')}`
            });
        }
        // Calculate overall risk score
        const riskScore = this.calculateRiskScore(deviations, unusualProcesses);
        // Update profile
        profile.deviations.push(...deviations);
        profile.riskScore = riskScore;
        profile.lastUpdated = new Date();
        return { deviations, riskScore, alerts };
    }
    /**
     * Generate threat hypotheses from intelligence
     */
    async generateHypotheses(threatIntelligence, environmentContext) {
        const hypotheses = [];
        for (const intel of threatIntelligence) {
            // Generate hypothesis based on threat actor TTPs
            if (intel.type === 'APT_PROFILE') {
                hypotheses.push({
                    id: crypto.randomUUID(),
                    statement: `${intel.name} may be targeting our ${environmentContext.criticalAssets[0]} using ${intel.preferredTTPs[0]}`,
                    rationale: `Based on recent ${intel.name} activity targeting similar organizations`,
                    confidence: 0.7,
                    supportingIntelligence: [intel.id],
                    requiredData: ['EDR logs', 'Network flows', 'Authentication logs'],
                    testingApproach: intel.preferredTTPs.map((ttp) => `Hunt for ${ttp} indicators`),
                    expectedFindings: ['Suspicious process execution', 'Unusual network connections'],
                    falsePositiveIndicators: ['Legitimate admin activity', 'Scheduled tasks']
                });
            }
            // Generate hypothesis based on vulnerabilities
            if (intel.type === 'VULNERABILITY') {
                hypotheses.push({
                    id: crypto.randomUUID(),
                    statement: `Attackers may be exploiting ${intel.cve} in our environment`,
                    rationale: `${intel.cve} is actively exploited and affects our ${intel.affectedProduct}`,
                    confidence: 0.8,
                    supportingIntelligence: [intel.id],
                    requiredData: ['Vulnerability scan results', 'Web logs', 'Application logs'],
                    testingApproach: ['Scan for vulnerable systems', 'Analyze exploitation attempts'],
                    expectedFindings: ['Exploitation attempts', 'Successful compromises'],
                    falsePositiveIndicators: ['Security scanner activity', 'Penetration testing']
                });
            }
        }
        // Rank hypotheses by priority
        hypotheses.sort((a, b) => b.confidence - a.confidence);
        return hypotheses;
    }
    /**
     * Map findings to MITRE ATT&CK kill chain
     */
    mapToKillChain(findings) {
        const killChainPhases = [
            'reconnaissance', 'resource-development', 'initial-access',
            'execution', 'persistence', 'privilege-escalation',
            'defense-evasion', 'credential-access', 'discovery',
            'lateral-movement', 'collection', 'command-and-control',
            'exfiltration', 'impact'
        ];
        const coverage = new Map();
        killChainPhases.forEach(phase => coverage.set(phase, 0));
        // Map findings to phases
        for (const finding of findings) {
            for (const mitreId of finding.mitreMapping) {
                const phase = this.getKillChainPhase(mitreId);
                if (phase) {
                    coverage.set(phase, (coverage.get(phase) || 0) + 1);
                }
            }
        }
        // Identify gaps
        const gaps = killChainPhases.filter(phase => (coverage.get(phase) || 0) === 0);
        // Build attack path
        const attackPath = killChainPhases.filter(phase => (coverage.get(phase) || 0) > 0);
        return { coverage, gaps, attackPath };
    }
    /**
     * Correlate hunting findings across missions
     */
    async correlateFindingsAcrossMissions() {
        const allFindings = [];
        for (const [missionId, mission] of this.missions) {
            for (const finding of mission.findings) {
                allFindings.push({ missionId, finding });
            }
        }
        // Cluster similar findings
        const clusters = this.clusterFindings(allFindings);
        // Detect patterns
        const patterns = this.detectFindingPatterns(allFindings);
        // Generate recommendations
        const recommendations = this.generateCorrelationRecommendations(clusters, patterns);
        return { clusters, patterns, recommendations };
    }
    // Private methods
    async generateHuntingQueries(hypothesis) {
        const queries = [];
        let queryId = 1;
        // Generate queries for each required data source
        for (const dataSource of hypothesis.requiredData) {
            queries.push({
                id: `q_${queryId++}`,
                name: `Query ${dataSource}`,
                dataSource,
                query: this.generateQueryForDataSource(dataSource, hypothesis),
                language: this.getQueryLanguage(dataSource),
                expectedResults: hypothesis.expectedFindings[0] || 'Suspicious activity'
            });
        }
        return queries;
    }
    generateQueryForDataSource(dataSource, hypothesis) {
        // Generate appropriate query based on data source
        const templates = {
            'EDR logs': `process where process.name in ("powershell.exe", "cmd.exe") and process.command_line matches ".*encoded.*"`,
            'Network flows': `netflow where bytes_out > 10000000 and dst_port not in (80, 443)`,
            'Authentication logs': `auth where result = "failure" | stats count by user | where count > 10`
        };
        return templates[dataSource] || `search ${dataSource}`;
    }
    getQueryLanguage(dataSource) {
        const languages = {
            'EDR logs': 'KQL',
            'Network flows': 'SPL',
            'Authentication logs': 'SQL'
        };
        return languages[dataSource] || 'LUCENE';
    }
    assessHypothesisPriority(hypothesis) {
        if (hypothesis.confidence > 0.8)
            return 'CRITICAL';
        if (hypothesis.confidence > 0.6)
            return 'HIGH';
        if (hypothesis.confidence > 0.4)
            return 'MEDIUM';
        return 'LOW';
    }
    async analyzeQueryResults(results, playbook, step) {
        const findings = [];
        for (const result of results) {
            findings.push({
                id: crypto.randomUUID(),
                timestamp: new Date(),
                type: 'SUSPICIOUS',
                description: `Found match in ${playbook.name}: ${JSON.stringify(result).substring(0, 200)}`,
                evidence: [JSON.stringify(result)],
                severity: 'MEDIUM',
                relatedEntities: [],
                mitreMapping: playbook.mitreMapping,
                actionTaken: undefined
            });
        }
        return findings;
    }
    async createMissionFromPlaybook(playbook, findings) {
        const mission = {
            id: crypto.randomUUID(),
            name: `Playbook Hunt: ${playbook.name}`,
            classification: 'SECRET',
            status: 'COMPLETED',
            type: 'TTP_DRIVEN',
            priority: 'MEDIUM',
            hypothesis: {
                statement: playbook.description,
                expectedTTPs: playbook.mitreMapping,
                targetAssets: [],
                indicators: [],
                dataSourcesRequired: playbook.dataSources
            },
            scope: {
                timeRange: { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() },
                systems: [],
                networks: []
            },
            queries: playbook.queries.map((q, i) => ({
                id: `q_${i}`,
                name: q.description,
                dataSource: playbook.dataSources[0],
                query: q.query,
                language: 'KQL',
                expectedResults: q.expectedOutput
            })),
            findings,
            team: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.missions.set(mission.id, mission);
        return mission;
    }
    calculateTimeSeriesBaseline(values) {
        const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length || 1);
        const stdDev = Math.sqrt(variance);
        return { values, mean, stdDev };
    }
    extractFrequentPatterns(items) {
        const counts = new Map();
        items.forEach(item => counts.set(item, (counts.get(item) || 0) + 1));
        return Array.from(counts.entries())
            .filter(([_, count]) => count > 1)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 100)
            .map(([item]) => item);
    }
    analyzeAuthenticationPatterns(data) {
        return {
            typicalHours: [9, 10, 11, 14, 15, 16],
            typicalDays: [1, 2, 3, 4, 5],
            typicalLocations: ['office', 'vpn']
        };
    }
    calculateDeviation(value, baseline) {
        const mean = baseline.reduce((a, b) => a + b, 0) / (baseline.length || 1);
        const stdDev = Math.sqrt(baseline.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (baseline.length || 1));
        const severity = stdDev > 0 ? Math.abs(value - mean) / stdDev : 0;
        return { expected: mean, severity };
    }
    calculateRiskScore(deviations, unusualProcesses) {
        let score = 0;
        for (const dev of deviations) {
            score += dev.severity * 10;
        }
        score += unusualProcesses.length * 15;
        return Math.min(score, 100);
    }
    getKillChainPhase(mitreId) {
        // Simplified mapping
        const phaseMap = {
            'T1595': 'reconnaissance',
            'T1566': 'initial-access',
            'T1059': 'execution',
            'T1547': 'persistence',
            'T1548': 'privilege-escalation',
            'T1070': 'defense-evasion',
            'T1003': 'credential-access',
            'T1021': 'lateral-movement',
            'T1041': 'exfiltration'
        };
        return phaseMap[mitreId.split('.')[0]] || null;
    }
    clusterFindings(findings) {
        return [];
    }
    detectFindingPatterns(findings) {
        return [];
    }
    generateCorrelationRecommendations(clusters, patterns) {
        return ['Review correlated findings for campaign indicators'];
    }
    generateHuntRecommendations(findings, coverage, playbook) {
        const recommendations = [];
        if (findings.length > 0) {
            recommendations.push('Escalate findings to incident response team');
        }
        const failedSteps = Array.from(coverage.entries()).filter(([_, success]) => !success);
        if (failedSteps.length > 0) {
            recommendations.push(`Review failed query steps: ${failedSteps.map(([step]) => step).join(', ')}`);
        }
        return recommendations;
    }
    initializeDefaultPlaybooks() {
        this.playbooks.set('pb_credential_dumping', {
            id: 'pb_credential_dumping',
            name: 'Credential Dumping Detection',
            description: 'Hunt for credential dumping techniques',
            targetThreat: 'Credential Access',
            mitreMapping: ['T1003', 'T1003.001', 'T1003.002'],
            prerequisites: ['EDR telemetry', 'Windows event logs'],
            dataSources: ['EDR logs', 'Windows Security'],
            queries: [
                {
                    step: 1,
                    description: 'Detect LSASS access',
                    query: 'process where process.name == "lsass.exe" and event.type == "access"',
                    expectedOutput: 'LSASS memory access events',
                    nextSteps: { onMatch: 'Investigate process', onNoMatch: 'Continue' }
                }
            ],
            analysisGuidance: ['Check for mimikatz signatures', 'Verify parent process'],
            escalationCriteria: ['Confirmed credential dump', 'Multiple affected hosts']
        });
    }
    // Public API
    getMission(id) { return this.missions.get(id); }
    getAllMissions() { return Array.from(this.missions.values()); }
    getPlaybook(id) { return this.playbooks.get(id); }
    getAllPlaybooks() { return Array.from(this.playbooks.values()); }
}
exports.ThreatHuntingEngine = ThreatHuntingEngine;
