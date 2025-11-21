/**
 * Face Matching Engine
 *
 * Advanced face matching algorithms for 1:1 verification and 1:N identification
 * with support for multiple distance metrics and quality-aware matching.
 */

import {
  FaceEncoding,
  FaceComparison,
  FaceProfile,
  CrossAgeMatch
} from './types.js';

// ============================================================================
// Distance Metrics
// ============================================================================

export type DistanceMetric = 'EUCLIDEAN' | 'COSINE' | 'MANHATTAN' | 'MAHALANOBIS';

/**
 * Calculate Euclidean distance between two vectors
 */
export function euclideanDistance(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) {
    throw new Error('Vectors must have same dimensions');
  }
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += Math.pow(v1[i] - v2[i], 2);
  }
  return Math.sqrt(sum);
}

/**
 * Calculate Cosine similarity between two vectors
 */
export function cosineSimilarity(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) {
    throw new Error('Vectors must have same dimensions');
  }
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    norm1 += v1[i] * v1[i];
    norm2 += v2[i] * v2[i];
  }
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Calculate Manhattan distance between two vectors
 */
export function manhattanDistance(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) {
    throw new Error('Vectors must have same dimensions');
  }
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += Math.abs(v1[i] - v2[i]);
  }
  return sum;
}

/**
 * Convert distance to similarity score (0-100)
 */
export function distanceToScore(distance: number, metric: DistanceMetric): number {
  switch (metric) {
    case 'EUCLIDEAN':
      // Typical FaceNet L2 distances range from 0 to ~2.0
      return Math.max(0, Math.min(100, (1 - distance / 2) * 100));
    case 'COSINE':
      // Cosine similarity ranges from -1 to 1
      return Math.max(0, Math.min(100, (distance + 1) * 50));
    case 'MANHATTAN':
      // Normalize Manhattan distance
      return Math.max(0, Math.min(100, (1 - distance / 100) * 100));
    default:
      return Math.max(0, Math.min(100, (1 - distance) * 100));
  }
}

// ============================================================================
// Face Matching Engine
// ============================================================================

export interface MatchConfig {
  metric: DistanceMetric;
  threshold: number;
  qualityWeight: number;
  ageCompensation: boolean;
  normalizeVectors: boolean;
}

export interface MatchCandidate {
  profileId: string;
  personId?: string;
  score: number;
  distance: number;
  confidence: number;
  qualityAdjustedScore: number;
  metadata?: Record<string, unknown>;
}

const defaultConfig: MatchConfig = {
  metric: 'COSINE',
  threshold: 70,
  qualityWeight: 0.1,
  ageCompensation: true,
  normalizeVectors: true
};

export class FaceMatchingEngine {
  private config: MatchConfig;

  constructor(config: Partial<MatchConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Normalize a vector to unit length
   */
  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (norm === 0) return vector;
    return vector.map(v => v / norm);
  }

  /**
   * Calculate quality-adjusted confidence
   */
  private calculateConfidence(
    score: number,
    probeQuality: number,
    galleryQuality: number
  ): number {
    const avgQuality = (probeQuality + galleryQuality) / 2;
    const qualityFactor = avgQuality / 100;
    const baseConfidence = score / 100;

    // Higher quality samples give higher confidence
    return baseConfidence * (0.7 + 0.3 * qualityFactor);
  }

  /**
   * Apply age compensation to matching score
   */
  private applyAgeCompensation(
    score: number,
    probeAge: number,
    galleryAge: number
  ): number {
    if (!this.config.ageCompensation) return score;

    const ageDiff = Math.abs(probeAge - galleryAge);

    // Reduce score penalty based on age difference
    // Faces change more rapidly in childhood and old age
    let compensationFactor = 1.0;
    if (ageDiff <= 5) {
      compensationFactor = 1.0;
    } else if (ageDiff <= 10) {
      compensationFactor = 0.98;
    } else if (ageDiff <= 20) {
      compensationFactor = 0.95;
    } else if (ageDiff <= 30) {
      compensationFactor = 0.90;
    } else {
      compensationFactor = 0.85;
    }

    // Boost score to compensate for age differences
    return Math.min(100, score / compensationFactor);
  }

  /**
   * Compare two face encodings
   */
  compare(
    probe: FaceEncoding,
    gallery: FaceEncoding,
    probeQuality = 85,
    galleryQuality = 85
  ): FaceComparison {
    let v1 = probe.vector;
    let v2 = gallery.vector;

    // Normalize vectors if configured
    if (this.config.normalizeVectors) {
      v1 = this.normalizeVector(v1);
      v2 = this.normalizeVector(v2);
    }

    // Calculate distance/similarity
    let distance: number;
    let rawScore: number;

    switch (this.config.metric) {
      case 'EUCLIDEAN':
        distance = euclideanDistance(v1, v2);
        rawScore = distanceToScore(distance, 'EUCLIDEAN');
        break;
      case 'COSINE':
        const similarity = cosineSimilarity(v1, v2);
        distance = 1 - similarity;
        rawScore = distanceToScore(similarity, 'COSINE');
        break;
      case 'MANHATTAN':
        distance = manhattanDistance(v1, v2);
        rawScore = distanceToScore(distance, 'MANHATTAN');
        break;
      default:
        distance = euclideanDistance(v1, v2);
        rawScore = distanceToScore(distance, 'EUCLIDEAN');
    }

    // Apply quality weighting
    const qualityFactor = ((probeQuality + galleryQuality) / 200);
    const qualityAdjustedScore = rawScore * (1 - this.config.qualityWeight) +
                                  rawScore * this.config.qualityWeight * qualityFactor;

    const confidence = this.calculateConfidence(qualityAdjustedScore, probeQuality, galleryQuality);
    const isMatch = qualityAdjustedScore >= this.config.threshold;

    return {
      comparisonId: crypto.randomUUID(),
      face1: probe,
      face2: gallery,
      similarityScore: qualityAdjustedScore,
      distance,
      threshold: this.config.threshold,
      isMatch,
      confidence,
      method: this.config.metric,
      componentScores: {
        overall: rawScore
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Search for matching faces in a gallery (1:N identification)
   */
  search(
    probe: FaceEncoding,
    gallery: Array<{ encoding: FaceEncoding; profileId: string; personId?: string; quality?: number }>,
    maxResults = 10,
    probeQuality = 85
  ): MatchCandidate[] {
    const candidates: MatchCandidate[] = [];

    for (const entry of gallery) {
      const comparison = this.compare(probe, entry.encoding, probeQuality, entry.quality || 85);

      candidates.push({
        profileId: entry.profileId,
        personId: entry.personId,
        score: comparison.similarityScore,
        distance: comparison.distance,
        confidence: comparison.confidence,
        qualityAdjustedScore: comparison.similarityScore
      });
    }

    // Sort by score descending and return top N
    return candidates
      .filter(c => c.score >= this.config.threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * Perform cross-age face matching with compensation
   */
  crossAgeMatch(
    probe: { encoding: FaceEncoding; age: number; captureDate: string },
    candidate: { encoding: FaceEncoding; age: number; captureDate: string }
  ): CrossAgeMatch {
    const comparison = this.compare(probe.encoding, candidate.encoding);
    const ageCompensatedScore = this.applyAgeCompensation(
      comparison.similarityScore,
      probe.age,
      candidate.age
    );

    return {
      matchId: crypto.randomUUID(),
      probe: {
        faceId: probe.encoding.encodingId,
        age: probe.age,
        captureDate: probe.captureDate
      },
      candidate: {
        faceId: candidate.encoding.encodingId,
        age: candidate.age,
        captureDate: candidate.captureDate
      },
      ageDifference: Math.abs(probe.age - candidate.age),
      baselineScore: comparison.similarityScore,
      ageCompensatedScore,
      confidence: comparison.confidence,
      isMatch: ageCompensatedScore >= this.config.threshold,
      method: 'AGE_INVARIANT_MODEL'
    };
  }

  /**
   * Cluster faces by similarity
   */
  clusterFaces(
    faces: Array<{ encoding: FaceEncoding; id: string }>,
    clusterThreshold = 75
  ): Map<string, string[]> {
    const clusters = new Map<string, string[]>();
    const assigned = new Set<string>();

    for (let i = 0; i < faces.length; i++) {
      if (assigned.has(faces[i].id)) continue;

      const clusterId = crypto.randomUUID();
      const clusterMembers = [faces[i].id];
      assigned.add(faces[i].id);

      for (let j = i + 1; j < faces.length; j++) {
        if (assigned.has(faces[j].id)) continue;

        const comparison = this.compare(faces[i].encoding, faces[j].encoding);
        if (comparison.similarityScore >= clusterThreshold) {
          clusterMembers.push(faces[j].id);
          assigned.add(faces[j].id);
        }
      }

      clusters.set(clusterId, clusterMembers);
    }

    return clusters;
  }

  /**
   * Deduplicate faces in a gallery
   */
  deduplicateFaces(
    faces: Array<{ encoding: FaceEncoding; id: string; quality: number }>,
    dedupeThreshold = 95
  ): Array<{ id: string; duplicates: string[] }> {
    const duplicateGroups: Array<{ id: string; duplicates: string[] }> = [];
    const processed = new Set<string>();

    // Sort by quality descending - keep highest quality as primary
    const sortedFaces = [...faces].sort((a, b) => b.quality - a.quality);

    for (const face of sortedFaces) {
      if (processed.has(face.id)) continue;

      const duplicates: string[] = [];
      processed.add(face.id);

      for (const otherFace of sortedFaces) {
        if (processed.has(otherFace.id) || face.id === otherFace.id) continue;

        const comparison = this.compare(face.encoding, otherFace.encoding);
        if (comparison.similarityScore >= dedupeThreshold) {
          duplicates.push(otherFace.id);
          processed.add(otherFace.id);
        }
      }

      if (duplicates.length > 0) {
        duplicateGroups.push({ id: face.id, duplicates });
      }
    }

    return duplicateGroups;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<MatchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): MatchConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Batch Processing
// ============================================================================

export interface BatchMatchJob {
  jobId: string;
  probes: FaceEncoding[];
  galleryIds?: string[];
  config?: Partial<MatchConfig>;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  results?: MatchCandidate[][];
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export class BatchFaceMatchProcessor {
  private engine: FaceMatchingEngine;
  private jobs: Map<string, BatchMatchJob> = new Map();

  constructor(config?: Partial<MatchConfig>) {
    this.engine = new FaceMatchingEngine(config);
  }

  /**
   * Submit a batch matching job
   */
  submitJob(
    probes: FaceEncoding[],
    galleryIds?: string[],
    config?: Partial<MatchConfig>
  ): string {
    const jobId = crypto.randomUUID();
    const job: BatchMatchJob = {
      jobId,
      probes,
      galleryIds,
      config,
      status: 'PENDING',
      progress: 0,
      createdAt: new Date().toISOString()
    };
    this.jobs.set(jobId, job);
    return jobId;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): BatchMatchJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Process a batch job (would be async in production)
   */
  async processJob(
    jobId: string,
    gallery: Array<{ encoding: FaceEncoding; profileId: string; personId?: string; quality?: number }>
  ): Promise<BatchMatchJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.config) {
      this.engine.setConfig(job.config);
    }

    job.status = 'PROCESSING';
    const results: MatchCandidate[][] = [];

    try {
      for (let i = 0; i < job.probes.length; i++) {
        const candidates = this.engine.search(job.probes[i], gallery);
        results.push(candidates);
        job.progress = ((i + 1) / job.probes.length) * 100;
      }

      job.results = results;
      job.status = 'COMPLETED';
      job.completedAt = new Date().toISOString();
    } catch (error) {
      job.status = 'FAILED';
      job.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return job;
  }
}

export default FaceMatchingEngine;
