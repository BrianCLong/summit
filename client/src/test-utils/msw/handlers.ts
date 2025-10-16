// @ts-nocheck
import { graphql } from 'msw';

// MSW GraphQL handlers for testing
export const handlers = [
  // ServerStats query
  graphql.query('ServerStats', (req: any, res: any, ctx: any) => {
    return res(ctx.data({
      
        serverStats: {
          uptime: '2d 14h 32m',
          totalInvestigations: 128,
          totalEntities: 42137,
          totalRelationships: 89542,
          databaseStatus: {
            redis: 'connected',
            postgres: 'connected',
            neo4j: 'connected',
          },
        },
      
    }));
  }),

  // Investigations query
  graphql.query('Investigations', (req: any, res: any, ctx: any) => {
    return res(ctx.data({
        getInvestigations: [
          {
            id: '1',
            name: 'APT29 Campaign Analysis',
            description: 'Analysis of APT29 attack patterns',
            status: 'active',
            createdAt: '2024-01-15T10:00:00Z',
            nodeCount: 1205,
            edgeCount: 2341,
          },
          {
            id: '2',
            name: 'Financial Fraud Investigation',
            description: 'Complex financial fraud case',
            status: 'closed',
            createdAt: '2024-01-10T08:30:00Z',
            nodeCount: 856,
            edgeCount: 1678,
          },
        ],
      }));
  }),

  // GraphData query for Graph Workbench
  graphql.query('GW_GraphData', (req: any, res: any, ctx: any) => {
    return res(
      ctx.data({
        graphData: {
          nodes: [
            {
              id: 'entity-1',
              type: 'Person',
              label: 'John Doe',
              description: 'Suspected threat actor',
              properties: { email: 'john.doe@example.com' },
              confidence: 0.85,
              source: 'OSINT',
            },
            {
              id: 'entity-2',
              type: 'Domain',
              label: 'malicious-site.com',
              description: 'Known malicious domain',
              properties: { registrar: 'Evil Corp' },
              confidence: 0.95,
              source: 'Threat Feed',
            },
            {
              id: 'entity-3',
              type: 'IPAddress',
              label: '192.168.1.100',
              description: 'Suspicious IP address',
              properties: { country: 'Unknown' },
              confidence: 0.75,
              source: 'Network Logs',
            },
          ],
          edges: [
            {
              id: 'rel-1',
              type: 'CONNECTS_TO',
              label: 'connects to',
              description: 'Network connection',
              properties: { frequency: 'high' },
              confidence: 0.8,
              source: 'Network Analysis',
              fromEntityId: 'entity-1',
              toEntityId: 'entity-2',
            },
            {
              id: 'rel-2',
              type: 'RESOLVES_TO',
              label: 'resolves to',
              description: 'DNS resolution',
              properties: { ttl: 300 },
              confidence: 0.9,
              source: 'DNS Logs',
              fromEntityId: 'entity-2',
              toEntityId: 'entity-3',
            },
          ],
          nodeCount: 3,
          edgeCount: 2,
        },
      })
    );
  }),

  // SearchEntities query
  graphql.query('GW_SearchEntities', (req: any, res: any, ctx: any) => {
    return res(ctx.data({
      searchEntities: [
          {
            id: 'search-1',
            type: 'Person',
            label: 'Jane Smith',
            description: 'Analyst',
            properties: { department: 'Security' },
            confidence: 0.9,
            source: 'HR System',
            investigationId: 'default',
          },
        ],
      }));
  }),

  // EntityDetails query
  graphql.query('GW_EntityDetails', (req: any, res: any, ctx: any) => {
    const { variables } = req;
    return res(ctx.data({
        getEntityDetails: {
          id: (variables as any).entityId,
          type: 'Person',
          label: 'Entity Details',
          description: 'Detailed entity information',
          properties: { key: 'value' },
          confidence: 0.85,
          source: 'Test Source',
          investigationId: 'default',
          createdBy: 'test-user',
          updatedBy: 'test-user',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T12:00:00Z',
          attack_ttps: ['T1566.001'],
          capec_ttps: ['CAPEC-163'],
          triage_score: 0.75,
          actor_links: ['APT29'],
        },
      
    }));
  }),

  // Health check
  graphql.query('HealthCheck', (req: any, res: any, ctx: any) => {
    return res(ctx.data({
        health: 'OK',
      
    }));
  }),

  // Threat Analysis
  graphql.query('ThreatAnalysis', (req: any, res: any, ctx: any) => {
    const { variables } = req;
    return res(ctx.data({
      threatAnalysis: {
          entityId: (variables as any).entityId,
          riskScore: 0.85,
          threatLevel: 'HIGH',
          mitreAttacks: [
            {
              technique: 'T1566.001',
              tactic: 'Initial Access',
              description: 'Spearphishing Attachment',
              severity: 'HIGH',
              confidence: 0.9,
            },
          ],
          vulnerabilities: [
            {
              cve: 'CVE-2024-1234',
              severity: 'CRITICAL',
              description: 'Remote code execution vulnerability',
              exploitable: true,
              patchAvailable: false,
            },
          ],
          recommendations: [
            'Block suspicious IP addresses',
            'Update security signatures',
            'Monitor network traffic',
          ],
          lastUpdated: '2024-01-15T15:30:00Z',
        },
      },
    }));
  }),

  // Timeline Events
  graphql.query('TimelineEvents', (req: any, res: any, ctx: any) => {
    return res(
      ctx.data({
        timelineEvents: [
          {
            id: 'event-1',
            timestamp: '2024-01-15T10:00:00Z',
            eventType: 'NETWORK_CONNECTION',
            entityId: 'entity-1',
            description: 'Suspicious network connection detected',
            severity: 'HIGH',
            source: 'Network Monitor',
            metadata: { bytes_transferred: 1024000 },
          },
        ],
      })
    );
  }),

  // Entity Enrichment
  graphql.query('EntityEnrichment', (req: any, res: any, ctx: any) => {
    const { variables } = req;
    return res(ctx.data({
        entityEnrichment: {
          entityId: (variables as any).entityId,
          externalSources: [
            {
              source: 'VirusTotal',
              data: { malicious: true, detection_ratio: '45/67' },
              confidence: 0.95,
              lastUpdated: '2024-01-15T14:00:00Z',
            },
          ],
          geolocation: {
            country: 'Russia',
            city: 'Moscow',
            latitude: 55.7558,
            longitude: 37.6173,
            accuracy: 0.8,
          },
          reputation: {
            score: 0.15,
            category: 'MALICIOUS',
            sources: ['VirusTotal', 'IBM X-Force'],
            lastChecked: '2024-01-15T14:00:00Z',
          },
          relatedEntities: [
            {
              id: 'related-1',
              type: 'Domain',
              label: 'related-domain.com',
              description: 'Related malicious domain',
            },
          ],
          lastEnriched: '2024-01-15T14:00:00Z',
        },
      
    }));
  }),
];
