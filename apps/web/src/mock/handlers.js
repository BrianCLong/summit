"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlers = void 0;
const msw_1 = require("msw");
const data_json_1 = __importDefault(require("./data.json"));
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
};
exports.handlers = [
    // GraphQL endpoint
    msw_1.http.post('*/graphql', async ({ request }) => {
        const { query, variables } = await request.json();
        const queryString = query.trim();
        // Health check
        if (queryString.includes('query') && queryString.includes('health')) {
            return msw_1.HttpResponse.json({
                data: {
                    health: 'OK',
                },
            });
        }
        // System status
        if (queryString.includes('systemStatus')) {
            return msw_1.HttpResponse.json({
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
            });
        }
        // Entities query
        if (queryString.includes('entities')) {
            return msw_1.HttpResponse.json({
                data: {
                    entities: data_json_1.default.entities,
                },
            });
        }
        // Investigations query
        if (queryString.includes('investigations')) {
            return msw_1.HttpResponse.json({
                data: {
                    investigations: data_json_1.default.investigations,
                },
            });
        }
        // Alerts query
        if (queryString.includes('alerts')) {
            return msw_1.HttpResponse.json({
                data: {
                    alerts: data_json_1.default.alerts,
                },
            });
        }
        // Cases query
        if (queryString.includes('cases')) {
            return msw_1.HttpResponse.json({
                data: {
                    cases: data_json_1.default.cases,
                },
            });
        }
        // KPI metrics query
        if (queryString.includes('kpiMetrics')) {
            return msw_1.HttpResponse.json({
                data: {
                    kpiMetrics: data_json_1.default.kpiMetrics,
                },
            });
        }
        // Timeline events query
        if (queryString.includes('timelineEvents')) {
            return msw_1.HttpResponse.json({
                data: {
                    timelineEvents: data_json_1.default.timelineEvents,
                },
            });
        }
        // AI Analysis query
        if (queryString.includes('aiAnalysis')) {
            return msw_1.HttpResponse.json({
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
            });
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
            };
            return msw_1.HttpResponse.json({
                data: {
                    createInvestigation: newInvestigation,
                },
            });
        }
        // Default response
        return msw_1.HttpResponse.json({
            data: null,
            errors: [{ message: 'Query not implemented in mock' }],
        });
    }),
    // REST endpoints
    msw_1.http.get('*/health', () => {
        return msw_1.HttpResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: 86400,
            services: {
                api: 'operational',
                graphql: 'operational',
                websockets: 'operational',
            },
        });
    }),
    // Conductor Metrics (Matches useConductorMetrics hook)
    msw_1.http.get('*/metrics', () => {
        return msw_1.HttpResponse.json(conductorMetrics);
    }),
    // Legacy Metrics (if called)
    msw_1.http.get('*/api/metrics', () => {
        return msw_1.HttpResponse.json({
            timestamp: new Date().toISOString(),
            performance: {
                responseTime: 35 + Math.random() * 20,
                requestsPerSecond: 150 + Math.random() * 50,
                memoryUsage: 500 + Math.random() * 200,
                cpuUsage: 20 + Math.random() * 30,
            },
            data: {
                investigations: data_json_1.default.investigations.length,
                entities: data_json_1.default.entities.length,
                relationships: data_json_1.default.relationships.length,
            },
        });
    }),
    // Auth endpoints
    msw_1.http.post('*/auth/login', async ({ request }) => {
        const { email, password } = await request.json();
        // Simple mock auth
        if (email && password) {
            return msw_1.HttpResponse.json({
                token: 'mock-jwt-token',
                user: data_json_1.default.users[0],
                expiresIn: 3600,
            });
        }
        return msw_1.HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }),
    msw_1.http.post('*/auth/logout', () => {
        return msw_1.HttpResponse.json({ success: true });
    }),
    // User management
    msw_1.http.get('*/users/me', () => {
        return msw_1.HttpResponse.json(data_json_1.default.users[0]);
    }),
    // Maestro Runs
    msw_1.http.post('*/api/maestro/runs', () => {
        return msw_1.HttpResponse.json({
            run: {
                id: 'run-mock-123',
                user: { id: 'mock-user' },
                createdAt: new Date().toISOString(),
                requestText: 'Mock request',
            },
            tasks: [],
            results: [],
            costSummary: {
                runId: 'run-mock-123',
                totalCostUSD: 0,
                totalInputTokens: 0,
                totalOutputTokens: 0,
                byModel: {},
            },
        });
    }),
    // File upload mock
    msw_1.http.post('*/upload', () => {
        return msw_1.HttpResponse.json({
            id: `file-${Date.now()}`,
            filename: 'uploaded-file.csv',
            size: 1024,
            type: 'text/csv',
            url: '/files/uploaded-file.csv',
        });
    }),
];
