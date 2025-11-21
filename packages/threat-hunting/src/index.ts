/**
 * Advanced Threat Hunting Framework
 *
 * Hypothesis-driven threat hunting with automated discovery,
 * behavioral analytics, and kill chain mapping
 */

import { z } from 'zod';

// Hunt Types
export const HuntMissionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  classification: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),
  status: z.enum(['DRAFT', 'APPROVED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']),
  type: z.enum([
    'HYPOTHESIS_DRIVEN',
    'INTELLIGENCE_DRIVEN',
    'ANOMALY_DRIVEN',
    'TTP_DRIVEN',
    'IOC_DRIVEN',
    'BASELINE_DEVIATION'
  ]),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  hypothesis: z.object({
    statement: z.string(),
    attackerProfile: z.string().optional(),
    expectedTTPs: z.array(z.string()),
    targetAssets: z.array(z.string()),
    indicators: z.array(z.string()),
    dataSourcesRequired: z.array(z.string())
  }),
  scope: z.object({
    timeRange: z.object({ start: z.date(), end: z.date() }),
    systems: z.array(z.string()),
    networks: z.array(z.string()),
    users: z.array(z.string()).optional()
  }),
  queries: z.array(z.object({
    id: z.string(),
    name: z.string(),
    dataSource: z.string(),
    query: z.string(),
    language: z.enum(['KQL', 'SPL', 'SQL', 'YARA', 'SIGMA', 'LUCENE', 'CYPHER']),
    expectedResults: z.string(),
    actualResults: z.number().optional()
  })),
  findings: z.array(z.object({
    id: z.string(),
    timestamp: z.date(),
    type: z.enum(['CONFIRMED_THREAT', 'SUSPICIOUS', 'ANOMALY', 'FALSE_POSITIVE', 'IMPROVEMENT']),
    description: z.string(),
    evidence: z.array(z.string()),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']),
    relatedEntities: z.array(z.string()),
    mitreMapping: z.array(z.string()),
    actionTaken: z.string().optional()
  })),
  metrics: z.object({
    hoursInvested: z.number(),
    systemsAnalyzed: z.number(),
    eventsProcessed: z.number(),
    findingsCount: z.number(),
    truePositiveRate: z.number()
  }).optional(),
  team: z.array(z.object({ id: z.string(), role: z.string() })),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type HuntMission = z.infer<typeof HuntMissionSchema>;

// Hunting Analytics
export interface HuntAnalytics {
  statisticalBaseline: Map<string, { mean: number; stdDev: number; percentiles: number[] }>;
  anomalyThresholds: Map<string, number>;
  behaviorProfiles: Map<string, BehaviorProfile>;
  killChainCoverage: Map<string, number>;
}

export interface BehaviorProfile {
  entityId: string;
  entityType: 'USER' | 'HOST' | 'SERVICE' | 'APPLICATION';
  normalBehavior: {
    accessPatterns: number[];
    networkActivity: number[];
    processExecution: string[];
    fileOperations: string[];
    authenticationPatterns: any;
  };
  deviations: Array<{
    timestamp: Date;
    metric: string;
    expected: number;
    actual: number;
    severity: number;
  }>;
  riskScore: number;
  lastUpdated: Date;
}

export interface ThreatHypothesis {
  id: string;
  statement: string;
  rationale: string;
  confidence: number;
  supportingIntelligence: string[];
  requiredData: string[];
  testingApproach: string[];
  expectedFindings: string[];
  falsePositiveIndicators: string[];
}

export interface HuntPlaybook {
  id: string;
  name: string;
  description: string;
  targetThreat: string;
  mitreMapping: string[];
  prerequisites: string[];
  dataSources: string[];
  queries: Array<{
    step: number;
    description: string;
    query: string;
    expectedOutput: string;
    nextSteps: { onMatch: string; onNoMatch: string };
  }>;
  analysisGuidance: string[];
  escalationCriteria: string[];
}

/**
 * Advanced Threat Hunting Engine
 */
export class ThreatHuntingEngine {
  private missions: Map<string, HuntMission> = new Map();
  private playbooks: Map<string, HuntPlaybook> = new Map();
  private hypotheses: Map<string, ThreatHypothesis> = new Map();
  private analytics: HuntAnalytics;
  private behaviorProfiles: Map<string, BehaviorProfile> = new Map();

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
  async createHuntMission(
    hypothesis: ThreatHypothesis,
    scope: HuntMission['scope'],
    team: HuntMission['team']
  ): Promise<HuntMission> {
    // Generate hunting queries based on hypothesis
    const queries = await this.generateHuntingQueries(hypothesis);

    const mission: HuntMission = {
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
  async executePlaybookHunt(
    playbookId: string,
    dataConnector: DataConnector
  ): Promise<{
    missionId: string;
    findings: HuntMission['findings'];
    coverage: Map<string, boolean>;
    recommendations: string[];
  }> {
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) throw new Error(`Playbook ${playbookId} not found`);

    const findings: HuntMission['findings'] = [];
    const coverage = new Map<string, boolean>();

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
      } catch (error) {
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
  async analyzeBaseline(
    entityId: string,
    entityType: BehaviorProfile['entityType'],
    historicalData: any[],
    windowDays: number = 30
  ): Promise<BehaviorProfile> {
    // Calculate statistical baselines
    const accessPatterns = this.calculateTimeSeriesBaseline(
      historicalData.map(d => d.accessCount || 0)
    );
    const networkActivity = this.calculateTimeSeriesBaseline(
      historicalData.map(d => d.networkBytes || 0)
    );

    // Extract process and file patterns
    const processExecution = this.extractFrequentPatterns(
      historicalData.flatMap(d => d.processes || [])
    );
    const fileOperations = this.extractFrequentPatterns(
      historicalData.flatMap(d => d.fileOps || [])
    );

    // Calculate authentication patterns
    const authPatterns = this.analyzeAuthenticationPatterns(historicalData);

    const profile: BehaviorProfile = {
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
  async detectDeviations(
    entityId: string,
    currentData: any
  ): Promise<{
    deviations: BehaviorProfile['deviations'];
    riskScore: number;
    alerts: Array<{ type: string; severity: string; description: string }>;
  }> {
    const profile = this.behaviorProfiles.get(entityId);
    if (!profile) {
      return { deviations: [], riskScore: 0, alerts: [] };
    }

    const deviations: BehaviorProfile['deviations'] = [];
    const alerts: Array<{ type: string; severity: string; description: string }> = [];

    // Check access pattern deviation
    const accessDeviation = this.calculateDeviation(
      currentData.accessCount || 0,
      profile.normalBehavior.accessPatterns
    );
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
    const networkDeviation = this.calculateDeviation(
      currentData.networkBytes || 0,
      profile.normalBehavior.networkActivity
    );
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
    const unusualProcesses = (currentData.processes || []).filter(
      (p: string) => !profile.normalBehavior.processExecution.includes(p)
    );
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
  async generateHypotheses(
    threatIntelligence: any[],
    environmentContext: any
  ): Promise<ThreatHypothesis[]> {
    const hypotheses: ThreatHypothesis[] = [];

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
          testingApproach: intel.preferredTTPs.map((ttp: string) => `Hunt for ${ttp} indicators`),
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
  mapToKillChain(findings: HuntMission['findings']): {
    coverage: Map<string, number>;
    gaps: string[];
    attackPath: string[];
  } {
    const killChainPhases = [
      'reconnaissance', 'resource-development', 'initial-access',
      'execution', 'persistence', 'privilege-escalation',
      'defense-evasion', 'credential-access', 'discovery',
      'lateral-movement', 'collection', 'command-and-control',
      'exfiltration', 'impact'
    ];

    const coverage = new Map<string, number>();
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
  async correlateFindingsAcrossMissions(): Promise<{
    clusters: Array<{
      theme: string;
      findings: string[];
      missions: string[];
      confidence: number;
    }>;
    patterns: Array<{
      pattern: string;
      frequency: number;
      missions: string[];
    }>;
    recommendations: string[];
  }> {
    const allFindings: Array<{ missionId: string; finding: HuntMission['findings'][0] }> = [];

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

  private async generateHuntingQueries(hypothesis: ThreatHypothesis): Promise<HuntMission['queries']> {
    const queries: HuntMission['queries'] = [];
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

  private generateQueryForDataSource(dataSource: string, hypothesis: ThreatHypothesis): string {
    // Generate appropriate query based on data source
    const templates: Record<string, string> = {
      'EDR logs': `process where process.name in ("powershell.exe", "cmd.exe") and process.command_line matches ".*encoded.*"`,
      'Network flows': `netflow where bytes_out > 10000000 and dst_port not in (80, 443)`,
      'Authentication logs': `auth where result = "failure" | stats count by user | where count > 10`
    };
    return templates[dataSource] || `search ${dataSource}`;
  }

  private getQueryLanguage(dataSource: string): HuntMission['queries'][0]['language'] {
    const languages: Record<string, HuntMission['queries'][0]['language']> = {
      'EDR logs': 'KQL',
      'Network flows': 'SPL',
      'Authentication logs': 'SQL'
    };
    return languages[dataSource] || 'LUCENE';
  }

  private assessHypothesisPriority(hypothesis: ThreatHypothesis): HuntMission['priority'] {
    if (hypothesis.confidence > 0.8) return 'CRITICAL';
    if (hypothesis.confidence > 0.6) return 'HIGH';
    if (hypothesis.confidence > 0.4) return 'MEDIUM';
    return 'LOW';
  }

  private async analyzeQueryResults(
    results: any[],
    playbook: HuntPlaybook,
    step: any
  ): Promise<HuntMission['findings']> {
    const findings: HuntMission['findings'] = [];

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

  private async createMissionFromPlaybook(
    playbook: HuntPlaybook,
    findings: HuntMission['findings']
  ): Promise<HuntMission> {
    const mission: HuntMission = {
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
        language: 'KQL' as const,
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

  private calculateTimeSeriesBaseline(values: number[]): { values: number[]; mean: number; stdDev: number } {
    const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length || 1);
    const stdDev = Math.sqrt(variance);
    return { values, mean, stdDev };
  }

  private extractFrequentPatterns(items: string[]): string[] {
    const counts = new Map<string, number>();
    items.forEach(item => counts.set(item, (counts.get(item) || 0) + 1));
    return Array.from(counts.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([item]) => item);
  }

  private analyzeAuthenticationPatterns(data: any[]): any {
    return {
      typicalHours: [9, 10, 11, 14, 15, 16],
      typicalDays: [1, 2, 3, 4, 5],
      typicalLocations: ['office', 'vpn']
    };
  }

  private calculateDeviation(value: number, baseline: number[]): { expected: number; severity: number } {
    const mean = baseline.reduce((a, b) => a + b, 0) / (baseline.length || 1);
    const stdDev = Math.sqrt(
      baseline.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (baseline.length || 1)
    );
    const severity = stdDev > 0 ? Math.abs(value - mean) / stdDev : 0;
    return { expected: mean, severity };
  }

  private calculateRiskScore(deviations: any[], unusualProcesses: string[]): number {
    let score = 0;
    for (const dev of deviations) {
      score += dev.severity * 10;
    }
    score += unusualProcesses.length * 15;
    return Math.min(score, 100);
  }

  private getKillChainPhase(mitreId: string): string | null {
    // Simplified mapping
    const phaseMap: Record<string, string> = {
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

  private clusterFindings(findings: any[]): any[] {
    return [];
  }

  private detectFindingPatterns(findings: any[]): any[] {
    return [];
  }

  private generateCorrelationRecommendations(clusters: any[], patterns: any[]): string[] {
    return ['Review correlated findings for campaign indicators'];
  }

  private generateHuntRecommendations(findings: any[], coverage: Map<string, boolean>, playbook: HuntPlaybook): string[] {
    const recommendations: string[] = [];

    if (findings.length > 0) {
      recommendations.push('Escalate findings to incident response team');
    }

    const failedSteps = Array.from(coverage.entries()).filter(([_, success]) => !success);
    if (failedSteps.length > 0) {
      recommendations.push(`Review failed query steps: ${failedSteps.map(([step]) => step).join(', ')}`);
    }

    return recommendations;
  }

  private initializeDefaultPlaybooks(): void {
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
  getMission(id: string): HuntMission | undefined { return this.missions.get(id); }
  getAllMissions(): HuntMission[] { return Array.from(this.missions.values()); }
  getPlaybook(id: string): HuntPlaybook | undefined { return this.playbooks.get(id); }
  getAllPlaybooks(): HuntPlaybook[] { return Array.from(this.playbooks.values()); }
}

// Data connector interface
export interface DataConnector {
  executeQuery(query: string): Promise<any[]>;
  getDataSources(): string[];
}

export { ThreatHuntingEngine };
