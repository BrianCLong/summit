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
// Benchmark script for multi-cloud router
const aws_provider_1 = require("../../src/providers/aws-provider");
const gcp_provider_1 = require("../../src/providers/gcp-provider");
const provider_router_1 = require("../../src/resilience/provider-router");
const fs = __importStar(require("fs"));
async function runBenchmark() {
    const aws = new aws_provider_1.AwsProvider();
    const gcp = new gcp_provider_1.GcpProvider();
    const router = new provider_router_1.ProviderRouter([aws, gcp]);
    const q = { id: 'bench-1', payload: {} };
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
        await router.routeQuery(q);
    }
    const end = Date.now();
    const metrics = {
        totalTimeMs: end - start,
        avgTimeMs: (end - start) / 1000,
        timestamp: new Date().toISOString()
    };
    const metricsPath = 'artifacts/metrics.json';
    if (!fs.existsSync('artifacts')) {
        fs.mkdirSync('artifacts', { recursive: true });
    }
    let existingMetrics = {};
    if (fs.existsSync(metricsPath)) {
        try {
            existingMetrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
        }
        catch (e) {
            // Ignore
        }
    }
    const newMetrics = { ...existingMetrics, ...metrics };
    fs.writeFileSync(metricsPath, JSON.stringify(newMetrics, null, 2));
    console.log(`Benchmark completed in ${metrics.totalTimeMs}ms`);
}
runBenchmark().catch(console.error);
