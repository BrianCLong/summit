/**
 * Core identity resolution engine
 */

import type {
  IdentityRecord,
  IdentityMatch,
  EntityCluster,
  GoldenRecord,
  ResolutionConfig,
  ResolutionResult,
  MatchedField,
  MatchType
} from './types.js';
import { calculateSimilarity } from './matching.js';
import { normalizeRecord } from './normalization.js';

export class IdentityResolver {
  private config: ResolutionConfig;
  private records: Map<string, IdentityRecord>;
  private clusters: Map<string, EntityCluster>;

  constructor(config: ResolutionConfig) {
    this.config = config;
    this.records = new Map();
    this.clusters = new Map();
  }

  /**
   * Add a new identity record for resolution
   */
  addRecord(record: IdentityRecord): void {
    const normalized = normalizeRecord(record);
    this.records.set(normalized.id, normalized);
  }

  /**
   * Find matches for a given record
   */
  async findMatches(record: IdentityRecord): Promise<IdentityMatch[]> {
    const matches: IdentityMatch[] = [];

    for (const [id, candidate] of this.records) {
      if (id === record.id) continue;

      const match = await this.compareRecords(record, candidate);

      if (match && match.matchScore >= this.config.matchingThreshold) {
        matches.push(match);
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Compare two records and calculate match score
   */
  private async compareRecords(
    record1: IdentityRecord,
    record2: IdentityRecord
  ): Promise<IdentityMatch | null> {
    const matchedFields: MatchedField[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // Compare each field
    for (const [field, value1] of Object.entries(record1.attributes)) {
      const value2 = record2.attributes[field];
      if (!value2) continue;

      const weight = this.config.fieldWeights[field] || 1.0;
      const similarity = calculateSimilarity(value1, value2, field);

      matchedFields.push({
        fieldName: field,
        value1,
        value2,
        similarity,
        weight
      });

      totalScore += similarity * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) return null;

    const matchScore = totalScore / totalWeight;
    const matchType = this.determineMatchType(matchedFields);

    return {
      record1,
      record2,
      matchScore,
      matchType,
      matchedFields,
      confidence: matchScore,
      method: this.config.matchingMethods[0] || 'deterministic'
    };
  }

  /**
   * Determine the type of match based on matched fields
   */
  private determineMatchType(fields: MatchedField[]): MatchType {
    const exactMatches = fields.filter(f => f.similarity === 1.0);

    if (exactMatches.length === fields.length) {
      return 'exact';
    } else if (exactMatches.length > 0) {
      return 'fuzzy';
    } else {
      return 'probabilistic';
    }
  }

  /**
   * Resolve all records into entity clusters
   */
  async resolve(): Promise<ResolutionResult> {
    const startTime = Date.now();
    const matches: IdentityMatch[] = [];
    const clusters: EntityCluster[] = [];

    // Find all matches
    for (const record of this.records.values()) {
      const recordMatches = await this.findMatches(record);
      matches.push(...recordMatches);
    }

    // Build clusters from matches
    const clusterMap = this.buildClusters(matches);

    // Generate golden records
    for (const cluster of clusterMap.values()) {
      const goldenRecord = this.generateGoldenRecord(cluster);
      cluster.goldenRecord = goldenRecord;
      clusters.push(cluster);
    }

    const processingTime = Date.now() - startTime;

    return {
      matches,
      clusters,
      goldenRecords: clusters.map(c => c.goldenRecord),
      statistics: {
        totalRecords: this.records.size,
        totalMatches: matches.length,
        totalClusters: clusters.length,
        averageClusterSize: clusters.reduce((sum, c) => sum + c.records.length, 0) / clusters.length,
        averageConfidence: matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length,
        processingTime
      }
    };
  }

  /**
   * Build entity clusters from matches
   */
  private buildClusters(matches: IdentityMatch[]): Map<string, EntityCluster> {
    const clusters = new Map<string, EntityCluster>();
    const recordToCluster = new Map<string, string>();

    for (const match of matches) {
      const id1 = match.record1.id;
      const id2 = match.record2.id;

      const cluster1 = recordToCluster.get(id1);
      const cluster2 = recordToCluster.get(id2);

      if (!cluster1 && !cluster2) {
        // Create new cluster
        const clusterId = `cluster_${Date.now()}_${Math.random()}`;
        const cluster: EntityCluster = {
          clusterId,
          records: [match.record1, match.record2],
          goldenRecord: null as any, // Will be filled later
          confidence: match.confidence,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        clusters.set(clusterId, cluster);
        recordToCluster.set(id1, clusterId);
        recordToCluster.set(id2, clusterId);
      } else if (cluster1 && !cluster2) {
        // Add to existing cluster
        const cluster = clusters.get(cluster1)!;
        cluster.records.push(match.record2);
        recordToCluster.set(id2, cluster1);
      } else if (!cluster1 && cluster2) {
        // Add to existing cluster
        const cluster = clusters.get(cluster2)!;
        cluster.records.push(match.record1);
        recordToCluster.set(id1, cluster2);
      } else if (cluster1 !== cluster2) {
        // Merge clusters
        const clusterA = clusters.get(cluster1!)!;
        const clusterB = clusters.get(cluster2!)!;
        clusterA.records.push(...clusterB.records);
        clusters.delete(cluster2!);

        // Update all records in clusterB to point to clusterA
        for (const record of clusterB.records) {
          recordToCluster.set(record.id, cluster1!);
        }
      }
    }

    return clusters;
  }

  /**
   * Generate golden record from cluster
   */
  private generateGoldenRecord(cluster: EntityCluster): GoldenRecord {
    const attributes: Record<string, any> = {};
    const sources = new Set<string>();

    // Merge attributes from all records
    for (const record of cluster.records) {
      sources.add(record.sourceSystem);

      for (const [key, value] of Object.entries(record.attributes)) {
        if (!attributes[key]) {
          attributes[key] = value;
        } else {
          // Use most confident value
          const existingConfidence = this.getFieldConfidence(attributes[key]);
          const newConfidence = this.getFieldConfidence(value);

          if (newConfidence > existingConfidence) {
            attributes[key] = value;
          }
        }
      }
    }

    return {
      id: `golden_${cluster.clusterId}`,
      clusterId: cluster.clusterId,
      attributes,
      sources: Array.from(sources),
      confidence: cluster.confidence,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Get confidence score for a field value
   */
  private getFieldConfidence(value: any): number {
    if (typeof value === 'object' && value?.confidence) {
      return value.confidence;
    }
    return 0.5; // Default confidence
  }

  /**
   * Get cluster by ID
   */
  getCluster(clusterId: string): EntityCluster | undefined {
    return this.clusters.get(clusterId);
  }

  /**
   * Get all clusters
   */
  getClusters(): EntityCluster[] {
    return Array.from(this.clusters.values());
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.records.clear();
    this.clusters.clear();
  }
}
