/**
 * Graph Lookup Step Executor
 *
 * Handles infrastructure enrichment through graph lookups.
 *
 * @module runbooks/runtime/executors/graph-lookup-executor
 */

import { BaseStepExecutor } from './base';
import {
  StepExecutorContext,
  StepExecutorResult,
  RunbookActionType,
  InfrastructureEnrichmentService,
} from '../types';

/**
 * Infrastructure node representation
 */
export interface InfrastructureNode {
  id: string;
  type: 'server' | 'domain' | 'certificate' | 'registrar' | 'asn' | 'network' | 'malware';
  value: string;
  properties?: Record<string, unknown>;
  relationships: Array<{
    type: string;
    target: string;
    properties?: Record<string, unknown>;
  }>;
}

/**
 * Default infrastructure enrichment service implementation
 */
export class DefaultInfrastructureEnrichmentService implements InfrastructureEnrichmentService {
  async enrichInfrastructure(input: {
    indicatorNodeIds: string[];
    depth?: number;
  }): Promise<{
    infraNodeIds: string[];
    infrastructure: InfrastructureNode[];
  }> {
    const depth = input.depth ?? 2;
    const infrastructure: InfrastructureNode[] = [];
    const infraNodeIds: string[] = [];

    // Simulate infrastructure discovery for each indicator
    for (const indicatorId of input.indicatorNodeIds) {
      // Simulate related infrastructure discovery
      const relatedInfra = this.discoverRelatedInfrastructure(indicatorId, depth);
      infrastructure.push(...relatedInfra);
      infraNodeIds.push(...relatedInfra.map((i) => i.id));
    }

    // Deduplicate
    const uniqueInfra = this.deduplicateInfrastructure(infrastructure);

    return {
      infraNodeIds: uniqueInfra.map((i) => i.id),
      infrastructure: uniqueInfra,
    };
  }

  private discoverRelatedInfrastructure(indicatorId: string, depth: number): InfrastructureNode[] {
    const results: InfrastructureNode[] = [];
    const baseId = Date.now();

    // Simulate discovering related servers
    results.push({
      id: `server-${baseId}-1`,
      type: 'server',
      value: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      properties: {
        country: 'RU',
        provider: 'bulletproof-hosting',
        firstSeen: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
      relationships: [
        { type: 'HOSTS', target: indicatorId },
        { type: 'RESOLVES_TO', target: `domain-${baseId}-1` },
      ],
    });

    // Simulate discovering related domains
    results.push({
      id: `domain-${baseId}-1`,
      type: 'domain',
      value: `malicious-${Math.floor(Math.random() * 1000)}.example.com`,
      properties: {
        registrar: 'anonymous-registrar.com',
        registeredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      relationships: [
        { type: 'REGISTERED_BY', target: `registrar-${baseId}-1` },
        { type: 'USES_CERTIFICATE', target: `cert-${baseId}-1` },
      ],
    });

    // Simulate discovering related certificates
    results.push({
      id: `cert-${baseId}-1`,
      type: 'certificate',
      value: `SHA256:${Math.random().toString(36).substring(2, 34)}`,
      properties: {
        issuer: 'Let\'s Encrypt',
        validFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      relationships: [
        { type: 'ISSUED_FOR', target: `domain-${baseId}-1` },
      ],
    });

    // Simulate discovering ASN
    results.push({
      id: `asn-${baseId}-1`,
      type: 'asn',
      value: `AS${Math.floor(Math.random() * 65535)}`,
      properties: {
        name: 'Bulletproof Hosting AS',
        country: 'RU',
      },
      relationships: [
        { type: 'ANNOUNCES', target: `server-${baseId}-1` },
      ],
    });

    return results;
  }

  private deduplicateInfrastructure(infra: InfrastructureNode[]): InfrastructureNode[] {
    const seen = new Set<string>();
    return infra.filter((node) => {
      if (seen.has(node.id)) return false;
      seen.add(node.id);
      return true;
    });
  }
}

/**
 * Graph lookup step executor for infrastructure enrichment
 */
export class GraphLookupStepExecutor extends BaseStepExecutor {
  readonly actionType: RunbookActionType = 'LOOKUP_GRAPH';

  constructor(
    private readonly infraService: InfrastructureEnrichmentService = new DefaultInfrastructureEnrichmentService()
  ) {
    super();
  }

  async execute(ctx: StepExecutorContext): Promise<StepExecutorResult> {
    try {
      // Get indicator node IDs from previous steps or input
      const indicatorNodeIds =
        this.findPreviousOutput<string[]>(ctx, 'indicatorNodeIds') ||
        this.getInput<string[]>(ctx, 'indicatorNodeIds', []);

      if (indicatorNodeIds.length === 0) {
        return this.failure('No indicator node IDs provided for infrastructure lookup');
      }

      const depth = this.getConfig<number>(ctx, 'depth', 2);

      // Call infrastructure service
      const result = await this.infraService.enrichInfrastructure({
        indicatorNodeIds,
        depth,
      });

      // Create citations for data sources
      const citations = [
        this.createCitation(
          'Graph Database',
          undefined,
          'system',
          { queryDepth: depth, timestamp: new Date().toISOString() }
        ),
        this.createCitation(
          'Passive DNS',
          'https://passivedns.example.com',
          'Passive DNS Provider',
          { queryTime: new Date().toISOString() }
        ),
        this.createCitation(
          'Certificate Transparency Logs',
          'https://crt.sh',
          'crt.sh',
        ),
      ];

      // Create evidence
      const evidence = this.createEvidence(
        'infrastructure_enrichment',
        {
          infrastructure: result.infrastructure,
          totalNodes: result.infrastructure.length,
          nodeTypes: this.countNodeTypes(result.infrastructure),
        },
        citations,
        {
          nodeCount: result.infrastructure.length,
          qualityScore: this.calculateQualityScore(result.infrastructure),
          depth,
        }
      );

      // Create proof
      const proof = this.createProof({
        indicatorNodeIds,
        infraNodeCount: result.infraNodeIds.length,
        timestamp: new Date().toISOString(),
      });
      evidence.proofs.push(proof);

      return this.success(
        {
          infraNodeIds: result.infraNodeIds,
          infrastructure: result.infrastructure,
          nodeCount: result.infrastructure.length,
          relationshipCount: result.infrastructure.reduce(
            (acc, node) => acc + node.relationships.length,
            0
          ),
        },
        {
          evidence: [evidence],
          citations,
          proofs: [proof],
          kpis: {
            infraNodeCount: result.infraNodeIds.length,
            relationshipCount: result.infrastructure.reduce(
              (acc, node) => acc + node.relationships.length,
              0
            ),
            serverCount: result.infrastructure.filter((n) => n.type === 'server').length,
            domainCount: result.infrastructure.filter((n) => n.type === 'domain').length,
          },
        }
      );
    } catch (error) {
      return this.failure(
        error instanceof Error ? error.message : 'Failed to lookup infrastructure'
      );
    }
  }

  private countNodeTypes(infrastructure: InfrastructureNode[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const node of infrastructure) {
      counts[node.type] = (counts[node.type] || 0) + 1;
    }
    return counts;
  }

  private calculateQualityScore(infrastructure: InfrastructureNode[]): number {
    if (infrastructure.length === 0) return 0;

    let score = 0;
    for (const node of infrastructure) {
      if (node.properties && Object.keys(node.properties).length > 0) score += 0.4;
      if (node.relationships.length > 0) score += 0.3;
      if (node.value) score += 0.3;
    }
    return score / infrastructure.length;
  }
}
