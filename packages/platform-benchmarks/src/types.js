"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BenchmarkConfigSchema = void 0;
const zod_1 = require("zod");
/**
 * Benchmark configuration schema
 */
exports.BenchmarkConfigSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    subsystem: zod_1.z.enum(['api', 'graph', 'ml', 'worker', 'cache', 'db']),
    language: zod_1.z.enum(['typescript', 'python', 'go']),
    workloadType: zod_1.z.enum(['cpu', 'memory', 'io', 'network', 'mixed']),
    iterations: zod_1.z.number().int().positive().default(1000),
    warmupIterations: zod_1.z.number().int().nonnegative().default(100),
    timeout: zod_1.z.number().positive().default(30000), // ms
    tags: zod_1.z.array(zod_1.z.string()).default([]),
});
