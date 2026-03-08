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
exports.CsvReporter = void 0;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
/**
 * CSV reporter for data analysis
 */
class CsvReporter {
    outputPath;
    results = [];
    constructor(outputPath) {
        this.outputPath = outputPath;
    }
    async onSuiteStart(_suite) {
        this.results = [];
    }
    async onBenchmarkStart(_config) {
        // No-op
    }
    async onBenchmarkComplete(result) {
        this.results.push(result);
    }
    async onSuiteComplete(results) {
        const headers = [
            'name',
            'subsystem',
            'language',
            'workload_type',
            'iterations',
            'mean_ns',
            'stddev_ns',
            'min_ns',
            'max_ns',
            'p50_ns',
            'p75_ns',
            'p90_ns',
            'p95_ns',
            'p99_ns',
            'ops_per_second',
            'rme_percent',
            'passed',
            'git_commit',
            'timestamp',
        ];
        const rows = results.map((r) => [
            r.config.name,
            r.config.subsystem,
            r.config.language,
            r.config.workloadType,
            r.stats.iterations,
            r.stats.mean,
            r.stats.stdDev,
            r.stats.min,
            r.stats.max,
            r.stats.percentiles.p50,
            r.stats.percentiles.p75,
            r.stats.percentiles.p90,
            r.stats.percentiles.p95,
            r.stats.percentiles.p99,
            r.stats.opsPerSecond,
            r.stats.rme,
            r.passed,
            r.gitCommit,
            r.timestamp,
        ]);
        const csv = [
            headers.join(','),
            ...rows.map((row) => row.map((v) => `"${v}"`).join(',')),
        ].join('\n');
        if (this.outputPath) {
            await fs.mkdir(path.dirname(this.outputPath), { recursive: true });
            await fs.writeFile(this.outputPath, csv, 'utf8');
        }
        else {
            console.log(csv);
        }
    }
    async onError(error, config) {
        console.error(`Error in ${config?.name ?? 'unknown'}: ${error.message}`);
    }
}
exports.CsvReporter = CsvReporter;
