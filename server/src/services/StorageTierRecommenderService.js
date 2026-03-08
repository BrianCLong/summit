"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageTierRecommender = exports.StorageTierRecommenderService = exports.WorkloadSpecsSchema = void 0;
const zod_1 = require("zod");
// Zod schema for validation
exports.WorkloadSpecsSchema = zod_1.z.object({
    iops: zod_1.z.number().min(0),
    throughputMBps: zod_1.z.number().min(0),
    latencySensitivity: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    accessPattern: zod_1.z.enum(['sequential', 'random']),
    dataSizeGB: zod_1.z.number().min(0),
    writeRatio: zod_1.z.number().min(0).max(1).optional(),
});
/**
 * Service to recommend storage tiers based on workload characteristics
 */
class StorageTierRecommenderService {
    /**
     * Recommend the best storage tier for a given workload
     */
    recommendStorageTier(specs) {
        const reasoning = [];
        const writeRatio = specs.writeRatio ?? 0.5;
        // Logic for NVMe
        // High IOPS, Critical Latency, or High Throughput (Random or Sequential)
        if (specs.latencySensitivity === 'critical' ||
            specs.iops > 10000 ||
            specs.throughputMBps > 1000 ||
            (specs.accessPattern === 'random' && specs.throughputMBps > 500)) {
            if (specs.latencySensitivity === 'critical') {
                reasoning.push('Critical latency sensitivity requires NVMe performance.');
            }
            if (specs.iops > 10000) {
                reasoning.push(`High IOPS (${specs.iops}) is best served by NVMe.`);
            }
            if (specs.throughputMBps > 1000) {
                reasoning.push(`High throughput (${specs.throughputMBps} MB/s) requires NVMe bandwidth.`);
            }
            if (specs.accessPattern === 'random' && specs.throughputMBps > 500) {
                reasoning.push('High throughput random access requires NVMe bandwidth.');
            }
            return this.createRecommendation('NVMe', specs.dataSizeGB, reasoning);
        }
        // Logic for SSD (Standard/General Purpose)
        // Moderate IOPS, High/Medium Latency, Random Access
        if (specs.latencySensitivity === 'high' ||
            specs.latencySensitivity === 'medium' ||
            specs.iops > 1000 ||
            specs.accessPattern === 'random') {
            if (specs.latencySensitivity === 'high') {
                reasoning.push('High latency sensitivity requires at least SSD.');
            }
            if (specs.iops > 1000) {
                reasoning.push('Moderate IOPS requires SSD.');
            }
            if (specs.accessPattern === 'random') {
                reasoning.push('Random access patterns perform poorly on HDD.');
            }
            return this.createRecommendation('SSD', specs.dataSizeGB, reasoning);
        }
        // Logic for Object Storage
        // Low Latency, Large Data, Sequential/Infrequent?
        // Usually Object is for "put and get" not "block storage" but if workload fits...
        // Let's assume Object is for archival or very large sequential reads (media streaming) if latency is low.
        // However, traditionally for "workload" in block terms, HDD is the fallback.
        // Let's make Object recommendation specific to very large datasets with low latency needs or specific archival patterns.
        if (specs.latencySensitivity === 'low' &&
            specs.dataSizeGB > 10000 && // > 10TB
            writeRatio < 0.1 // Mostly read/archive
        ) {
            reasoning.push('Large dataset (>10TB) with low write ratio is cost-effective on Object Storage.');
            return this.createRecommendation('Object', specs.dataSizeGB, reasoning);
        }
        // Logic for HDD
        // Sequential access, Low IOPS, Low Latency sensitivity
        reasoning.push('Workload fits HDD characteristics: Low IOPS, Low Latency Sensitivity, or Sequential Access.');
        if (specs.accessPattern === 'sequential') {
            reasoning.push('Sequential access patterns are handled well by HDD.');
        }
        return this.createRecommendation('HDD', specs.dataSizeGB, reasoning);
    }
    createRecommendation(tier, sizeGB, reasoning) {
        const costPerGB = {
            'NVMe': 0.20,
            'SSD': 0.10,
            'HDD': 0.04,
            'Object': 0.023
        };
        const estimatedCost = sizeGB * costPerGB[tier];
        return {
            tier,
            reasoning,
            estimatedCostPerMonth: parseFloat(estimatedCost.toFixed(2)),
            configSuggestion: this.getConfigSuggestion(tier)
        };
    }
    getConfigSuggestion(tier) {
        switch (tier) {
            case 'NVMe':
                return {
                    volumeType: 'io2', // AWS example
                    fileSystem: 'xfs'
                };
            case 'SSD':
                return {
                    volumeType: 'gp3', // AWS example
                    fileSystem: 'ext4'
                };
            case 'HDD':
                return {
                    volumeType: 'st1', // AWS example
                    fileSystem: 'ext4'
                };
            case 'Object':
                return {
                    storageClass: 'STANDARD', // AWS example
                    lifecyclePolicy: 'enabled'
                };
            default:
                return {};
        }
    }
}
exports.StorageTierRecommenderService = StorageTierRecommenderService;
exports.storageTierRecommender = new StorageTierRecommenderService();
