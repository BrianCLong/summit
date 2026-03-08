"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataDiscoveryFusionEngine = void 0;
const events_1 = require("events");
const SourceScanner_js_1 = require("./scanner/SourceScanner.js");
const DataProfiler_js_1 = require("./profiler/DataProfiler.js");
const FusionEngine_js_1 = require("./fusion/FusionEngine.js");
const ConfidenceScorer_js_1 = require("./confidence/ConfidenceScorer.js");
const ContextPersistence_js_1 = require("./context/ContextPersistence.js");
const EventPublisher_js_1 = require("./events/EventPublisher.js");
const logger_js_1 = require("./utils/logger.js");
/**
 * Data Discovery & Fusion Engine
 * Orchestrates automated data discovery, profiling, and fusion
 */
class DataDiscoveryFusionEngine extends events_1.EventEmitter {
    scanner;
    profiler;
    fusion;
    confidence;
    context;
    eventPublisher;
    sources = new Map();
    profiles = new Map();
    fusionResults = new Map();
    recipes = new Map();
    config;
    startTime;
    constructor(config = {}) {
        super();
        this.config = {
            scanInterval: config.scanInterval ?? 60000, // 1 minute
            autoIngestThreshold: config.autoIngestThreshold ?? 0.8,
            enableAutoDiscovery: config.enableAutoDiscovery ?? true,
            enableLearning: config.enableLearning ?? true,
            enableEventPublishing: config.enableEventPublishing ?? true,
            redisUrl: config.redisUrl,
        };
        // Initialize components
        this.scanner = new SourceScanner_js_1.SourceScanner({
            scanInterval: this.config.scanInterval,
            endpoints: [],
            autoIngestThreshold: this.config.autoIngestThreshold,
        });
        this.profiler = new DataProfiler_js_1.DataProfiler({
            sampleSize: 10000,
            detectPii: true,
            inferRelationships: true,
        });
        this.fusion = new FusionEngine_js_1.FusionEngine({
            defaultStrategy: 'fuzzy_match',
            similarityThreshold: 0.8,
            conflictResolution: 'most_complete',
            enableDeduplication: true,
        });
        this.confidence = new ConfidenceScorer_js_1.ConfidenceScorer();
        this.context = new ContextPersistence_js_1.ContextPersistence();
        this.eventPublisher = new EventPublisher_js_1.EventPublisher({ redisUrl: this.config.redisUrl });
        this.startTime = new Date();
        // Set up event handlers
        this.setupEventHandlers();
        // Initialize built-in automation recipes
        this.initializeRecipes();
        logger_js_1.logger.info('DataDiscoveryFusionEngine initialized', {
            config: this.config,
        });
    }
    /**
     * Start the engine (automated discovery)
     */
    async start() {
        // Connect event publisher
        if (this.config.enableEventPublishing) {
            await this.eventPublisher.connect();
        }
        if (this.config.enableAutoDiscovery) {
            this.scanner.start();
            logger_js_1.logger.info('Automated discovery started');
        }
    }
    /**
     * Stop the engine
     */
    async stop() {
        this.scanner.stop();
        await this.eventPublisher.disconnect();
        logger_js_1.logger.info('Engine stopped');
    }
    /**
     * Trigger a manual scan
     */
    async scan() {
        return this.scanner.scan();
    }
    /**
     * Add scan endpoint
     */
    addScanEndpoint(endpoint) {
        this.scanner.addEndpoint(endpoint);
    }
    /**
     * Get all discovered sources
     */
    getDiscoveredSources() {
        return Array.from(this.sources.values());
    }
    /**
     * Profile a data source
     */
    async profileSource(sourceId, data) {
        const source = this.sources.get(sourceId);
        if (!source) {
            throw new Error(`Source not found: ${sourceId}`);
        }
        source.status = 'profiling';
        const profile = await this.profiler.profile(source, data);
        source.status = 'ready';
        this.profiles.set(sourceId, profile);
        this.emit('source_profiled', { sourceId, profile });
        return profile;
    }
    /**
     * Get profile for a source
     */
    getProfile(sourceId) {
        return this.profiles.get(sourceId);
    }
    /**
     * Get profile report as markdown
     */
    getProfileReport(sourceId) {
        const profile = this.profiles.get(sourceId);
        if (!profile)
            return undefined;
        return this.profiler.generateReport(profile);
    }
    /**
     * Fuse records from multiple sources
     */
    async fuse(records, matchFields, strategy) {
        const results = await this.fusion.fuse(records, matchFields, strategy);
        // Apply learned corrections if learning is enabled
        const processedResults = this.config.enableLearning
            ? results.map(r => this.context.applyLearnedCorrections(r))
            : results;
        // Store results
        for (const result of processedResults) {
            this.fusionResults.set(result.id, result);
        }
        this.emit('fusion_completed', { count: processedResults.length });
        return processedResults;
    }
    /**
     * Deduplicate records
     */
    async deduplicate(records, matchFields) {
        const results = await this.fusion.deduplicate(records, matchFields);
        this.emit('dedup_completed', { clusters: results.length });
        return results;
    }
    /**
     * Get fusion result by ID
     */
    getFusionResult(id) {
        return this.fusionResults.get(id);
    }
    /**
     * Get confidence report for a fusion result
     */
    getConfidenceReport(fusionId) {
        const result = this.fusionResults.get(fusionId);
        if (!result)
            return undefined;
        return this.confidence.generateReport(result, this.profiles, this.sources);
    }
    /**
     * Get confidence visualization data
     */
    getConfidenceVisualization(fusionId) {
        const report = this.getConfidenceReport(fusionId);
        if (!report)
            return undefined;
        return this.confidence.generateVisualization(report);
    }
    /**
     * Record user feedback
     */
    recordFeedback(userId, fusionId, feedbackType, correction, comment) {
        const result = this.fusionResults.get(fusionId);
        if (!result) {
            throw new Error(`Fusion result not found: ${fusionId}`);
        }
        const feedback = this.context.recordFeedback(userId, result, feedbackType, correction, comment);
        // Update source reliability based on feedback
        if (feedbackType === 'correct') {
            for (const sourceId of result.lineage.sources) {
                this.confidence.updateSourceReliability(sourceId, 0.02);
            }
        }
        else if (feedbackType === 'incorrect') {
            for (const sourceId of result.lineage.sources) {
                this.confidence.updateSourceReliability(sourceId, -0.05);
            }
        }
        this.emit('feedback_received', { feedbackId: feedback.id, type: feedbackType });
        return feedback;
    }
    /**
     * Get feedback for a fusion result
     */
    getFeedback(fusionId) {
        return this.context.getFeedback(fusionId);
    }
    /**
     * Get learning statistics
     */
    getLearningStats() {
        return this.context.getStats();
    }
    /**
     * Get learning context for a source
     */
    getLearningContext(sourceId) {
        return this.context.getContext(sourceId);
    }
    /**
     * Get available automation recipes
     */
    getAutomationRecipes() {
        return Array.from(this.recipes.values());
    }
    /**
     * Execute an automation recipe
     */
    async executeRecipe(recipeId, params) {
        const recipe = this.recipes.get(recipeId);
        if (!recipe) {
            throw new Error(`Recipe not found: ${recipeId}`);
        }
        logger_js_1.logger.info('Executing recipe', { recipeId, name: recipe.name });
        const results = [];
        for (const step of recipe.steps) {
            const stepResult = await this.executeRecipeStep(step, params);
            results.push(stepResult);
        }
        return { recipeId, results };
    }
    /**
     * Execute a single recipe step
     */
    async executeRecipeStep(step, params) {
        switch (step.action) {
            case 'scan':
                return this.scan();
            case 'profile':
                const sourceId = (params.sourceId || step.params.sourceId);
                const data = (params.data || step.params.data);
                return this.profileSource(sourceId, data);
            case 'fuse':
                const records = (params.records || step.params.records);
                const matchFields = (params.matchFields || step.params.matchFields);
                return this.fuse(records, matchFields);
            case 'deduplicate':
                const dedupRecords = (params.records || step.params.records);
                const dedupFields = (params.matchFields || step.params.matchFields);
                return this.deduplicate(dedupRecords, dedupFields);
            default:
                throw new Error(`Unknown action: ${step.action}`);
        }
    }
    /**
     * Get engine statistics
     */
    getStats() {
        return {
            uptime: Date.now() - this.startTime.getTime(),
            sources: this.sources.size,
            profiles: this.profiles.size,
            fusionResults: this.fusionResults.size,
            recipes: this.recipes.size,
            learning: this.context.getStats(),
        };
    }
    /**
     * Set up internal event handlers
     */
    setupEventHandlers() {
        // Handle discovered sources
        this.scanner.on('event', (event) => {
            if (event.type === 'source_discovered') {
                const source = event.payload;
                this.sources.set(source.id, source);
                this.emit('source_discovered', source);
            }
        });
        // Handle auto-ingest triggers
        this.scanner.on('auto_ingest', (source) => {
            logger_js_1.logger.info('Auto-ingest triggered', { sourceId: source.id, name: source.name });
            this.emit('auto_ingest', source);
        });
    }
    /**
     * Initialize built-in automation recipes
     */
    initializeRecipes() {
        this.recipes.set('full-discovery', {
            id: 'full-discovery',
            name: 'Full Discovery Pipeline',
            description: 'Scan, profile, and prepare all sources',
            steps: [
                { action: 'scan', params: {} },
            ],
        });
        this.recipes.set('entity-fusion', {
            id: 'entity-fusion',
            name: 'Entity Fusion',
            description: 'Fuse entities from multiple sources',
            steps: [
                { action: 'fuse', params: { matchFields: ['name', 'email'] } },
            ],
        });
        this.recipes.set('dedup-cleanup', {
            id: 'dedup-cleanup',
            name: 'Deduplication Cleanup',
            description: 'Remove duplicate records',
            steps: [
                { action: 'deduplicate', params: { matchFields: ['name', 'email'] } },
            ],
        });
    }
}
exports.DataDiscoveryFusionEngine = DataDiscoveryFusionEngine;
