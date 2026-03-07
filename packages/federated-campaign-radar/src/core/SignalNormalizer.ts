/**
 * Signal Normalizer
 *
 * Normalizes campaign signals into the shared schema with C2PA credential support.
 * Implements privacy-preserving hashing and embedding generation.
 */

import { createHash, createHmac } from "crypto";
import { v4 as uuidv4 } from "uuid";
import {
  CampaignSignal,
  SignalType,
  PrivacyLevel,
  SignalIndicator,
  NarrativeIndicator,
  MediaIndicator,
  URLIndicator,
  AccountIndicator,
  CoordinationIndicator,
  SignalProvenance,
  ProvenanceSourceType,
  C2PAValidationResult,
  C2PAManifest,
  ChannelMetadata,
  ChannelType,
  ReachCategory,
  CoordinationFeature,
  CoordinationPatternType,
  FederationMetadata,
  createSignalId,
  ExtractedEntity,
  BehavioralSignature,
} from "./types";

/**
 * Raw input types for normalization
 */
export interface RawNarrativeInput {
  text: string;
  language?: string;
  source?: string;
  timestamp?: Date;
  platform?: string;
  author?: string;
  engagement?: {
    likes?: number;
    shares?: number;
    comments?: number;
  };
}

export interface RawMediaInput {
  content: Buffer;
  mediaType: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
  filename?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
  c2paManifestBuffer?: Buffer;
}

export interface RawURLInput {
  url: string;
  capturedAt?: Date;
  httpStatus?: number;
  redirectChain?: string[];
  contentType?: string;
}

export interface RawAccountInput {
  platform: string;
  handle: string;
  displayName?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  createdAt?: Date;
  recentActivity?: {
    postingHours: number[];
    contentTypes: string[];
    languageUsed: string[];
    topicsEngaged: string[];
  };
}

export interface RawCoordinationInput {
  actorIds: string[];
  contentHashes: string[];
  timestamps: Date[];
  platform: string;
  patternType?: CoordinationPatternType;
}

export interface NormalizationConfig {
  organizationId: string;
  federationId: string;
  privacyLevel: PrivacyLevel;
  enableEmbeddings: boolean;
  embeddingModel?: string;
  hashingSalt: string;
  sharingAgreementId: string;
  retentionDays: number;
}

/**
 * Signal Normalizer Service
 */
export class SignalNormalizer {
  private config: NormalizationConfig;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(config: NormalizationConfig) {
    this.config = config;
  }

  /**
   * Normalize a narrative/claim signal
   */
  async normalizeNarrative(
    input: RawNarrativeInput,
    sourceType: ProvenanceSourceType = ProvenanceSourceType.DIRECT_OBSERVATION
  ): Promise<CampaignSignal> {
    const signalId = createSignalId();
    const timestamp = input.timestamp || new Date();

    // Create privacy-preserving hash
    const normalizedText = this.normalizeText(input.text);
    const textHash = this.createSecureHash(normalizedText);

    // Generate semantic embedding if enabled
    const embedding = this.config.enableEmbeddings
      ? await this.generateTextEmbedding(normalizedText)
      : undefined;

    // Extract entities and topics
    const entities = this.extractEntities(input.text);
    const topics = this.extractTopics(input.text);
    const sentiment = this.analyzeSentiment(input.text);
    const framingTechniques = this.detectFramingTechniques(input.text);

    // Create narrative indicator
    const narrativeIndicator: NarrativeIndicator = {
      claimText: this.config.privacyLevel === PrivacyLevel.PUBLIC ? input.text : undefined,
      claimHash: textHash,
      semanticEmbedding: embedding || [],
      language: input.language || this.detectLanguage(input.text),
      sentiment,
      topics,
      entities,
      framingTechniques,
    };

    // Create signal indicator
    const indicator: SignalIndicator = {
      narrative: narrativeIndicator,
      indicatorHash: textHash,
    };

    // Build channel metadata
    const channelMetadata = this.buildChannelMetadata(
      input.platform || "unknown",
      input.engagement
    );

    // Build provenance
    const provenance = this.buildProvenance(sourceType, ["text_extraction", "nlp_processing"]);

    // Build federation metadata
    const federationMetadata = this.buildFederationMetadata();

    // Create the normalized signal
    const signal: CampaignSignal = {
      id: signalId,
      version: "1.0.0",
      timestamp,
      expiresAt: new Date(timestamp.getTime() + this.config.retentionDays * 24 * 60 * 60 * 1000),
      signalType: SignalType.NARRATIVE,
      confidence: 0.9,
      indicator,
      privacyLevel: this.config.privacyLevel,
      hashedContent: textHash,
      embeddingVector: embedding,
      provenance,
      sourceOrganization: this.hashOrganizationId(this.config.organizationId),
      channelMetadata,
      coordinationFeatures: [],
      federationMetadata,
    };

    return signal;
  }

  /**
   * Normalize a media artifact signal with C2PA support
   */
  async normalizeMedia(
    input: RawMediaInput,
    sourceType: ProvenanceSourceType = ProvenanceSourceType.DIRECT_OBSERVATION
  ): Promise<CampaignSignal> {
    const signalId = createSignalId();
    const timestamp = new Date();

    // Generate hashes
    const contentHash = this.createSecureHash(input.content.toString("base64"));
    const perceptualHash = await this.generatePerceptualHash(input.content, input.mediaType);

    // Validate C2PA manifest if present
    let c2paValidation: C2PAValidationResult | undefined;
    let c2paManifest: C2PAManifest | undefined;

    if (input.c2paManifestBuffer) {
      const validationResult = await this.validateC2PAManifest(
        input.content,
        input.c2paManifestBuffer
      );
      c2paValidation = validationResult.validation;
      c2paManifest = validationResult.manifest;
    }

    // Detect manipulation and synthetic content
    const manipulationScore = await this.detectManipulation(input.content, input.mediaType);
    const syntheticScore = await this.detectSyntheticContent(input.content, input.mediaType);

    // Create media indicator
    const mediaIndicator: MediaIndicator = {
      mediaType: input.mediaType,
      perceptualHash,
      contentHash,
      manipulationScore,
      syntheticScore,
      c2paManifest,
    };

    // Add dimensions for images/videos
    if (input.mediaType === "IMAGE" || input.mediaType === "VIDEO") {
      mediaIndicator.dimensions = await this.extractDimensions(input.content);
    }

    // Add duration for video/audio
    if (input.mediaType === "VIDEO" || input.mediaType === "AUDIO") {
      mediaIndicator.duration = await this.extractDuration(input.content);
    }

    const indicator: SignalIndicator = {
      media: mediaIndicator,
      indicatorHash: perceptualHash,
    };

    const provenance = this.buildProvenance(sourceType, [
      "media_extraction",
      "hash_generation",
      "c2pa_validation",
    ]);

    const federationMetadata = this.buildFederationMetadata();

    const signal: CampaignSignal = {
      id: signalId,
      version: "1.0.0",
      timestamp,
      expiresAt: new Date(timestamp.getTime() + this.config.retentionDays * 24 * 60 * 60 * 1000),
      signalType: syntheticScore > 0.7 ? SignalType.SYNTHETIC_MEDIA : SignalType.MEDIA_ARTIFACT,
      confidence: c2paValidation?.isValid ? 0.95 : 0.7,
      indicator,
      privacyLevel: this.config.privacyLevel,
      hashedContent: contentHash,
      provenance,
      c2paValidation,
      sourceOrganization: this.hashOrganizationId(this.config.organizationId),
      channelMetadata: this.buildChannelMetadata("media"),
      coordinationFeatures: [],
      federationMetadata,
    };

    return signal;
  }

  /**
   * Normalize a URL signal
   */
  async normalizeURL(
    input: RawURLInput,
    sourceType: ProvenanceSourceType = ProvenanceSourceType.DIRECT_OBSERVATION
  ): Promise<CampaignSignal> {
    const signalId = createSignalId();
    const timestamp = input.capturedAt || new Date();

    // Parse and hash URL components
    const parsedUrl = new URL(input.url);
    const domainHash = this.createSecureHash(parsedUrl.hostname);
    const pathHash = this.createSecureHash(parsedUrl.pathname);
    const fullUrlHash = this.createSecureHash(input.url);

    // Hash redirect chain
    const redirectChainHashes = input.redirectChain?.map((url) => this.createSecureHash(url));

    const urlIndicator: URLIndicator = {
      domainHash,
      pathHash,
      fullUrlHash,
      redirectChain: redirectChainHashes,
    };

    const indicator: SignalIndicator = {
      url: urlIndicator,
      indicatorHash: fullUrlHash,
    };

    const provenance = this.buildProvenance(sourceType, ["url_extraction"]);

    const federationMetadata = this.buildFederationMetadata();

    const signal: CampaignSignal = {
      id: signalId,
      version: "1.0.0",
      timestamp,
      expiresAt: new Date(timestamp.getTime() + this.config.retentionDays * 24 * 60 * 60 * 1000),
      signalType: SignalType.URL,
      confidence: 0.85,
      indicator,
      privacyLevel: this.config.privacyLevel,
      hashedContent: fullUrlHash,
      provenance,
      sourceOrganization: this.hashOrganizationId(this.config.organizationId),
      channelMetadata: this.buildChannelMetadata("web"),
      coordinationFeatures: [],
      federationMetadata,
    };

    return signal;
  }

  /**
   * Normalize an account signal
   */
  async normalizeAccount(
    input: RawAccountInput,
    sourceType: ProvenanceSourceType = ProvenanceSourceType.PLATFORM_API
  ): Promise<CampaignSignal> {
    const signalId = createSignalId();
    const timestamp = new Date();

    // Hash identifiers
    const platformHash = this.createSecureHash(input.platform);
    const handleHash = this.createSecureHash(`${input.platform}:${input.handle}`);

    // Determine account age range
    const accountAgeRange = this.calculateAccountAgeRange(input.createdAt);

    // Determine follower range
    const followerRange = this.calculateFollowerRange(input.followerCount);

    // Build behavioral signature
    const behavioralSignature = this.buildBehavioralSignature(input);

    const accountIndicator: AccountIndicator = {
      platformHash,
      handleHash,
      accountAgeRange,
      followerRange,
      behavioralSignature,
    };

    const indicator: SignalIndicator = {
      account: accountIndicator,
      indicatorHash: handleHash,
    };

    const provenance = this.buildProvenance(sourceType, [
      "account_extraction",
      "behavior_analysis",
    ]);

    const federationMetadata = this.buildFederationMetadata();

    const signal: CampaignSignal = {
      id: signalId,
      version: "1.0.0",
      timestamp,
      expiresAt: new Date(timestamp.getTime() + this.config.retentionDays * 24 * 60 * 60 * 1000),
      signalType: SignalType.ACCOUNT_HANDLE,
      confidence: 0.8,
      indicator,
      privacyLevel: this.config.privacyLevel,
      hashedContent: handleHash,
      provenance,
      sourceOrganization: this.hashOrganizationId(this.config.organizationId),
      channelMetadata: this.buildChannelMetadata(input.platform),
      coordinationFeatures: [],
      federationMetadata,
    };

    return signal;
  }

  /**
   * Normalize a coordination pattern signal
   */
  async normalizeCoordination(
    input: RawCoordinationInput,
    sourceType: ProvenanceSourceType = ProvenanceSourceType.AUTOMATED_DETECTION
  ): Promise<CampaignSignal> {
    const signalId = createSignalId();
    const timestamp = new Date();

    // Calculate temporal window
    const timestamps = input.timestamps.sort((a, b) => a.getTime() - b.getTime());
    const temporalWindow = {
      start: timestamps[0],
      end: timestamps[timestamps.length - 1],
    };

    // Calculate synchronicity
    const synchronicity = this.calculateSynchronicity(timestamps);

    // Calculate content similarity
    const contentSimilarity = await this.calculateContentSimilarity(input.contentHashes);

    // Calculate network density
    const networkDensity = this.calculateNetworkDensity(input.actorIds);

    // Calculate amplification factor
    const amplificationFactor = this.calculateAmplificationFactor(
      input.actorIds.length,
      input.contentHashes.length
    );

    const coordinationIndicator: CoordinationIndicator = {
      patternType: input.patternType || CoordinationPatternType.SYNCHRONIZED_POSTING,
      actorCount: input.actorIds.length,
      temporalWindow,
      synchronicity,
      contentSimilarity,
      networkDensity,
      amplificationFactor,
    };

    const indicator: SignalIndicator = {
      coordination: coordinationIndicator,
      indicatorHash: this.createSecureHash(
        JSON.stringify({
          actors: input.actorIds.length,
          window: temporalWindow,
          pattern: input.patternType,
        })
      ),
    };

    const provenance = this.buildProvenance(sourceType, [
      "coordination_detection",
      "temporal_analysis",
      "network_analysis",
    ]);

    const federationMetadata = this.buildFederationMetadata();

    // Build coordination features
    const coordinationFeatures: CoordinationFeature[] = [
      {
        featureType: "synchronicity",
        value: synchronicity,
        confidence: 0.85,
        extractedAt: timestamp,
      },
      {
        featureType: "content_similarity",
        value: contentSimilarity,
        confidence: 0.9,
        extractedAt: timestamp,
      },
      {
        featureType: "network_density",
        value: networkDensity,
        confidence: 0.8,
        extractedAt: timestamp,
      },
    ];

    const signal: CampaignSignal = {
      id: signalId,
      version: "1.0.0",
      timestamp,
      expiresAt: new Date(timestamp.getTime() + this.config.retentionDays * 24 * 60 * 60 * 1000),
      signalType: SignalType.COORDINATION_PATTERN,
      confidence: Math.min(synchronicity, contentSimilarity) * 0.9 + 0.1,
      indicator,
      privacyLevel: this.config.privacyLevel,
      hashedContent: indicator.indicatorHash,
      provenance,
      sourceOrganization: this.hashOrganizationId(this.config.organizationId),
      channelMetadata: this.buildChannelMetadata(input.platform),
      coordinationFeatures,
      federationMetadata,
    };

    return signal;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private createSecureHash(input: string): string {
    return createHmac("sha256", this.config.hashingSalt).update(input).digest("hex");
  }

  private hashOrganizationId(orgId: string): string {
    // Create anonymized org ID that's consistent but not reversible
    return createHmac("sha256", this.config.hashingSalt)
      .update(`org:${orgId}`)
      .digest("hex")
      .substring(0, 16);
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^\w\s]/g, "")
      .trim();
  }

  private async generateTextEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = this.createSecureHash(text);
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    // Generate embedding (placeholder - would use actual embedding model)
    // In production, this would call an embedding API or local model
    const embedding = this.generateMockEmbedding(text, 384);

    // Cache the result
    this.embeddingCache.set(cacheKey, embedding);

    return embedding;
  }

  private generateMockEmbedding(text: string, dimensions: number): number[] {
    // Simple deterministic mock embedding based on text hash
    const hash = createHash("sha256").update(text).digest();
    const embedding: number[] = [];

    for (let i = 0; i < dimensions; i++) {
      const byteIndex = i % hash.length;
      embedding.push((hash[byteIndex] / 255) * 2 - 1);
    }

    // Normalize to unit vector
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / norm);
  }

  private extractEntities(text: string): ExtractedEntity[] {
    // Simplified entity extraction (would use NER model in production)
    const entities: ExtractedEntity[] = [];

    // Simple pattern matching for demonstration
    const patterns = [
      { pattern: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g, type: "PERSON" as const },
      { pattern: /\b(?:Inc|Corp|LLC|Ltd|Company|Organization)\b/gi, type: "ORGANIZATION" as const },
      { pattern: /\b[A-Z][a-z]+(?:,\s*[A-Z]{2})?\b/g, type: "LOCATION" as const },
    ];

    for (const { pattern, type } of patterns) {
      const matches = text.match(pattern) || [];
      for (const match of matches.slice(0, 5)) {
        entities.push({
          text: match,
          type,
          confidence: 0.7,
          entityHash: this.createSecureHash(match.toLowerCase()),
        });
      }
    }

    return entities;
  }

  private extractTopics(text: string): string[] {
    // Simplified topic extraction
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "must",
      "shall",
    ]);

    const wordFreq = new Map<string, number>();
    for (const word of words) {
      if (word.length > 3 && !stopWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private analyzeSentiment(text: string): number {
    // Simplified sentiment analysis
    const positiveWords = new Set([
      "good",
      "great",
      "excellent",
      "amazing",
      "wonderful",
      "positive",
      "success",
      "happy",
      "love",
      "best",
      "awesome",
      "fantastic",
    ]);
    const negativeWords = new Set([
      "bad",
      "terrible",
      "awful",
      "horrible",
      "negative",
      "fail",
      "sad",
      "hate",
      "worst",
      "poor",
      "disaster",
      "crisis",
    ]);

    const words = text.toLowerCase().split(/\s+/);
    let score = 0;

    for (const word of words) {
      if (positiveWords.has(word)) score += 0.1;
      if (negativeWords.has(word)) score -= 0.1;
    }

    return Math.max(-1, Math.min(1, score));
  }

  private detectFramingTechniques(text: string): string[] {
    const techniques: string[] = [];

    // Check for common framing patterns
    if (/breaking|urgent|exclusive/i.test(text)) {
      techniques.push("urgency_framing");
    }
    if (/they|them|those people/i.test(text)) {
      techniques.push("us_vs_them");
    }
    if (/everyone knows|it's obvious|clearly/i.test(text)) {
      techniques.push("appeal_to_common_sense");
    }
    if (/experts say|studies show|research proves/i.test(text)) {
      techniques.push("appeal_to_authority");
    }
    if (/\?{2,}|!{2,}/g.test(text)) {
      techniques.push("emotional_amplification");
    }

    return techniques;
  }

  private detectLanguage(text: string): string {
    // Simplified language detection
    const englishWords = new Set([
      "the",
      "is",
      "are",
      "was",
      "were",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
    ]);

    const words = text.toLowerCase().split(/\s+/);
    let englishCount = 0;

    for (const word of words) {
      if (englishWords.has(word)) englishCount++;
    }

    return englishCount > words.length * 0.1 ? "en" : "unknown";
  }

  private async generatePerceptualHash(content: Buffer, mediaType: string): Promise<string> {
    // Simplified perceptual hash generation
    // In production, would use actual pHash library
    const contentHash = createHash("sha256").update(content).digest("hex");
    return `phash_${mediaType.toLowerCase()}_${contentHash.substring(0, 16)}`;
  }

  private async validateC2PAManifest(
    content: Buffer,
    manifestBuffer: Buffer
  ): Promise<{ validation: C2PAValidationResult; manifest?: C2PAManifest }> {
    // Simplified C2PA validation
    // In production, would use c2pa-node or similar library
    try {
      const manifestData = JSON.parse(manifestBuffer.toString());

      const manifest: C2PAManifest = {
        manifestId: manifestData.id || uuidv4(),
        claimGenerator: manifestData.claim_generator || "unknown",
        claimGeneratorVersion: manifestData.claim_generator_version || "1.0",
        title: manifestData.title,
        format: manifestData.format || "image/jpeg",
        instanceId: manifestData.instance_id || uuidv4(),
        ingredients: manifestData.ingredients || [],
        assertions: manifestData.assertions || [],
        signature: {
          algorithm: manifestData.signature?.algorithm || "ES256",
          issuer: manifestData.signature?.issuer || "unknown",
          timestamp: new Date(manifestData.signature?.timestamp || Date.now()),
          certificateChain: manifestData.signature?.certificate_chain || [],
        },
      };

      const validation: C2PAValidationResult = {
        isValid: true,
        hasManifest: true,
        manifestValidation: {
          signatureValid: true,
          integrityValid: true,
          timestampValid: true,
          errors: [],
          warnings: [],
        },
        claimValidation: {
          claimSignatureValid: true,
          claimIntegrityValid: true,
          assertionsValid: true,
          ingredientsValid: true,
        },
        trustChain: {
          isComplete: true,
          chainLength: manifest.signature.certificateChain.length,
          trustedRoots: ["Adobe", "Microsoft", "C2PA Trust List"],
          untrustedElements: [],
        },
        validationTimestamp: new Date(),
      };

      return { validation, manifest };
    } catch {
      return {
        validation: {
          isValid: false,
          hasManifest: false,
          manifestValidation: {
            signatureValid: false,
            integrityValid: false,
            timestampValid: false,
            errors: ["Failed to parse C2PA manifest"],
            warnings: [],
          },
          claimValidation: {
            claimSignatureValid: false,
            claimIntegrityValid: false,
            assertionsValid: false,
            ingredientsValid: false,
          },
          trustChain: {
            isComplete: false,
            chainLength: 0,
            trustedRoots: [],
            untrustedElements: [],
          },
          validationTimestamp: new Date(),
        },
      };
    }
  }

  private async detectManipulation(content: Buffer, mediaType: string): Promise<number> {
    // Placeholder for manipulation detection
    // Would use forensic analysis models in production
    return 0.1 + Math.random() * 0.2;
  }

  private async detectSyntheticContent(content: Buffer, mediaType: string): Promise<number> {
    // Placeholder for synthetic content detection
    // Would use AI-generated content detectors in production
    return 0.05 + Math.random() * 0.15;
  }

  private async extractDimensions(content: Buffer): Promise<{ width: number; height: number }> {
    // Placeholder - would use actual image/video parsing
    return { width: 1920, height: 1080 };
  }

  private async extractDuration(content: Buffer): Promise<number> {
    // Placeholder - would use actual audio/video parsing
    return 60;
  }

  private calculateAccountAgeRange(createdAt?: Date): "NEW" | "RECENT" | "ESTABLISHED" | "OLD" {
    if (!createdAt) return "ESTABLISHED";

    const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays < 30) return "NEW";
    if (ageInDays < 180) return "RECENT";
    if (ageInDays < 730) return "ESTABLISHED";
    return "OLD";
  }

  private calculateFollowerRange(
    followerCount?: number
  ): "MICRO" | "SMALL" | "MEDIUM" | "LARGE" | "MASSIVE" {
    if (!followerCount) return "SMALL";

    if (followerCount < 1000) return "MICRO";
    if (followerCount < 10000) return "SMALL";
    if (followerCount < 100000) return "MEDIUM";
    if (followerCount < 1000000) return "LARGE";
    return "MASSIVE";
  }

  private buildBehavioralSignature(input: RawAccountInput): BehavioralSignature {
    const recentActivity = input.recentActivity;

    return {
      postingFrequency: input.postCount ? input.postCount / 30 : 1,
      activityHours: recentActivity?.postingHours || Array(24).fill(1),
      contentTypes: recentActivity?.contentTypes || ["text"],
      engagementPatterns: {
        likes: 0.5,
        shares: 0.3,
        comments: 0.2,
      },
      languageConsistency: 0.9,
      topicConsistency: 0.8,
    };
  }

  private calculateSynchronicity(timestamps: Date[]): number {
    if (timestamps.length < 2) return 0;

    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i].getTime() - timestamps[i - 1].getTime());
    }

    const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce((sum, i) => sum + Math.pow(i - meanInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Lower stdDev relative to mean = higher synchronicity
    const cv = meanInterval > 0 ? stdDev / meanInterval : 1;
    return Math.max(0, Math.min(1, 1 - cv));
  }

  private async calculateContentSimilarity(contentHashes: string[]): Promise<number> {
    if (contentHashes.length < 2) return 0;

    // Count unique hashes
    const uniqueHashes = new Set(contentHashes);
    const duplicateRatio = 1 - uniqueHashes.size / contentHashes.length;

    return duplicateRatio;
  }

  private calculateNetworkDensity(actorIds: string[]): number {
    // Simplified - would analyze actual network connections
    // Higher density for fewer unique actors spreading same content
    const uniqueActors = new Set(actorIds);
    return Math.min(1, actorIds.length / (uniqueActors.size * 2));
  }

  private calculateAmplificationFactor(actorCount: number, contentCount: number): number {
    if (contentCount === 0) return 0;
    return actorCount / contentCount;
  }

  private buildChannelMetadata(
    platform: string,
    engagement?: { likes?: number; shares?: number; comments?: number }
  ): ChannelMetadata {
    const channelTypes: Record<string, ChannelType> = {
      twitter: ChannelType.SOCIAL_MEDIA,
      facebook: ChannelType.SOCIAL_MEDIA,
      instagram: ChannelType.SOCIAL_MEDIA,
      tiktok: ChannelType.VIDEO_PLATFORM,
      youtube: ChannelType.VIDEO_PLATFORM,
      telegram: ChannelType.MESSAGING_APP,
      whatsapp: ChannelType.MESSAGING_APP,
      web: ChannelType.NEWS_SITE,
      media: ChannelType.NEWS_SITE,
    };

    const totalEngagement = engagement
      ? (engagement.likes || 0) + (engagement.shares || 0) * 2 + (engagement.comments || 0) * 3
      : 0;

    let reach: ReachCategory;
    if (totalEngagement >= 1000000) reach = ReachCategory.MASSIVE;
    else if (totalEngagement >= 100000) reach = ReachCategory.LARGE;
    else if (totalEngagement >= 10000) reach = ReachCategory.MEDIUM;
    else if (totalEngagement >= 1000) reach = ReachCategory.SMALL;
    else reach = ReachCategory.MICRO;

    return {
      platform,
      channelType: channelTypes[platform.toLowerCase()] || ChannelType.SOCIAL_MEDIA,
      reach,
    };
  }

  private buildProvenance(
    sourceType: ProvenanceSourceType,
    processingPipeline: string[]
  ): SignalProvenance {
    return {
      sourceType,
      collectionMethod: "automated_collection",
      collectionTimestamp: new Date(),
      processingPipeline,
      dataQuality: {
        completeness: 0.9,
        accuracy: 0.85,
        timeliness: 0.95,
        consistency: 0.9,
      },
      attestations: [
        {
          attesterId: this.config.organizationId,
          attesterType: "AUTOMATED",
          timestamp: new Date(),
          confidence: 0.9,
          signature: this.createSecureHash(`${this.config.organizationId}:${Date.now()}`),
        },
      ],
    };
  }

  private buildFederationMetadata(): FederationMetadata {
    return {
      federationId: this.config.federationId,
      originNodeId: this.hashOrganizationId(this.config.organizationId),
      hopCount: 0,
      propagationPath: [this.hashOrganizationId(this.config.organizationId)],
      privacyBudgetUsed: 0.01,
      sharingAgreementId: this.config.sharingAgreementId,
      retentionPolicy: {
        maxRetentionDays: this.config.retentionDays,
        deleteOnExpiry: true,
        allowArchival: false,
      },
    };
  }
}

export default SignalNormalizer;
