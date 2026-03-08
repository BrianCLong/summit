"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const neoRunMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../db/neo4j.js', () => ({
    neo: {
        run: neoRunMock,
    },
}));
(0, globals_1.describe)('DeceptionService', () => {
    let DeceptionService;
    let service;
    (0, globals_1.beforeAll)(async () => {
        ({ DeceptionService } = await Promise.resolve().then(() => __importStar(require('../DeceptionService.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        service = new DeceptionService();
    });
    (0, globals_1.describe)('deployHoneypot', () => {
        (0, globals_1.it)('should create a honeypot node and return its ID', async () => {
            const config = {
                name: 'Secret DB',
                type: 'DATABASE',
                vulnerabilities: ['weak_password'],
                location: 'dmz',
            };
            const tenantId = 'test-tenant';
            neoRunMock.mockResolvedValue({
                records: [],
            });
            const id = await service.deployHoneypot(config, tenantId);
            (0, globals_1.expect)(id).toBeDefined();
            (0, globals_1.expect)(neoRunMock).toHaveBeenCalledWith(globals_1.expect.stringContaining('CREATE (h:Honeypot:Asset'), globals_1.expect.objectContaining({
                tenantId,
                name: config.name,
                type: config.type,
            }));
        });
    });
    (0, globals_1.describe)('logInteraction', () => {
        (0, globals_1.it)('should create an interaction node and link it to the honeypot', async () => {
            const honeypotId = 'honeypot-1';
            const tenantId = 'test-tenant';
            const data = {
                sourceIp: '192.168.1.100',
                payload: 'SELECT * FROM users',
                timestamp: new Date(),
            };
            neoRunMock.mockResolvedValue({
                records: [
                    {
                        get: () => ({
                            properties: {
                                id: 'attacker-1',
                                ipAddress: data.sourceIp,
                                riskScore: { toNumber: () => 10 },
                                techniques: [],
                                firstSeen: Date.now(),
                                lastSeen: Date.now(),
                            },
                        }),
                    },
                ],
            });
            const id = await service.logInteraction(honeypotId, data, tenantId);
            (0, globals_1.expect)(id).toBeDefined();
            (0, globals_1.expect)(neoRunMock).toHaveBeenCalledWith(globals_1.expect.stringContaining('CREATE (i:Interaction:Event'), globals_1.expect.objectContaining({
                honeypotId,
                tenantId,
                sourceIp: data.sourceIp,
                payload: data.payload,
            }));
        });
    });
    (0, globals_1.describe)('generateThreatIntelligence', () => {
        (0, globals_1.it)('should return a report based on interactions', async () => {
            const tenantId = 'test-tenant';
            neoRunMock.mockResolvedValue({
                records: [
                    {
                        get: (key) => {
                            const values = {
                                totalHits: { toNumber: () => 150 },
                                activeHoneypots: { toNumber: () => 5 },
                                uniqueAttackers: [['1.2.3.4'], ['5.6.7.8']],
                            };
                            return values[key];
                        },
                    },
                ],
            });
            const report = await service.generateThreatIntelligence(tenantId);
            (0, globals_1.expect)(report).toBeDefined();
            (0, globals_1.expect)(report.severity).toBe('CRITICAL');
            (0, globals_1.expect)(report.indicators).toHaveLength(2);
            (0, globals_1.expect)(neoRunMock).toHaveBeenCalledWith(globals_1.expect.stringContaining('MATCH (h:Honeypot'), globals_1.expect.objectContaining({ tenantId }));
        });
        (0, globals_1.it)('should return a low severity report if no interactions', async () => {
            const tenantId = 'test-tenant';
            neoRunMock.mockResolvedValue({
                records: [],
            });
            const report = await service.generateThreatIntelligence(tenantId);
            (0, globals_1.expect)(report).toBeDefined();
            (0, globals_1.expect)(report.severity).toBe('LOW');
            (0, globals_1.expect)(report.narrative).toContain('No recent activity');
        });
    });
});
