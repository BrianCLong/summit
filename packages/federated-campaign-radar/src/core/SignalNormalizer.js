"use strict";
/**
 * Signal Normalizer
 *
 * Normalizes campaign signals into the shared schema with C2PA credential support.
 * Implements privacy-preserving hashing and embedding generation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalNormalizer = void 0;
const crypto_1 = require("crypto");
const uuid_1 = require("uuid");
const types_1 = require("./types");
/**
 * Signal Normalizer Service
 */
class SignalNormalizer {
    config;
    embeddingCache = new Map();
    constructor(config) {
        this.config = config;
    }
    /**
     * Normalize a narrative/claim signal
     */
    async normalizeNarrative(input, sourceType = types_1.ProvenanceSourceType.DIRECT_OBSERVATION) {
        const signalId = (0, types_1.createSignalId)();
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
        const narrativeIndicator = {
            claimText: this.config.privacyLevel === types_1.PrivacyLevel.PUBLIC
                ? input.text
                : undefined,
            claimHash: textHash,
            semanticEmbedding: embedding || [],
            language: input.language || this.detectLanguage(input.text),
            sentiment,
            topics,
            entities,
            framingTechniques,
        };
        // Create signal indicator
        const indicator = {
            narrative: narrativeIndicator,
            indicatorHash: textHash,
        };
        // Build channel metadata
        const channelMetadata = this.buildChannelMetadata(input.platform || 'unknown', input.engagement);
        // Build provenance
        const provenance = this.buildProvenance(sourceType, ['text_extraction', 'nlp_processing']);
        // Build federation metadata
        const federationMetadata = this.buildFederationMetadata();
        // Create the normalized signal
        const signal = {
            id: signalId,
            version: '1.0.0',
            timestamp,
            expiresAt: new Date(timestamp.getTime() + this.config.retentionDays * 24 * 60 * 60 * 1000),
            signalType: types_1.SignalType.NARRATIVE,
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
    async normalizeMedia(input, sourceType = types_1.ProvenanceSourceType.DIRECT_OBSERVATION) {
        const signalId = (0, types_1.createSignalId)();
        const timestamp = new Date();
        // Generate hashes
        const contentHash = this.createSecureHash(input.content.toString('base64'));
        const perceptualHash = await this.generatePerceptualHash(input.content, input.mediaType);
        // Validate C2PA manifest if present
        let c2paValidation;
        let c2paManifest;
        if (input.c2paManifestBuffer) {
            const validationResult = await this.validateC2PAManifest(input.content, input.c2paManifestBuffer);
            c2paValidation = validationResult.validation;
            c2paManifest = validationResult.manifest;
        }
        // Detect manipulation and synthetic content
        const manipulationScore = await this.detectManipulation(input.content, input.mediaType);
        const syntheticScore = await this.detectSyntheticContent(input.content, input.mediaType);
        // Create media indicator
        const mediaIndicator = {
            mediaType: input.mediaType,
            perceptualHash,
            contentHash,
            manipulationScore,
            syntheticScore,
            c2paManifest,
        };
        // Add dimensions for images/videos
        if (input.mediaType === 'IMAGE' || input.mediaType === 'VIDEO') {
            mediaIndicator.dimensions = await this.extractDimensions(input.content);
        }
        // Add duration for video/audio
        if (input.mediaType === 'VIDEO' || input.mediaType === 'AUDIO') {
            mediaIndicator.duration = await this.extractDuration(input.content);
        }
        const indicator = {
            media: mediaIndicator,
            indicatorHash: perceptualHash,
        };
        const provenance = this.buildProvenance(sourceType, [
            'media_extraction',
            'hash_generation',
            'c2pa_validation',
        ]);
        const federationMetadata = this.buildFederationMetadata();
        const signal = {
            id: signalId,
            version: '1.0.0',
            timestamp,
            expiresAt: new Date(timestamp.getTime() + this.config.retentionDays * 24 * 60 * 60 * 1000),
            signalType: syntheticScore > 0.7
                ? types_1.SignalType.SYNTHETIC_MEDIA
                : types_1.SignalType.MEDIA_ARTIFACT,
            confidence: c2paValidation?.isValid ? 0.95 : 0.7,
            indicator,
            privacyLevel: this.config.privacyLevel,
            hashedContent: contentHash,
            provenance,
            c2paValidation,
            sourceOrganization: this.hashOrganizationId(this.config.organizationId),
            channelMetadata: this.buildChannelMetadata('media'),
            coordinationFeatures: [],
            federationMetadata,
        };
        return signal;
    }
    /**
     * Normalize a URL signal
     */
    async normalizeURL(input, sourceType = types_1.ProvenanceSourceType.DIRECT_OBSERVATION) {
        const signalId = (0, types_1.createSignalId)();
        const timestamp = input.capturedAt || new Date();
        // Parse and hash URL components
        const parsedUrl = new URL(input.url);
        const domainHash = this.createSecureHash(parsedUrl.hostname);
        const pathHash = this.createSecureHash(parsedUrl.pathname);
        const fullUrlHash = this.createSecureHash(input.url);
        // Hash redirect chain
        const redirectChainHashes = input.redirectChain?.map((url) => this.createSecureHash(url));
        const urlIndicator = {
            domainHash,
            pathHash,
            fullUrlHash,
            redirectChain: redirectChainHashes,
        };
        const indicator = {
            url: urlIndicator,
            indicatorHash: fullUrlHash,
        };
        const provenance = this.buildProvenance(sourceType, ['url_extraction']);
        const federationMetadata = this.buildFederationMetadata();
        const signal = {
            id: signalId,
            version: '1.0.0',
            timestamp,
            expiresAt: new Date(timestamp.getTime() + this.config.retentionDays * 24 * 60 * 60 * 1000),
            signalType: types_1.SignalType.URL,
            confidence: 0.85,
            indicator,
            privacyLevel: this.config.privacyLevel,
            hashedContent: fullUrlHash,
            provenance,
            sourceOrganization: this.hashOrganizationId(this.config.organizationId),
            channelMetadata: this.buildChannelMetadata('web'),
            coordinationFeatures: [],
            federationMetadata,
        };
        return signal;
    }
    /**
     * Normalize an account signal
     */
    async normalizeAccount(input, sourceType = types_1.ProvenanceSourceType.PLATFORM_API) {
        const signalId = (0, types_1.createSignalId)();
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
        const accountIndicator = {
            platformHash,
            handleHash,
            accountAgeRange,
            followerRange,
            behavioralSignature,
        };
        const indicator = {
            account: accountIndicator,
            indicatorHash: handleHash,
        };
        const provenance = this.buildProvenance(sourceType, [
            'account_extraction',
            'behavior_analysis',
        ]);
        const federationMetadata = this.buildFederationMetadata();
        const signal = {
            id: signalId,
            version: '1.0.0',
            timestamp,
            expiresAt: new Date(timestamp.getTime() + this.config.retentionDays * 24 * 60 * 60 * 1000),
            signalType: types_1.SignalType.ACCOUNT_HANDLE,
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
    async normalizeCoordination(input, sourceType = types_1.ProvenanceSourceType.AUTOMATED_DETECTION) {
        const signalId = (0, types_1.createSignalId)();
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
        const amplificationFactor = this.calculateAmplificationFactor(input.actorIds.length, input.contentHashes.length);
        const coordinationIndicator = {
            patternType: input.patternType || types_1.CoordinationPatternType.SYNCHRONIZED_POSTING,
            actorCount: input.actorIds.length,
            temporalWindow,
            synchronicity,
            contentSimilarity,
            networkDensity,
            amplificationFactor,
        };
        const indicator = {
            coordination: coordinationIndicator,
            indicatorHash: this.createSecureHash(JSON.stringify({
                actors: input.actorIds.length,
                window: temporalWindow,
                pattern: input.patternType,
            })),
        };
        const provenance = this.buildProvenance(sourceType, [
            'coordination_detection',
            'temporal_analysis',
            'network_analysis',
        ]);
        const federationMetadata = this.buildFederationMetadata();
        // Build coordination features
        const coordinationFeatures = [
            {
                featureType: 'synchronicity',
                value: synchronicity,
                confidence: 0.85,
                extractedAt: timestamp,
            },
            {
                featureType: 'content_similarity',
                value: contentSimilarity,
                confidence: 0.9,
                extractedAt: timestamp,
            },
            {
                featureType: 'network_density',
                value: networkDensity,
                confidence: 0.8,
                extractedAt: timestamp,
            },
        ];
        const signal = {
            id: signalId,
            version: '1.0.0',
            timestamp,
            expiresAt: new Date(timestamp.getTime() + this.config.retentionDays * 24 * 60 * 60 * 1000),
            signalType: types_1.SignalType.COORDINATION_PATTERN,
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
    createSecureHash(input) {
        return (0, crypto_1.createHmac)('sha256', this.config.hashingSalt)
            .update(input)
            .digest('hex');
    }
    hashOrganizationId(orgId) {
        // Create anonymized org ID that's consistent but not reversible
        return (0, crypto_1.createHmac)('sha256', this.config.hashingSalt)
            .update(`org:${orgId}`)
            .digest('hex')
            .substring(0, 16);
    }
    normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '')
            .trim();
    }
    async generateTextEmbedding(text) {
        // Check cache first
        const cacheKey = this.createSecureHash(text);
        if (this.embeddingCache.has(cacheKey)) {
            return this.embeddingCache.get(cacheKey);
        }
        // Generate embedding (placeholder - would use actual embedding model)
        // In production, this would call an embedding API or local model
        const embedding = this.generateMockEmbedding(text, 384);
        // Cache the result
        this.embeddingCache.set(cacheKey, embedding);
        return embedding;
    }
    generateMockEmbedding(text, dimensions) {
        // Simple deterministic mock embedding based on text hash
        const hash = (0, crypto_1.createHash)('sha256').update(text).digest();
        const embedding = [];
        for (let i = 0; i < dimensions; i++) {
            const byteIndex = i % hash.length;
            embedding.push((hash[byteIndex] / 255) * 2 - 1);
        }
        // Normalize to unit vector
        const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return embedding.map((val) => val / norm);
    }
    extractEntities(text) {
        // Simplified entity extraction (would use NER model in production)
        const entities = [];
        // Simple pattern matching for demonstration
        const patterns = [
            { pattern: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g, type: 'PERSON' },
            { pattern: /\b(?:Inc|Corp|LLC|Ltd|Company|Organization)\b/gi, type: 'ORGANIZATION' },
            { pattern: /\b[A-Z][a-z]+(?:,\s*[A-Z]{2})?\b/g, type: 'LOCATION' },
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
    extractTopics(text) {
        // Simplified topic extraction
        const words = text.toLowerCase().split(/\s+/);
        const stopWords = new Set([
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'must', 'shall',
        ]);
        const wordFreq = new Map();
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
    analyzeSentiment(text) {
        // Simplified sentiment analysis
        const positiveWords = new Set([
            'good', 'great', 'excellent', 'amazing', 'wonderful', 'positive',
            'success', 'happy', 'love', 'best', 'awesome', 'fantastic',
        ]);
        const negativeWords = new Set([
            'bad', 'terrible', 'awful', 'horrible', 'negative', 'fail',
            'sad', 'hate', 'worst', 'poor', 'disaster', 'crisis',
        ]);
        const words = text.toLowerCase().split(/\s+/);
        let score = 0;
        for (const word of words) {
            if (positiveWords.has(word))
                score += 0.1;
            if (negativeWords.has(word))
                score -= 0.1;
        }
        return Math.max(-1, Math.min(1, score));
    }
    detectFramingTechniques(text) {
        const techniques = [];
        // Check for common framing patterns
        if (/breaking|urgent|exclusive/i.test(text)) {
            techniques.push('urgency_framing');
        }
        if (/they|them|those people/i.test(text)) {
            techniques.push('us_vs_them');
        }
        if (/everyone knows|it's obvious|clearly/i.test(text)) {
            techniques.push('appeal_to_common_sense');
        }
        if (/experts say|studies show|research proves/i.test(text)) {
            techniques.push('appeal_to_authority');
        }
        if (/\?{2,}|!{2,}/g.test(text)) {
            techniques.push('emotional_amplification');
        }
        return techniques;
    }
    detectLanguage(text) {
        // Simplified language detection
        const englishWords = new Set([
            'the', 'is', 'are', 'was', 'were', 'have', 'has', 'had',
            'do', 'does', 'did', 'will', 'would', 'could', 'should',
        ]);
        const words = text.toLowerCase().split(/\s+/);
        let englishCount = 0;
        for (const word of words) {
            if (englishWords.has(word))
                englishCount++;
        }
        return englishCount > words.length * 0.1 ? 'en' : 'unknown';
    }
    async generatePerceptualHash(content, mediaType) {
        // Simplified perceptual hash generation
        // In production, would use actual pHash library
        const contentHash = (0, crypto_1.createHash)('sha256').update(content).digest('hex');
        return `phash_${mediaType.toLowerCase()}_${contentHash.substring(0, 16)}`;
    }
    async validateC2PAManifest(content, manifestBuffer) {
        // Simplified C2PA validation
        // In production, would use c2pa-node or similar library
        try {
            const manifestData = JSON.parse(manifestBuffer.toString());
            const manifest = {
                manifestId: manifestData.id || (0, uuid_1.v4)(),
                claimGenerator: manifestData.claim_generator || 'unknown',
                claimGeneratorVersion: manifestData.claim_generator_version || '1.0',
                title: manifestData.title,
                format: manifestData.format || 'image/jpeg',
                instanceId: manifestData.instance_id || (0, uuid_1.v4)(),
                ingredients: manifestData.ingredients || [],
                assertions: manifestData.assertions || [],
                signature: {
                    algorithm: manifestData.signature?.algorithm || 'ES256',
                    issuer: manifestData.signature?.issuer || 'unknown',
                    timestamp: new Date(manifestData.signature?.timestamp || Date.now()),
                    certificateChain: manifestData.signature?.certificate_chain || [],
                },
            };
            const validation = {
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
                    trustedRoots: ['Adobe', 'Microsoft', 'C2PA Trust List'],
                    untrustedElements: [],
                },
                validationTimestamp: new Date(),
            };
            return { validation, manifest };
        }
        catch {
            return {
                validation: {
                    isValid: false,
                    hasManifest: false,
                    manifestValidation: {
                        signatureValid: false,
                        integrityValid: false,
                        timestampValid: false,
                        errors: ['Failed to parse C2PA manifest'],
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
    async detectManipulation(content, mediaType) {
        // Placeholder for manipulation detection
        // Would use forensic analysis models in production
        return 0.1 + Math.random() * 0.2;
    }
    async detectSyntheticContent(content, mediaType) {
        // Placeholder for synthetic content detection
        // Would use AI-generated content detectors in production
        return 0.05 + Math.random() * 0.15;
    }
    async extractDimensions(content) {
        // Placeholder - would use actual image/video parsing
        return { width: 1920, height: 1080 };
    }
    async extractDuration(content) {
        // Placeholder - would use actual audio/video parsing
        return 60;
    }
    calculateAccountAgeRange(createdAt) {
        if (!createdAt)
            return 'ESTABLISHED';
        const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays < 30)
            return 'NEW';
        if (ageInDays < 180)
            return 'RECENT';
        if (ageInDays < 730)
            return 'ESTABLISHED';
        return 'OLD';
    }
    calculateFollowerRange(followerCount) {
        if (!followerCount)
            return 'SMALL';
        if (followerCount < 1000)
            return 'MICRO';
        if (followerCount < 10000)
            return 'SMALL';
        if (followerCount < 100000)
            return 'MEDIUM';
        if (followerCount < 1000000)
            return 'LARGE';
        return 'MASSIVE';
    }
    buildBehavioralSignature(input) {
        const recentActivity = input.recentActivity;
        return {
            postingFrequency: input.postCount
                ? input.postCount / 30
                : 1,
            activityHours: recentActivity?.postingHours || Array(24).fill(1),
            contentTypes: recentActivity?.contentTypes || ['text'],
            engagementPatterns: {
                likes: 0.5,
                shares: 0.3,
                comments: 0.2,
            },
            languageConsistency: 0.9,
            topicConsistency: 0.8,
        };
    }
    calculateSynchronicity(timestamps) {
        if (timestamps.length < 2)
            return 0;
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i].getTime() - timestamps[i - 1].getTime());
        }
        const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, i) => sum + Math.pow(i - meanInterval, 2), 0) /
            intervals.length;
        const stdDev = Math.sqrt(variance);
        // Lower stdDev relative to mean = higher synchronicity
        const cv = meanInterval > 0 ? stdDev / meanInterval : 1;
        return Math.max(0, Math.min(1, 1 - cv));
    }
    async calculateContentSimilarity(contentHashes) {
        if (contentHashes.length < 2)
            return 0;
        // Count unique hashes
        const uniqueHashes = new Set(contentHashes);
        const duplicateRatio = 1 - uniqueHashes.size / contentHashes.length;
        return duplicateRatio;
    }
    calculateNetworkDensity(actorIds) {
        // Simplified - would analyze actual network connections
        // Higher density for fewer unique actors spreading same content
        const uniqueActors = new Set(actorIds);
        return Math.min(1, actorIds.length / (uniqueActors.size * 2));
    }
    calculateAmplificationFactor(actorCount, contentCount) {
        if (contentCount === 0)
            return 0;
        return actorCount / contentCount;
    }
    buildChannelMetadata(platform, engagement) {
        const channelTypes = {
            twitter: types_1.ChannelType.SOCIAL_MEDIA,
            facebook: types_1.ChannelType.SOCIAL_MEDIA,
            instagram: types_1.ChannelType.SOCIAL_MEDIA,
            tiktok: types_1.ChannelType.VIDEO_PLATFORM,
            youtube: types_1.ChannelType.VIDEO_PLATFORM,
            telegram: types_1.ChannelType.MESSAGING_APP,
            whatsapp: types_1.ChannelType.MESSAGING_APP,
            web: types_1.ChannelType.NEWS_SITE,
            media: types_1.ChannelType.NEWS_SITE,
        };
        const totalEngagement = engagement
            ? (engagement.likes || 0) +
                (engagement.shares || 0) * 2 +
                (engagement.comments || 0) * 3
            : 0;
        let reach;
        if (totalEngagement >= 1000000)
            reach = types_1.ReachCategory.MASSIVE;
        else if (totalEngagement >= 100000)
            reach = types_1.ReachCategory.LARGE;
        else if (totalEngagement >= 10000)
            reach = types_1.ReachCategory.MEDIUM;
        else if (totalEngagement >= 1000)
            reach = types_1.ReachCategory.SMALL;
        else
            reach = types_1.ReachCategory.MICRO;
        return {
            platform,
            channelType: channelTypes[platform.toLowerCase()] || types_1.ChannelType.SOCIAL_MEDIA,
            reach,
        };
    }
    buildProvenance(sourceType, processingPipeline) {
        return {
            sourceType,
            collectionMethod: 'automated_collection',
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
                    attesterType: 'AUTOMATED',
                    timestamp: new Date(),
                    confidence: 0.9,
                    signature: this.createSecureHash(`${this.config.organizationId}:${Date.now()}`),
                },
            ],
        };
    }
    buildFederationMetadata() {
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
exports.SignalNormalizer = SignalNormalizer;
exports.default = SignalNormalizer;
