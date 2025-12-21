/**
 * Runbook R1: Rapid Attribution for Threat Intelligence
 *
 * Executable DAG that processes indicators through infrastructure mapping
 * to ATT&CK techniques and generates evidence-first narratives.
 */

import { randomUUID as uuidv4 } from 'crypto';
import pino from 'pino';
import { createSpan, businessMetrics } from '../observability/telemetry';
import {
  registerEvidence,
  createClaim,
} from '../../prov-ledger-service/src/ledger';

const logger = pino({ name: 'rapid-attribution-runbook' });

// DAG node types
type DAGNodeType =
  | 'indicator_enrichment'
  | 'infrastructure_mapping'
  | 'pattern_analysis'
  | 'attack_mapping'
  | 'narrative_generation';

// DAG execution context
interface DAGContext {
  runId: string;
  caseId: string;
  userId: string;
  tenantId: string;
  startTime: Date;
  parameters: Record<string, any>;
  evidence: Map<string, any>;
  claims: Map<string, any>;
  metrics: {
    timeToHypothesis: number;
    precision: number;
    evidenceCount: number;
    confidenceScore: number;
  };
}

// DAG node definition
interface DAGNode {
  id: string;
  type: DAGNodeType;
  name: string;
  dependencies: string[];
  timeout: number;
  retryCount: number;
  enabled: boolean;
  parameters: Record<string, any>;
  execute: (context: DAGContext, inputs: Map<string, any>) => Promise<any>;
}

// Indicator input
interface ThreatIndicator {
  id: string;
  type: 'ip' | 'domain' | 'hash' | 'email' | 'url';
  value: string;
  firstSeen: Date;
  source: string;
  confidence: number;
  context?: Record<string, any>;
}

// Infrastructure entity
interface InfrastructureEntity {
  id: string;
  type: 'server' | 'network' | 'service' | 'certificate' | 'registrar';
  properties: Record<string, any>;
  relationships: Array<{
    targetId: string;
    type: string;
    confidence: number;
  }>;
  riskScore: number;
}

// ATT&CK mapping result
interface AttackMapping {
  techniqueId: string;
  techniqueName: string;
  tactic: string;
  confidence: number;
  evidence: string[];
  mitigations: string[];
}

// Generated hypothesis
interface ThreatHypothesis {
  id: string;
  title: string;
  summary: string;
  confidence: number;
  attackTechniques: AttackMapping[];
  indicators: ThreatIndicator[];
  infrastructure: InfrastructureEntity[];
  timeline: Array<{
    timestamp: Date;
    event: string;
    evidence: string;
  }>;
  recommendations: string[];
  citations: string[];
}

export class RapidAttributionRunbook {
  private nodes: Map<string, DAGNode> = new Map();
  private executionOrder: string[] = [];

  constructor() {
    this.initializeDAG();
  }

  private initializeDAG(): void {
    // Node 1: Indicator Enrichment
    this.addNode({
      id: 'indicator_enrichment',
      type: 'indicator_enrichment',
      name: 'Indicator Enrichment & Validation',
      dependencies: [],
      timeout: 30000,
      retryCount: 2,
      enabled: true,
      parameters: {
        enablePassiveDNS: true,
        enableWhoIS: true,
        enableReputation: true,
        confidenceThreshold: 0.7,
      },
      execute: this.enrichIndicators.bind(this),
    });

    // Node 2: Infrastructure Mapping
    this.addNode({
      id: 'infrastructure_mapping',
      type: 'infrastructure_mapping',
      name: 'Infrastructure Discovery & Mapping',
      dependencies: ['indicator_enrichment'],
      timeout: 45000,
      retryCount: 2,
      enabled: true,
      parameters: {
        maxHops: 3,
        includeHistorical: true,
        riskThreshold: 0.5,
      },
      execute: this.mapInfrastructure.bind(this),
    });

    // Node 3: Pattern Analysis
    this.addNode({
      id: 'pattern_analysis',
      type: 'pattern_analysis',
      name: 'Pattern Recognition & Clustering',
      dependencies: ['infrastructure_mapping'],
      timeout: 60000,
      retryCount: 1,
      enabled: true,
      parameters: {
        algorithmType: 'graph_clustering',
        similarityThreshold: 0.8,
        minClusterSize: 3,
      },
      execute: this.analyzePatterns.bind(this),
    });

    // Node 4: ATT&CK Mapping
    this.addNode({
      id: 'attack_mapping',
      type: 'attack_mapping',
      name: 'ATT&CK Technique Mapping',
      dependencies: ['pattern_analysis'],
      timeout: 30000,
      retryCount: 2,
      enabled: true,
      parameters: {
        attackFrameworkVersion: '14.1',
        confidenceThreshold: 0.6,
        includeMitigations: true,
      },
      execute: this.mapToAttack.bind(this),
    });

    // Node 5: Narrative Generation
    this.addNode({
      id: 'narrative_generation',
      type: 'narrative_generation',
      name: 'Evidence-First Narrative Generation',
      dependencies: ['attack_mapping'],
      timeout: 45000,
      retryCount: 1,
      enabled: true,
      parameters: {
        includeTimeline: true,
        includeRecommendations: true,
        evidenceLevel: 'detailed',
      },
      execute: this.generateNarrative.bind(this),
    });

    this.computeExecutionOrder();
  }

  private addNode(node: DAGNode): void {
    this.nodes.set(node.id, node);
  }

  private computeExecutionOrder(): void {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (nodeId: string) => {
      if (visiting.has(nodeId)) {
        throw new Error(
          `Circular dependency detected involving node: ${nodeId}`,
        );
      }
      if (visited.has(nodeId)) {
        return;
      }

      visiting.add(nodeId);
      const node = this.nodes.get(nodeId);
      if (node) {
        for (const dep of node.dependencies) {
          visit(dep);
        }
      }
      visiting.delete(nodeId);
      visited.add(nodeId);
      order.push(nodeId);
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }

    this.executionOrder = order;
    logger.info(
      { executionOrder: this.executionOrder },
      'DAG execution order computed',
    );
  }

  // Execute the complete runbook
  async execute(
    indicators: ThreatIndicator[],
    caseId: string,
    userId: string,
    tenantId: string,
  ): Promise<ThreatHypothesis> {
    const runId = uuidv4();
    const startTime = new Date();

    const context: DAGContext = {
      runId,
      caseId,
      userId,
      tenantId,
      startTime,
      parameters: { indicators },
      evidence: new Map(),
      claims: new Map(),
      metrics: {
        timeToHypothesis: 0,
        precision: 0,
        evidenceCount: 0,
        confidenceScore: 0,
      },
    };

    return createSpan('rapid-attribution-runbook', async (span) => {
      span.setAttributes({
        'runbook.run_id': runId,
        'runbook.case_id': caseId,
        'runbook.user_id': userId,
        'runbook.tenant_id': tenantId,
        'runbook.indicator_count': indicators.length,
      });

      logger.info(
        {
          runId,
          caseId,
          indicatorCount: indicators.length,
        },
        'Starting rapid attribution runbook execution',
      );

      try {
        const nodeOutputs = new Map<string, any>();
        nodeOutputs.set('input', { indicators });

        // Execute nodes in topological order
        for (const nodeId of this.executionOrder) {
          const node = this.nodes.get(nodeId);
          if (!node || !node.enabled) {
            logger.debug({ nodeId }, 'Skipping disabled node');
            continue;
          }

          await this.executeNode(node, context, nodeOutputs);
        }

        // Calculate final metrics
        const endTime = new Date();
        context.metrics.timeToHypothesis =
          endTime.getTime() - startTime.getTime();

        // Record business metrics
        businessMetrics.cypherQueryExecutions.add(1, {
          runbook: 'rapid-attribution',
          status: 'completed',
        });

        const hypothesis = nodeOutputs.get(
          'narrative_generation',
        ) as ThreatHypothesis;

        logger.info(
          {
            runId,
            timeToHypothesis: context.metrics.timeToHypothesis,
            evidenceCount: context.metrics.evidenceCount,
            confidenceScore: hypothesis.confidence,
          },
          'Rapid attribution runbook completed',
        );

        return hypothesis;
      } catch (error) {
        logger.error({ runId, error }, 'Rapid attribution runbook failed');
        span.recordException(error as Error);
        throw error;
      }
    });
  }

  private async executeNode(
    node: DAGNode,
    context: DAGContext,
    nodeOutputs: Map<string, any>,
  ): Promise<void> {
    const nodeStartTime = Date.now();

    return createSpan(`runbook-node-${node.id}`, async (span) => {
      span.setAttributes({
        'node.id': node.id,
        'node.type': node.type,
        'node.name': node.name,
      });

      logger.debug(
        { nodeId: node.id, nodeName: node.name },
        'Executing DAG node',
      );

      try {
        // Collect inputs from dependencies
        const inputs = new Map<string, any>();
        for (const depId of node.dependencies) {
          if (nodeOutputs.has(depId)) {
            inputs.set(depId, nodeOutputs.get(depId));
          }
        }

        // Add base inputs
        if (nodeOutputs.has('input')) {
          inputs.set('input', nodeOutputs.get('input'));
        }

        // Execute node with timeout
        const output = await Promise.race([
          node.execute(context, inputs),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error(`Node ${node.id} timed out`)),
              node.timeout,
            ),
          ),
        ]);

        nodeOutputs.set(node.id, output);

        const duration = Date.now() - nodeStartTime;
        logger.debug(
          {
            nodeId: node.id,
            duration,
            outputSize: JSON.stringify(output).length,
          },
          'DAG node completed',
        );
      } catch (error) {
        logger.error({ nodeId: node.id, error }, 'DAG node failed');
        throw error;
      }
    });
  }

  // Node implementations
  private async enrichIndicators(
    context: DAGContext,
    inputs: Map<string, any>,
  ): Promise<ThreatIndicator[]> {
    const { indicators } = inputs.get('input') || {};
    const enrichedIndicators: ThreatIndicator[] = [];

    for (const indicator of indicators) {
      const enriched = { ...indicator };

      // Mock enrichment - in real implementation would call external APIs
      switch (indicator.type) {
        case 'ip':
          enriched.context = {
            geolocation: 'US',
            asn: 'AS15169',
            organization: 'Google LLC',
            reputation: 'clean',
            firstSeen: new Date(Date.now() - 86400000), // 1 day ago
          };
          break;
        case 'domain':
          enriched.context = {
            registrar: 'Example Registrar',
            createdDate: new Date(Date.now() - 2592000000), // 30 days ago
            nameservers: ['ns1.example.com', 'ns2.example.com'],
            reputation: 'suspicious',
          };
          break;
        case 'hash':
          enriched.context = {
            fileType: 'PE32',
            malwareFamily: 'TrojanDownloader',
            firstSubmission: new Date(Date.now() - 3600000), // 1 hour ago
            detectionRatio: '32/67',
          };
          break;
      }

      // Register as evidence
      const evidence = registerEvidence({
        contentHash: `enriched-${indicator.id}`,
        licenseId: 'threat-intel',
        source: 'Rapid Attribution Runbook',
        transforms: ['indicator_enrichment'],
      });
      context.evidence.set(`enriched-${indicator.id}`, evidence);

      enrichedIndicators.push(enriched);
    }

    context.metrics.evidenceCount += enrichedIndicators.length;
    return enrichedIndicators;
  }

  private async mapInfrastructure(
    context: DAGContext,
    inputs: Map<string, any>,
  ): Promise<InfrastructureEntity[]> {
    const indicators = inputs.get('indicator_enrichment') as ThreatIndicator[];
    const infrastructure: InfrastructureEntity[] = [];

    for (const indicator of indicators) {
      if (indicator.type === 'ip' || indicator.type === 'domain') {
        // Mock infrastructure discovery
        const entity: InfrastructureEntity = {
          id: `infra-${uuidv4()}`,
          type: indicator.type === 'ip' ? 'server' : 'service',
          properties: {
            value: indicator.value,
            hosting_provider: 'CloudFlare Inc.',
            location: 'United States',
            ssl_certificate: 'valid',
            open_ports: [80, 443, 8080],
            services: ['HTTP', 'HTTPS'],
          },
          relationships: [],
          riskScore: 0.7,
        };

        // Create relationships to other infrastructure
        for (const other of infrastructure) {
          if (Math.random() > 0.7) {
            // 30% chance of relationship
            entity.relationships.push({
              targetId: other.id,
              type: 'hosts',
              confidence: 0.8,
            });
          }
        }

        infrastructure.push(entity);

        // Register as evidence
        const evidence = registerEvidence({
          contentHash: `infra-${entity.id}`,
          licenseId: 'threat-intel',
          source: 'Infrastructure Mapping',
          transforms: ['indicator_enrichment', 'infrastructure_mapping'],
        });
        context.evidence.set(`infra-${entity.id}`, evidence);
      }
    }

    context.metrics.evidenceCount += infrastructure.length;
    return infrastructure;
  }

  private async analyzePatterns(
    context: DAGContext,
    inputs: Map<string, any>,
  ): Promise<any> {
    const infrastructure = inputs.get(
      'infrastructure_mapping',
    ) as InfrastructureEntity[];
    const indicators = inputs.get('indicator_enrichment') as ThreatIndicator[];

    // Mock pattern analysis
    const patterns = {
      clustering: {
        clusters: [
          {
            id: 'cluster-1',
            type: 'c2_infrastructure',
            entities: infrastructure
              .filter((i) => i.riskScore > 0.6)
              .map((i) => i.id),
            confidence: 0.85,
            characteristics: [
              'shared_hosting',
              'recent_registration',
              'suspicious_ssl',
            ],
          },
        ],
      },
      temporal: {
        timeline: indicators.map((i) => ({
          timestamp: i.firstSeen,
          event: `Indicator ${i.value} first observed`,
          type: i.type,
        })),
      },
      behavioral: {
        ttps: ['T1071.001', 'T1090', 'T1583.001'], // Common C2 techniques
        confidence: 0.78,
      },
    };

    // Create claim for pattern analysis
    const claim = createClaim({
      evidenceIds: Array.from(context.evidence.keys()),
      text: `Pattern analysis identified potential C2 infrastructure cluster with ${patterns.clustering.clusters[0].entities.length} entities`,
      confidence: 0.85,
      links: [],
    });
    context.claims.set('pattern-analysis', claim);

    return patterns;
  }

  private async mapToAttack(
    context: DAGContext,
    inputs: Map<string, any>,
  ): Promise<AttackMapping[]> {
    const patterns = inputs.get('pattern_analysis');

    // Mock ATT&CK mapping based on patterns
    const mappings: AttackMapping[] = [
      {
        techniqueId: 'T1071.001',
        techniqueName: 'Application Layer Protocol: Web Protocols',
        tactic: 'Command and Control',
        confidence: 0.9,
        evidence: [
          'HTTP/HTTPS traffic patterns',
          'Web-based C2 infrastructure',
        ],
        mitigations: [
          'M1031: Network Intrusion Prevention',
          'M1037: Filter Network Traffic',
        ],
      },
      {
        techniqueId: 'T1090',
        techniqueName: 'Proxy',
        tactic: 'Command and Control',
        confidence: 0.75,
        evidence: ['Multi-hop infrastructure', 'Proxy chains identified'],
        mitigations: [
          'M1037: Filter Network Traffic',
          'M1031: Network Intrusion Prevention',
        ],
      },
      {
        techniqueId: 'T1583.001',
        techniqueName: 'Acquire Infrastructure: Domains',
        tactic: 'Resource Development',
        confidence: 0.8,
        evidence: ['Recently registered domains', 'Suspicious domain patterns'],
        mitigations: [
          'M1056: Pre-compromise',
          'M1031: Network Intrusion Prevention',
        ],
      },
    ];

    // Create claim for ATT&CK mapping
    const claim = createClaim({
      evidenceIds: Array.from(context.evidence.keys()),
      text: `Mapped to ${mappings.length} ATT&CK techniques with average confidence ${mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length}`,
      confidence: 0.82,
      links: mappings.map(
        (m) => `https://attack.mitre.org/techniques/${m.techniqueId}`,
      ),
    });
    context.claims.set('attack-mapping', claim);

    return mappings;
  }

  private async generateNarrative(
    context: DAGContext,
    inputs: Map<string, any>,
  ): Promise<ThreatHypothesis> {
    const indicators = inputs.get('indicator_enrichment') as ThreatIndicator[];
    const infrastructure = inputs.get(
      'infrastructure_mapping',
    ) as InfrastructureEntity[];
    const patterns = inputs.get('pattern_analysis');
    const attackMappings = inputs.get('attack_mapping') as AttackMapping[];

    const hypothesis: ThreatHypothesis = {
      id: uuidv4(),
      title:
        'Rapid Attribution Analysis: Suspected Command & Control Infrastructure',
      summary: `Analysis of ${indicators.length} indicators revealed a potential command and control infrastructure cluster involving ${infrastructure.length} infrastructure entities. The activity maps to ${attackMappings.length} MITRE ATT&CK techniques with primary focus on web-based C2 communications.`,
      confidence:
        attackMappings.reduce((sum, m) => sum + m.confidence, 0) /
        attackMappings.length,
      attackTechniques: attackMappings,
      indicators,
      infrastructure,
      timeline: [
        {
          timestamp: new Date(
            Math.min(...indicators.map((i) => i.firstSeen.getTime())),
          ),
          event: 'First indicator observed',
          evidence: 'Initial threat intelligence reporting',
        },
        {
          timestamp: new Date(),
          event: 'Infrastructure analysis completed',
          evidence: 'Automated runbook execution',
        },
      ],
      recommendations: [
        'Block identified IP addresses and domains at network perimeter',
        'Monitor for additional infrastructure using similar patterns',
        'Implement detection rules for identified ATT&CK techniques',
        'Conduct threat hunting for similar TTPs in environment',
      ],
      citations: [
        'MITRE ATT&CK Framework v14.1',
        'IntelGraph Rapid Attribution Runbook R1',
        ...Array.from(context.evidence.keys()).map((k) => `Evidence: ${k}`),
      ],
    };

    // Create final claim for the hypothesis
    const claim = createClaim({
      evidenceIds: Array.from(context.evidence.keys()),
      text: hypothesis.summary,
      confidence: hypothesis.confidence,
      links: hypothesis.citations.slice(0, 3), // First 3 citations as links
    });
    context.claims.set('final-hypothesis', claim);

    context.metrics.confidenceScore = hypothesis.confidence;

    return hypothesis;
  }

  // Get runbook metadata
  getMetadata(): {
    id: string;
    name: string;
    description: string;
    version: string;
    nodeCount: number;
    estimatedDuration: string;
  } {
    return {
      id: 'rapid-attribution-r1',
      name: 'Rapid Attribution Runbook R1',
      description:
        'Automated threat attribution from indicators to ATT&CK techniques with evidence-first narrative generation',
      version: '1.0.0',
      nodeCount: this.nodes.size,
      estimatedDuration: '2-5 minutes',
    };
  }

  // Get execution logs for replay
  async getExecutionLogs(runId: string): Promise<any[]> {
    // In real implementation, would query logs by runId
    return [
      {
        timestamp: new Date(),
        level: 'info',
        message: 'Runbook execution started',
        runId,
      },
      {
        timestamp: new Date(),
        level: 'debug',
        message: 'Indicator enrichment completed',
        runId,
      },
      {
        timestamp: new Date(),
        level: 'debug',
        message: 'Infrastructure mapping completed',
        runId,
      },
      {
        timestamp: new Date(),
        level: 'debug',
        message: 'Pattern analysis completed',
        runId,
      },
      {
        timestamp: new Date(),
        level: 'debug',
        message: 'ATT&CK mapping completed',
        runId,
      },
      {
        timestamp: new Date(),
        level: 'info',
        message: 'Narrative generation completed',
        runId,
      },
    ];
  }
}

// Singleton instance
export const rapidAttributionRunbook = new RapidAttributionRunbook();
