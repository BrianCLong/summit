/**
 * R3: Disinformation Network Mapping
 *
 * Runbook for mapping and analyzing networks that propagate disinformation.
 *
 * Workflow:
 * 1. Collect disinformation samples from various platforms
 * 2. Extract entities, narratives, and claims
 * 3. Map propagation networks (accounts, amplifiers, communities)
 * 4. Analyze coordination patterns and influence metrics
 * 5. Generate network map with attribution and citations
 *
 * Preconditions:
 * - Legal basis: Public task or legitimate interests (public safety)
 * - Data license: Compatible with research and public interest analysis
 *
 * Postconditions:
 * - KPIs: Network coverage >= 75%, at least 3 coordination patterns identified
 * - Citations: All content samples cited with timestamps and source links
 * - Proofs: Cryptographic hashes of all analyzed content
 *
 * Benchmark: 15 minutes end-to-end
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
 * Disinformation content sample
 */
interface ContentSample {
  id: string;
  platform: string;
  author: string;
  authorId: string;
  content: string;
  url: string;
  timestamp: Date;
  engagementMetrics: {
    likes?: number;
    shares?: number;
    comments?: number;
    views?: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Narrative claim
 */
interface NarrativeClaim {
  id: string;
  claim: string;
  narrative: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  samples: string[]; // Content sample IDs
}

/**
 * Network node (account/entity)
 */
interface NetworkNode {
  id: string;
  type: 'author' | 'amplifier' | 'community';
  name: string;
  platform: string;
  influence: number; // 0-1 score
  contentCount: number;
  narratives: string[]; // Narrative IDs
}

/**
 * Network edge (relationship)
 */
interface NetworkEdge {
  source: string; // Node ID
  target: string; // Node ID
  type: 'retweet' | 'reply' | 'mention' | 'share' | 'coordination';
  weight: number; // Strength of relationship
  samples: string[]; // Content sample IDs demonstrating relationship
}

/**
 * Coordination pattern
 */
interface CoordinationPattern {
  id: string;
  type: 'temporal' | 'linguistic' | 'behavioral' | 'network';
  description: string;
  nodes: string[]; // Network node IDs
  confidence: number;
  evidence: string[]; // Content sample IDs
}

/**
 * Create R3: Disinformation Network Mapping runbook
 */
export function createR3DisinformationNetworkRunbook(): RunbookDAG {
  const nodes: DAGNode[] = [
    // Node 1: Collect Disinformation Samples
    {
      id: 'collect-samples',
      name: 'Collect Disinformation Samples',
      description: 'Collect disinformation content samples from target platforms',
      dependencies: [],
      preconditions: [
        GateFactory.legalBasisGate(
          [LegalBasis.PUBLIC_TASK, LegalBasis.LEGITIMATE_INTERESTS],
          'Disinformation analysis requires public interest or legitimate basis',
        ),
        GateFactory.dataLicenseGate(
          [DataLicense.CC_BY, DataLicense.CC_BY_SA, DataLicense.PUBLIC_DOMAIN],
          'Content must have compatible research license',
        ),
      ],
      postconditions: [
        GateFactory.kpiGate('sampleCount', 10, 'gte', 'Must collect at least 10 content samples'),
        GateFactory.citationGate(1, true, true, 'All samples must be cited with URLs and timestamps'),
      ],
      execute: async (context: RunbookContext): Promise<NodeExecutionResult> => {
        const startTime = Date.now();

        // Collect content samples from input
        const samples: ContentSample[] = context.input.samples || [];

        // Generate citations and proofs for each sample
        const citations: Citation[] = [];
        const proofs: CryptographicProof[] = [];

        for (const sample of samples) {
          // Create citation
          citations.push(
            CitationValidator.createCitation(
              `${sample.platform} - @${sample.author}`,
              sample.url,
              sample.author,
              {
                platform: sample.platform,
                authorId: sample.authorId,
                timestamp: sample.timestamp.toISOString(),
              },
            ),
          );

          // Create content hash for proof
          const contentHash = createHash('sha256')
            .update(sample.content)
            .digest('hex');

          proofs.push({
            algorithm: 'sha256',
            signature: contentHash,
            timestamp: new Date(),
          });
        }

        context.state.set('samples', samples);

        const evidence: Evidence = {
          id: `evidence-content-samples-${Date.now()}`,
          type: 'disinformation_samples',
          data: { samples },
          citations,
          proofs,
          collectedAt: new Date(),
          metadata: {
            sampleCount: samples.length,
            platforms: [...new Set(samples.map((s) => s.platform))],
            qualityScore: 0.9,
          },
        };

        return {
          success: true,
          evidence: [evidence],
          citations,
          proofs,
          kpis: {
            sampleCount: samples.length,
          },
          duration: Date.now() - startTime,
        };
      },
      estimatedDuration: 90000, // 90 seconds
    },

    // Node 2: Extract Narratives and Claims
    {
      id: 'extract-narratives',
      name: 'Extract Narratives and Claims',
      description: 'Identify and extract disinformation narratives and specific claims',
      dependencies: ['collect-samples'],
      preconditions: [],
      postconditions: [
        GateFactory.kpiGate('narrativeCount', 2, 'gte', 'Must identify at least 2 narratives'),
      ],
      execute: async (context: RunbookContext): Promise<NodeExecutionResult> => {
        const startTime = Date.now();
        const samples = context.state.get('samples') as ContentSample[];

        // Extract narratives (simplified NLP analysis)
        const narratives: NarrativeClaim[] = [];

        // Simulate narrative extraction
        const commonNarratives = [
          'Election fraud',
          'Health misinformation',
          'Climate denial',
          'Conspiracy theories',
          'Foreign interference',
        ];

        for (const narrativeText of commonNarratives) {
          const matchingSamples = samples.filter((s) =>
            s.content.toLowerCase().includes(narrativeText.toLowerCase().split(' ')[0]),
          );

          if (matchingSamples.length > 0) {
            narratives.push({
              id: `narrative-${narratives.length}`,
              claim: `Claims related to ${narrativeText}`,
              narrative: narrativeText,
              sentiment: Math.random() > 0.5 ? 'negative' : 'neutral',
              confidence: 0.7 + Math.random() * 0.25,
              samples: matchingSamples.map((s) => s.id),
            });
          }
        }

        context.state.set('narratives', narratives);

        const citations: Citation[] = [
          CitationValidator.createCitation(
            'Narrative Analysis Methodology',
            'https://datasociety.net/library/narrative-analysis/',
            'Data & Society Research Institute',
          ),
        ];

        const evidence: Evidence = {
          id: `evidence-narratives-${Date.now()}`,
          type: 'narrative_analysis',
          data: { narratives },
          citations,
          proofs: [],
          collectedAt: new Date(),
          metadata: {
            narrativeCount: narratives.length,
            qualityScore: 0.85,
          },
        };

        return {
          success: true,
          evidence: [evidence],
          citations,
          proofs: [],
          kpis: {
            narrativeCount: narratives.length,
          },
          duration: Date.now() - startTime,
        };
      },
      estimatedDuration: 120000, // 120 seconds
    },

    // Node 3: Map Propagation Network
    {
      id: 'map-network',
      name: 'Map Propagation Network',
      description: 'Build network graph of accounts and relationships',
      dependencies: ['extract-narratives'],
      preconditions: [],
      postconditions: [
        GateFactory.kpiGate('nodeCount', 5, 'gte', 'Network must have at least 5 nodes'),
        GateFactory.kpiGate('edgeCount', 3, 'gte', 'Network must have at least 3 edges'),
      ],
      execute: async (context: RunbookContext): Promise<NodeExecutionResult> => {
        const startTime = Date.now();
        const samples = context.state.get('samples') as ContentSample[];
        const narratives = context.state.get('narratives') as NarrativeClaim[];

        // Build network nodes
        const nodeMap = new Map<string, NetworkNode>();

        for (const sample of samples) {
          const nodeId = `${sample.platform}-${sample.authorId}`;

          if (!nodeMap.has(nodeId)) {
            // Calculate influence based on engagement
            const totalEngagement =
              (sample.engagementMetrics.likes || 0) +
              (sample.engagementMetrics.shares || 0) * 2 +
              (sample.engagementMetrics.comments || 0);

            const influence = Math.min(1, totalEngagement / 10000);

            nodeMap.set(nodeId, {
              id: nodeId,
              type: influence > 0.7 ? 'amplifier' : 'author',
              name: sample.author,
              platform: sample.platform,
              influence,
              contentCount: 1,
              narratives: narratives
                .filter((n) => n.samples.includes(sample.id))
                .map((n) => n.id),
            });
          } else {
            const node = nodeMap.get(nodeId)!;
            node.contentCount++;
          }
        }

        const networkNodes = Array.from(nodeMap.values());

        // Build edges (simplified - based on shared narratives)
        const edges: NetworkEdge[] = [];

        for (let i = 0; i < networkNodes.length; i++) {
          for (let j = i + 1; j < networkNodes.length; j++) {
            const node1 = networkNodes[i];
            const node2 = networkNodes[j];

            // Check for shared narratives
            const sharedNarratives = node1.narratives.filter((n) =>
              node2.narratives.includes(n),
            );

            if (sharedNarratives.length > 0) {
              edges.push({
                source: node1.id,
                target: node2.id,
                type: 'coordination',
                weight: sharedNarratives.length / Math.max(node1.narratives.length, node2.narratives.length),
                samples: [], // Would contain actual interaction samples
              });
            }
          }
        }

        context.state.set('networkNodes', networkNodes);
        context.state.set('networkEdges', edges);

        const citations: Citation[] = [
          CitationValidator.createCitation(
            'Social Network Analysis Methods',
            'https://en.wikipedia.org/wiki/Social_network_analysis',
            'Academic Research',
          ),
        ];

        const evidence: Evidence = {
          id: `evidence-network-${Date.now()}`,
          type: 'propagation_network',
          data: {
            nodes: networkNodes,
            edges,
          },
          citations,
          proofs: [],
          collectedAt: new Date(),
          metadata: {
            nodeCount: networkNodes.length,
            edgeCount: edges.length,
            qualityScore: 0.87,
          },
        };

        return {
          success: true,
          evidence: [evidence],
          citations,
          proofs: [],
          kpis: {
            nodeCount: networkNodes.length,
            edgeCount: edges.length,
          },
          duration: Date.now() - startTime,
        };
      },
      estimatedDuration: 180000, // 180 seconds
    },

    // Node 4: Analyze Coordination Patterns
    {
      id: 'analyze-coordination',
      name: 'Analyze Coordination Patterns',
      description: 'Identify coordinated behavior patterns in the network',
      dependencies: ['map-network'],
      preconditions: [],
      postconditions: [
        GateFactory.kpiGate(
          'coordinationPatternCount',
          3,
          'gte',
          'Must identify at least 3 coordination patterns',
        ),
      ],
      execute: async (context: RunbookContext): Promise<NodeExecutionResult> => {
        const startTime = Date.now();
        const samples = context.state.get('samples') as ContentSample[];
        const networkNodes = context.state.get('networkNodes') as NetworkNode[];
        const networkEdges = context.state.get('networkEdges') as NetworkEdge[];

        // Detect coordination patterns
        const patterns: CoordinationPattern[] = [];

        // Pattern 1: Temporal coordination (posts within same time window)
        const timeWindows = new Map<number, ContentSample[]>();
        const WINDOW_SIZE = 60 * 60 * 1000; // 1 hour

        for (const sample of samples) {
          const window = Math.floor(sample.timestamp.getTime() / WINDOW_SIZE);
          const existing = timeWindows.get(window) || [];
          existing.push(sample);
          timeWindows.set(window, existing);
        }

        for (const [window, windowSamples] of timeWindows.entries()) {
          if (windowSamples.length >= 3) {
            patterns.push({
              id: `pattern-temporal-${window}`,
              type: 'temporal',
              description: `${windowSamples.length} posts within 1-hour window`,
              nodes: [
                ...new Set(
                  windowSamples.map((s) => `${s.platform}-${s.authorId}`),
                ),
              ],
              confidence: Math.min(0.95, windowSamples.length / 10),
              evidence: windowSamples.map((s) => s.id),
            });
          }
        }

        // Pattern 2: Linguistic coordination (similar content)
        // Simplified: group by common keywords
        const keywordGroups = new Map<string, ContentSample[]>();

        for (const sample of samples) {
          const keywords = sample.content
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 5);

          for (const keyword of keywords) {
            const existing = keywordGroups.get(keyword) || [];
            existing.push(sample);
            keywordGroups.set(keyword, existing);
          }
        }

        for (const [keyword, keywordSamples] of keywordGroups.entries()) {
          if (keywordSamples.length >= 4) {
            patterns.push({
              id: `pattern-linguistic-${keyword}`,
              type: 'linguistic',
              description: `${keywordSamples.length} posts with similar language pattern`,
              nodes: [
                ...new Set(
                  keywordSamples.map((s) => `${s.platform}-${s.authorId}`),
                ),
              ],
              confidence: 0.75,
              evidence: keywordSamples.map((s) => s.id),
            });
          }
        }

        // Pattern 3: Network coordination (densely connected subgraphs)
        const denseClusters = networkEdges.filter((e) => e.weight > 0.7);

        if (denseClusters.length >= 3) {
          patterns.push({
            id: 'pattern-network-dense',
            type: 'network',
            description: `Dense coordination cluster with ${denseClusters.length} strong connections`,
            nodes: [
              ...new Set(denseClusters.flatMap((e) => [e.source, e.target])),
            ],
            confidence: 0.82,
            evidence: denseClusters.flatMap((e) => e.samples),
          });
        }

        context.state.set('coordinationPatterns', patterns);

        const citations: Citation[] = [
          CitationValidator.createCitation(
            'Coordinated Inauthentic Behavior Detection',
            'https://arxiv.org/abs/2001.00129',
            'Academic Research',
          ),
        ];

        const evidence: Evidence = {
          id: `evidence-coordination-${Date.now()}`,
          type: 'coordination_patterns',
          data: { patterns },
          citations,
          proofs: [],
          collectedAt: new Date(),
          metadata: {
            coordinationPatternCount: patterns.length,
            qualityScore: 0.83,
          },
        };

        return {
          success: true,
          evidence: [evidence],
          citations,
          proofs: [],
          kpis: {
            coordinationPatternCount: patterns.length,
          },
          duration: Date.now() - startTime,
        };
      },
      estimatedDuration: 150000, // 150 seconds
    },

    // Node 5: Generate Network Map Report
    {
      id: 'generate-network-map',
      name: 'Generate Network Map Report',
      description: 'Generate comprehensive network map with attribution and influence metrics',
      dependencies: ['analyze-coordination'],
      preconditions: [],
      postconditions: [
        GateFactory.kpiGate('networkCoverage', 0.75, 'gte', 'Network coverage must be >= 75%'),
        GateFactory.citationGate(
          5,
          true,
          true,
          'Network map must cite at least 5 sources',
        ),
        GateFactory.proofGate(true, false, 'Network map must include cryptographic proof'),
      ],
      execute: async (context: RunbookContext): Promise<NodeExecutionResult> => {
        const startTime = Date.now();
        const samples = context.state.get('samples') as ContentSample[];
        const narratives = context.state.get('narratives') as NarrativeClaim[];
        const networkNodes = context.state.get('networkNodes') as NetworkNode[];
        const networkEdges = context.state.get('networkEdges') as NetworkEdge[];
        const coordinationPatterns = context.state.get(
          'coordinationPatterns',
        ) as CoordinationPattern[];

        // Calculate network coverage
        const totalPossibleEdges = (networkNodes.length * (networkNodes.length - 1)) / 2;
        const networkCoverage = networkEdges.length / totalPossibleEdges;

        // Generate network map report
        const networkMap = {
          title: 'Disinformation Network Mapping Analysis',
          executionId: context.executionId,
          analyst: context.userId,
          generatedAt: new Date(),
          summary: {
            totalSamples: samples.length,
            narrativeCount: narratives.length,
            nodeCount: networkNodes.length,
            edgeCount: networkEdges.length,
            coordinationPatternCount: coordinationPatterns.length,
            networkCoverage,
            platforms: [...new Set(samples.map((s) => s.platform))],
          },
          narratives,
          network: {
            nodes: networkNodes,
            edges: networkEdges,
          },
          coordinationPatterns,
          influenceRanking: networkNodes
            .sort((a, b) => b.influence - a.influence)
            .slice(0, 10)
            .map((n) => ({
              name: n.name,
              platform: n.platform,
              influence: n.influence,
              contentCount: n.contentCount,
            })),
          recommendations: [
            'Monitor high-influence amplifiers for continued activity',
            'Report coordinated inauthentic behavior to platforms',
            'Develop counter-narrative messaging',
            'Track narrative evolution over time',
          ],
        };

        context.state.set('networkMap', networkMap);

        // Generate cryptographic proof
        const mapHash = createHash('sha256')
          .update(JSON.stringify(networkMap))
          .digest('hex');

        const proof: CryptographicProof = {
          algorithm: 'sha256',
          signature: mapHash,
          timestamp: new Date(),
        };

        // Collect all citations
        const allCitations = context.citations;

        const evidence: Evidence = {
          id: `evidence-network-map-${Date.now()}`,
          type: 'network_map_report',
          data: networkMap,
          citations: allCitations,
          proofs: [proof],
          collectedAt: new Date(),
          metadata: {
            networkCoverage,
            qualityScore: networkCoverage,
          },
        };

        return {
          success: true,
          evidence: [evidence],
          citations: allCitations,
          proofs: [proof],
          kpis: {
            networkCoverage,
          },
          duration: Date.now() - startTime,
        };
      },
      estimatedDuration: 60000, // 60 seconds
    },
  ];

  return {
    id: 'r3-disinformation-network',
    name: 'R3: Disinformation Network Mapping',
    description: 'Map and analyze networks that propagate disinformation',
    version: '1.0.0',
    nodes,
    benchmarks: {
      total: 900000, // 15 minutes
      perNode: {
        'collect-samples': 90000,
        'extract-narratives': 120000,
        'map-network': 180000,
        'analyze-coordination': 150000,
        'generate-network-map': 60000,
      },
    },
    publicationGates: [
      GateFactory.citationGate(
        5,
        true,
        true,
        'Publication requires at least 5 cited sources',
      ),
      GateFactory.kpiGate(
        'networkCoverage',
        0.75,
        'gte',
        'Publication requires network coverage >= 75%',
      ),
      GateFactory.kpiGate(
        'coordinationPatternCount',
        3,
        'gte',
        'Publication requires at least 3 coordination patterns',
      ),
      GateFactory.proofGate(true, false, 'Publication requires cryptographic proof'),
    ],
    metadata: {
      category: 'Disinformation Analysis',
      sensitivity: 'high',
      retentionYears: 7,
    },
  };
}
