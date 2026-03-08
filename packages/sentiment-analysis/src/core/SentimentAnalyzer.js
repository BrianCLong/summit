"use strict";
/**
 * Main sentiment analyzer orchestrating all sentiment analysis components
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentimentAnalyzer = void 0;
const BertSentimentModel_js_1 = require("../models/BertSentimentModel.js");
const EmotionClassifier_js_1 = require("../models/EmotionClassifier.js");
const SarcasmDetector_js_1 = require("../analyzers/SarcasmDetector.js");
const AspectBasedAnalyzer_js_1 = require("../analyzers/AspectBasedAnalyzer.js");
const TemporalSentimentTracker_js_1 = require("../analyzers/TemporalSentimentTracker.js");
class SentimentAnalyzer {
    sentimentModel;
    emotionClassifier;
    sarcasmDetector;
    aspectAnalyzer;
    temporalTracker;
    isInitialized = false;
    constructor(config) {
        this.sentimentModel = new BertSentimentModel_js_1.BertSentimentModel(config?.sentimentConfig);
        this.emotionClassifier = new EmotionClassifier_js_1.EmotionClassifier(config?.emotionConfig);
        this.sarcasmDetector = new SarcasmDetector_js_1.SarcasmDetector();
        this.aspectAnalyzer = new AspectBasedAnalyzer_js_1.AspectBasedAnalyzer(this.sentimentModel);
        this.temporalTracker = new TemporalSentimentTracker_js_1.TemporalSentimentTracker();
    }
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        await Promise.all([
            this.sentimentModel.initialize(),
            this.emotionClassifier.initialize(),
        ]);
        this.isInitialized = true;
        console.log('Sentiment Analyzer initialized successfully');
    }
    async analyze(text, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        const { includeEmotions = true, includeAspects = true, detectSarcasm = true, detectIrony = true, } = options;
        // Run sentiment analysis
        const overallSentiment = await this.sentimentModel.analyzeSentiment(text, options);
        // Run emotion classification
        const emotions = includeEmotions
            ? await this.emotionClassifier.classifyEmotions(text)
            : {
                anger: 0,
                fear: 0,
                joy: 0,
                sadness: 0,
                surprise: 0,
                disgust: 0,
                trust: 0,
            };
        // Run aspect-based analysis
        const aspects = includeAspects
            ? await this.aspectAnalyzer.analyzeAspects(text)
            : [];
        // Detect sarcasm and irony
        const sarcasmScore = detectSarcasm
            ? await this.sarcasmDetector.detectSarcasm(text, overallSentiment.compound)
            : 0;
        const ironyScore = detectIrony
            ? await this.sarcasmDetector.detectIrony(text, overallSentiment.compound)
            : 0;
        // Calculate subjectivity (based on emotion intensity)
        const subjectivity = this.calculateSubjectivity(emotions);
        // Calculate overall confidence
        const confidence = this.calculateConfidence(overallSentiment, emotions);
        return {
            text,
            overallSentiment,
            emotions,
            aspects,
            sarcasmScore,
            ironyScore,
            subjectivity,
            confidence,
            timestamp: new Date(),
        };
    }
    async analyzeBatch(texts, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return Promise.all(texts.map(text => this.analyze(text, options)));
    }
    trackSentiment(entityId, text, timestamp) {
        // This would typically be called after analyze()
        // For now, we'll do a quick analysis
        this.analyze(text).then(result => {
            this.temporalTracker.trackSentiment(entityId, result.overallSentiment, timestamp);
        });
    }
    getTemporalTracker() {
        return this.temporalTracker;
    }
    calculateSubjectivity(emotions) {
        // Higher emotion scores indicate more subjectivity
        const emotionTotal = emotions.anger +
            emotions.fear +
            emotions.joy +
            emotions.sadness +
            emotions.surprise +
            emotions.disgust;
        // Normalize to 0-1 range
        return Math.min(emotionTotal / 3, 1);
    }
    calculateConfidence(sentiment, emotions) {
        // Confidence based on decisiveness of sentiment and emotion scores
        const sentimentMax = Math.max(sentiment.positive, sentiment.negative, sentiment.neutral);
        const emotionMax = Math.max(emotions.anger, emotions.fear, emotions.joy, emotions.sadness, emotions.surprise, emotions.disgust, emotions.trust);
        return (sentimentMax + emotionMax) / 2;
    }
    async dispose() {
        await Promise.all([
            this.sentimentModel.dispose(),
            this.emotionClassifier.dispose(),
        ]);
        this.isInitialized = false;
    }
}
exports.SentimentAnalyzer = SentimentAnalyzer;
