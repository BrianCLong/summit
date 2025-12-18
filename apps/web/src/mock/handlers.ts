import { http, HttpResponse } from 'msw'
import mockData from './data.json'

// Conductor Metrics Shape
const conductorMetrics = {
  routing: {
    totalRequests: 1250,
    successRate: 0.998,
    avgLatency: 45.2,
    expertDistribution: {
      'gpt-4': 0.4,
      'claude-3': 0.3,
      'local-llama': 0.3
    },
    qualityGatesPassed: 1240,
    costEfficiency: 0.85,
    timeSeriesData: []
  },
  webOrchestration: {
    activeInterfaces: 3,
    synthesisQuality: 0.92,
    complianceScore: 1.0,
    citationCoverage: 0.98,
    contradictionRate: 0.01,
    interfacePerformance: {}
  },
  premiumModels: {
    utilizationRate: 0.75,
    costSavings: 120.50,
    qualityImprovement: 0.15,
    modelDistribution: {},
    thomsonSamplingConvergence: 0.95,
    modelPerformance: {}
  },
  infrastructure: {
    uptimePercentage: 99.99,
    scalingEvents: 2,
    alertsActive: 0,
    budgetUtilization: 0.45,
    resourceUsage: {
      cpu: 45,
      memory: 60,
      storage: 30
    }
  }
}

export const handlers = [
  // GraphQL endpoint
  http.post('*/graphql', async ({ request }) => {
    const { query, variables } = await request.json() as { query: string; variables?: any }
    const queryString = query.trim()

    // Health check
    if (queryString.includes('query') && queryString.includes('health')) {
      return HttpResponse.json({
        data: {
          health: 'OK',
        },
      })
    }

    // System status
    if (queryString.includes('systemStatus')) {
      return HttpResponse.json({
        data: {
          systemStatus: {
            databases: {
              postgres: 'healthy',
              neo4j: 'healthy',
              redis: 'healthy',
            },
            performance: {
              responseTime: 45.2,
              requestsPerSecond: 156.8,
              memoryUsage: 542.1,
              cpuUsage: 23.5,
            },
            uptime: 86400,
          },
        },
      })
    }

    // Entities query
    if (queryString.includes('entities')) {
      return HttpResponse.json({
        data: {
          entities: mockData.entities,
        },
      })
    }

    // Investigations query
    if (queryString.includes('investigations')) {
      return HttpResponse.json({
        data: {
          investigations: mockData.investigations,
        },
      })
    }

    // Alerts query
    if (queryString.includes('alerts')) {
      return HttpResponse.json({
        data: {
          alerts: mockData.alerts,
        },
      })
    }

    // Cases query
    if (queryString.includes('cases')) {
      return HttpResponse.json({
        data: {
          cases: mockData.cases,
        },
      })
    }

    // KPI metrics query
    if (queryString.includes('kpiMetrics')) {
      return HttpResponse.json({
        data: {
          kpiMetrics: mockData.kpiMetrics,
        },
      })
    }

    // Timeline events query
    if (queryString.includes('timelineEvents')) {
      return HttpResponse.json({
        data: {
          timelineEvents: mockData.timelineEvents,
        },
      })
    }

    // AI Analysis query
    if (queryString.includes('aiAnalysis')) {
      const text = variables?.text || 'sample text'

      return HttpResponse.json({
        data: {
          aiAnalysis: {
            status: 'COMPLETED',
            confidence: 0.84,
            threatAssessment: {
              riskLevel: 'MEDIUM',
              probability: 0.68,
              recommendations: ['Enhanced monitoring', 'Access review'],
            },
            entitiesExtracted: [
              { name: 'John Anderson', type: 'PERSON', confidence: 0.95 },
              { name: '192.168.1.100', type: 'IP_ADDRESS', confidence: 0.98 },
            ],
            anomaliesDetected: [
              {
                type: 'unusual_time_access',
                description: 'Access outside normal hours',
                severity: 'medium',
              },
            ],
            processingTime: 1200,
          },
        },
      })
    }

    // Create investigation mutation
    if (queryString.includes('createInvestigation')) {
      const newInvestigation = {
        id: `inv-${Date.now()}`,
        title: `New Investigation ${Date.now()}`,
        description: 'Created via API',
        status: 'draft',
        priority: 'medium',
        entityCount: 0,
        relationshipCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        metadata: {},
      }

      return HttpResponse.json({
        data: {
          createInvestigation: newInvestigation,
        },
      })
    }

    // Default response
    return HttpResponse.json({
      data: null,
      errors: [{ message: 'Query not implemented in mock' }],
    })
  }),

  // REST endpoints
  http.get('*/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 86400,
      services: {
        api: 'operational',
        graphql: 'operational',
        websockets: 'operational',
      },
    })
  }),

  // Conductor Metrics (Matches useConductorMetrics hook)
  http.get('*/metrics', () => {
    return HttpResponse.json(conductorMetrics)
  }),

  // Legacy Metrics (if called)
  http.get('*/api/metrics', () => {
    return HttpResponse.json({
      timestamp: new Date().toISOString(),
      performance: {
        responseTime: 35 + Math.random() * 20,
        requestsPerSecond: 150 + Math.random() * 50,
        memoryUsage: 500 + Math.random() * 200,
        cpuUsage: 20 + Math.random() * 30,
      },
      data: {
        investigations: mockData.investigations.length,
        entities: mockData.entities.length,
        relationships: mockData.relationships.length,
      },
    })
  }),

  // Auth endpoints
  http.post('*/auth/login', async ({ request }) => {
    const { email, password } = await request.json() as { email: string; password: string }

    // Simple mock auth
    if (email && password) {
      return HttpResponse.json({
        token: 'mock-jwt-token',
        user: mockData.users[0],
        expiresIn: 3600,
      })
    }

    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }),

  http.post('*/auth/logout', () => {
    return HttpResponse.json({ success: true })
  }),

  // User management
  http.get('*/users/me', () => {
    return HttpResponse.json(mockData.users[0])
  }),

  // File upload mock
  http.post('*/upload', () => {
    return HttpResponse.json({
      id: `file-${Date.now()}`,
      filename: 'uploaded-file.csv',
      size: 1024,
      type: 'text/csv',
      url: '/files/uploaded-file.csv',
    })
  }),
]
