/**
 * R1: Rapid Attribution Runbook Definition
 *
 * Workflow:
 * 1. Ingest Indicators - Load threat indicators from various sources
 * 2. Resolve Infrastructure - Map indicators to infrastructure entities
 * 3. Correlate ATT&CK - Map observed behaviors to ATT&CK framework
 * 4. Pattern Mining - Identify patterns and cluster related activity
 * 5. Generate Hypothesis Report - Create attribution hypothesis with evidence
 */

import { RunbookDefinition, RetryPolicy } from '../../../../runbooks/engine/src/types';

/**
 * Default retry policy for R1 steps
 */
const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE'],
};

/**
 * R1 Rapid Attribution Runbook
 */
export const R1_RAPID_ATTRIBUTION: RunbookDefinition = {
  id: 'r1-rapid-attribution',
  name: 'Rapid Attribution (CTI)',
  version: '1.0.0',
  description:
    'Automated cyber threat intelligence runbook for rapid attribution analysis. ' +
    'Ingests indicators, resolves infrastructure, correlates to ATT&CK framework, ' +
    'performs pattern mining, and generates evidence-backed attribution hypothesis.',
  defaultRetryPolicy: DEFAULT_RETRY_POLICY,
  globalTimeoutMs: 30 * 60 * 1000, // 30 minutes
  steps: [
    {
      id: 'ingest-indicators',
      name: 'Ingest Threat Indicators',
      description:
        'Load threat indicators (IPs, domains, hashes, URLs) from specified sources',
      type: 'cti:ingest-indicators',
      inputSchema: {
        type: 'object',
        properties: {
          sources: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['file', 'api', 'stix'] },
                location: { type: 'string' },
              },
            },
          },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          indicators: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                value: { type: 'string' },
                firstSeen: { type: 'string', format: 'date-time' },
                lastSeen: { type: 'string', format: 'date-time' },
                confidence: { type: 'number' },
              },
            },
          },
        },
      },
      dependsOn: [],
      config: {
        deduplication: true,
        validateFormat: true,
      },
      retryPolicy: DEFAULT_RETRY_POLICY,
      timeoutMs: 5 * 60 * 1000, // 5 minutes
    },
    {
      id: 'resolve-infrastructure',
      name: 'Resolve Infrastructure',
      description:
        'Enrich indicators with infrastructure data (WHOIS, DNS, geo-location, ASN)',
      type: 'cti:resolve-infrastructure',
      inputSchema: {
        type: 'object',
        properties: {
          'ingest-indicators': {
            type: 'object',
            properties: {
              indicators: { type: 'array' },
            },
          },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          entities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string' },
                properties: { type: 'object' },
              },
            },
          },
          relationships: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                from: { type: 'string' },
                to: { type: 'string' },
                type: { type: 'string' },
              },
            },
          },
        },
      },
      dependsOn: ['ingest-indicators'],
      config: {
        enrichmentSources: ['whois', 'dns', 'geoip', 'asn'],
        cacheResults: true,
      },
      retryPolicy: DEFAULT_RETRY_POLICY,
      timeoutMs: 10 * 60 * 1000, // 10 minutes
    },
    {
      id: 'correlate-attack',
      name: 'Correlate ATT&CK Techniques',
      description:
        'Map observed indicators and behaviors to MITRE ATT&CK techniques and tactics',
      type: 'cti:correlate-attack',
      inputSchema: {
        type: 'object',
        properties: {
          'ingest-indicators': {
            type: 'object',
            properties: {
              indicators: { type: 'array' },
            },
          },
          'resolve-infrastructure': {
            type: 'object',
            properties: {
              entities: { type: 'array' },
              relationships: { type: 'array' },
            },
          },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          techniques: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                techniqueId: { type: 'string' },
                tacticId: { type: 'string' },
                confidence: { type: 'number' },
                evidenceIds: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      dependsOn: ['ingest-indicators', 'resolve-infrastructure'],
      config: {
        attackVersion: '14.1',
        minimumConfidence: 0.5,
      },
      retryPolicy: DEFAULT_RETRY_POLICY,
      timeoutMs: 5 * 60 * 1000, // 5 minutes
    },
    {
      id: 'pattern-mining',
      name: 'Pattern Mining',
      description:
        'Identify patterns, clusters, and behavioral signatures across indicators and infrastructure',
      type: 'cti:pattern-mining',
      inputSchema: {
        type: 'object',
        properties: {
          'resolve-infrastructure': {
            type: 'object',
            properties: {
              entities: { type: 'array' },
              relationships: { type: 'array' },
            },
          },
          'correlate-attack': {
            type: 'object',
            properties: {
              techniques: { type: 'array' },
            },
          },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          patterns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string' },
                confidence: { type: 'number' },
                entities: { type: 'array', items: { type: 'string' } },
                signature: { type: 'object' },
              },
            },
          },
          clusters: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                members: { type: 'array', items: { type: 'string' } },
                centroid: { type: 'object' },
              },
            },
          },
        },
      },
      dependsOn: ['resolve-infrastructure', 'correlate-attack'],
      config: {
        algorithms: ['dbscan', 'kmeans', 'graph-clustering'],
        minimumClusterSize: 3,
      },
      retryPolicy: DEFAULT_RETRY_POLICY,
      timeoutMs: 10 * 60 * 1000, // 10 minutes
    },
    {
      id: 'generate-hypothesis',
      name: 'Generate Attribution Hypothesis',
      description:
        'Generate evidence-backed attribution hypothesis report with threat actor identification and confidence scoring',
      type: 'cti:generate-hypothesis',
      inputSchema: {
        type: 'object',
        properties: {
          'ingest-indicators': {
            type: 'object',
            properties: {
              indicators: { type: 'array' },
            },
          },
          'resolve-infrastructure': {
            type: 'object',
            properties: {
              entities: { type: 'array' },
              relationships: { type: 'array' },
            },
          },
          'correlate-attack': {
            type: 'object',
            properties: {
              techniques: { type: 'array' },
            },
          },
          'pattern-mining': {
            type: 'object',
            properties: {
              patterns: { type: 'array' },
              clusters: { type: 'array' },
            },
          },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          hypotheses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                threatActor: { type: 'string' },
                confidence: { type: 'number' },
                evidenceIds: { type: 'array', items: { type: 'string' } },
                reasoning: { type: 'string' },
                techniques: { type: 'array', items: { type: 'string' } },
                infrastructure: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          report: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              summary: { type: 'string' },
              confidence: { type: 'number' },
              evidenceCount: { type: 'number' },
              recommendations: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
      dependsOn: [
        'ingest-indicators',
        'resolve-infrastructure',
        'correlate-attack',
        'pattern-mining',
      ],
      config: {
        minimumEvidenceCount: 3,
        confidenceThreshold: 0.6,
        includeTimeline: true,
      },
      retryPolicy: DEFAULT_RETRY_POLICY,
      timeoutMs: 5 * 60 * 1000, // 5 minutes
    },
  ],
  metadata: {
    category: 'CTI',
    tags: ['threat-intelligence', 'attribution', 'automated'],
    author: 'IntelGraph CTI Team',
    kpis: {
      timeToHypothesis: '< 30 minutes',
      minimumEvidencePerClaim: 3,
      minimumConfidence: 0.6,
    },
  },
};
