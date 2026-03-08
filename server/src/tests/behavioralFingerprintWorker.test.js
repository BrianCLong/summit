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
await globals_1.jest.unstable_mockModule('../services/EntityResolutionService.js', () => ({
    EntityResolutionService: class {
        fuseBehavioralFingerprint() {
            return { fingerprint: 'fp', score: 0.9 };
        }
        clusterIdentitiesAcrossProjects(identities) {
            return new Map([['cluster-1', identities.map((i) => i.id)]]);
        }
    },
}));
const { runBehavioralFingerprintJob } = await Promise.resolve().then(() => __importStar(require('../workers/behavioralFingerprintWorker.js')));
(0, globals_1.describe)('behavioral fingerprint job', () => {
    (0, globals_1.it)('scores and clusters identities across projects', async () => {
        const data = [
            {
                id: 'alice',
                projectId: 'A',
                telemetry: [
                    { clicks: 10, timeInView: 120, editRate: 2 },
                    { clicks: 5, timeInView: 60, editRate: 1 },
                ],
            },
            {
                id: 'bob',
                projectId: 'B',
                telemetry: [
                    { clicks: 11, timeInView: 118, editRate: 2 },
                    { clicks: 4, timeInView: 70, editRate: 1 },
                ],
            },
            {
                id: 'charlie',
                projectId: 'C',
                telemetry: [{ clicks: 1, timeInView: 10, editRate: 0.5 }],
            },
        ];
        const result = await runBehavioralFingerprintJob(data);
        (0, globals_1.expect)(result.fingerprints.length).toBe(3);
        const clusters = Array.from(result.clusters.values());
        const clusterWithAlice = clusters.find((c) => c.includes('alice'));
        (0, globals_1.expect)(clusterWithAlice).toBeDefined();
        (0, globals_1.expect)(clusterWithAlice).toContain('bob');
    });
});
