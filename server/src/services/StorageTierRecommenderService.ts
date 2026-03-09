import { z } from 'zod/v4';

/**
 * Interface for describing workload characteristics
 */
export interface WorkloadSpecs {
  iops: number;
  throughputMBps: number;
  latencySensitivity: 'low' | 'medium' | 'high' | 'critical';
  accessPattern: 'sequential' | 'random';
  dataSizeGB: number;
  writeRatio?: number; // 0 to 1, default 0.5
}

/**
 * Interface for storage recommendation
 */
export interface StorageRecommendation {
  tier: 'NVMe' | 'SSD' | 'HDD' | 'Object';
  reasoning: string[];
  estimatedCostPerMonth: number;
  configSuggestion?: Record<string, any>;
}

// Zod schema for validation
export const WorkloadSpecsSchema = z.object({
  iops: z.number().min(0),
  throughputMBps: z.number().min(0),
  latencySensitivity: z.enum(['low', 'medium', 'high', 'critical']),
  accessPattern: z.enum(['sequential', 'random']),
  dataSizeGB: z.number().min(0),
  writeRatio: z.number().min(0).max(1).optional(),
});

/**
 * Service to recommend storage tiers based on workload characteristics
 */
export class StorageTierRecommenderService {

  /**
   * Recommend the best storage tier for a given workload
   */
  public recommendStorageTier(specs: WorkloadSpecs): StorageRecommendation {
    const reasoning: string[] = [];
    const writeRatio = specs.writeRatio ?? 0.5;

    // Logic for NVMe
    // High IOPS, Critical Latency, or High Throughput (Random or Sequential)
    if (
      specs.latencySensitivity === 'critical' ||
      specs.iops > 10000 ||
      specs.throughputMBps > 1000 ||
      (specs.accessPattern === 'random' && specs.throughputMBps > 500)
    ) {
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
    if (
      specs.latencySensitivity === 'high' ||
      specs.latencySensitivity === 'medium' ||
      specs.iops > 1000 ||
      specs.accessPattern === 'random'
    ) {
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
    if (
        specs.latencySensitivity === 'low' &&
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

  private createRecommendation(
    tier: StorageRecommendation['tier'],
    sizeGB: number,
    reasoning: string[]
  ): StorageRecommendation {
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

  private getConfigSuggestion(tier: string): Record<string, any> {
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

export const storageTierRecommender = new StorageTierRecommenderService();
