"use strict";
/**
 * Message Analyzer - Text communications analysis
 * TRAINING/SIMULATION ONLY
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageAnalyzer = void 0;
const uuid_1 = require("uuid");
class MessageAnalyzer {
    selectors = new Map();
    entityPatterns = new Map();
    constructor() {
        this.initializePatterns();
        this.initializeDefaultSelectors();
    }
    initializePatterns() {
        this.entityPatterns.set('PHONE', [
            /\+?[\d\s\-().]{10,}/g,
            /\(\d{3}\)\s*\d{3}[\s-]?\d{4}/g
        ]);
        this.entityPatterns.set('EMAIL', [
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
        ]);
        this.entityPatterns.set('IP_ADDRESS', [
            /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
            /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g
        ]);
        this.entityPatterns.set('URL', [
            /https?:\/\/[^\s<>]+/gi
        ]);
        this.entityPatterns.set('COORDINATE', [
            /[-+]?(?:\d+\.?\d*|\.\d+)°?\s*[NS]?\s*,?\s*[-+]?(?:\d+\.?\d*|\.\d+)°?\s*[EW]?/gi,
            /\b\d{1,3}°\s*\d{1,2}'\s*\d{1,2}"?\s*[NSEW]\b/gi
        ]);
        this.entityPatterns.set('DATE', [
            /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
            /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi
        ]);
        this.entityPatterns.set('TIME', [
            /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|Z|UTC|GMT)?\b/gi,
            /\b\d{4}Z\b/g
        ]);
        this.entityPatterns.set('CALLSIGN', [
            /\b[A-Z]{4,6}[-\s]?\d{1,3}\b/g,
            /\b(?:ALPHA|BRAVO|CHARLIE|DELTA|ECHO|FOXTROT|GOLF|HOTEL|INDIA|JULIET|KILO|LIMA|MIKE|NOVEMBER|OSCAR|PAPA|QUEBEC|ROMEO|SIERRA|TANGO|UNIFORM|VICTOR|WHISKEY|XRAY|YANKEE|ZULU)(?:[-\s]\d+)?\b/gi
        ]);
    }
    initializeDefaultSelectors() {
        const defaults = [
            { id: (0, uuid_1.v4)(), type: 'keyword', value: 'EXERCISE', priority: 1, active: true },
            { id: (0, uuid_1.v4)(), type: 'keyword', value: 'TRAINING', priority: 1, active: true },
            { id: (0, uuid_1.v4)(), type: 'keyword', value: 'SIMULATION', priority: 1, active: true },
            { id: (0, uuid_1.v4)(), type: 'regex', value: '\\b(ALPHA|BRAVO|CHARLIE)\\s*\\d+\\b', priority: 2, active: true }
        ];
        defaults.forEach(s => this.selectors.set(s.id, s));
    }
    /**
     * Analyze a text message
     */
    async analyze(content) {
        const startTime = Date.now();
        const entities = this.extractEntities(content);
        const keywords = this.extractKeywords(content);
        const matchedSelectors = this.matchSelectors(content);
        const result = {
            id: (0, uuid_1.v4)(),
            originalContent: content,
            normalizedContent: this.normalizeText(content),
            language: this.detectLanguage(content),
            encoding: 'UTF-8',
            entities,
            keywords,
            topics: this.classifyTopics(content),
            sentiment: this.analyzeSentiment(content),
            urgency: this.assessUrgency(content),
            formality: this.assessFormality(content),
            matchedSelectors,
            analysisTimestamp: new Date(),
            processingTime: Date.now() - startTime,
            isSimulated: true
        };
        return result;
    }
    /**
     * Extract entities from text
     */
    extractEntities(content) {
        const entities = [];
        for (const [type, patterns] of this.entityPatterns) {
            for (const pattern of patterns) {
                const regex = new RegExp(pattern.source, pattern.flags);
                let match;
                while ((match = regex.exec(content)) !== null) {
                    entities.push({
                        text: match[0],
                        type,
                        confidence: 0.8 + Math.random() * 0.15,
                        position: { start: match.index, end: match.index + match[0].length }
                    });
                }
            }
        }
        // Remove duplicates
        const unique = entities.filter((e, i, arr) => arr.findIndex(x => x.text === e.text && x.type === e.type) === i);
        return unique;
    }
    /**
     * Extract keywords using TF-IDF-like scoring
     */
    extractKeywords(content) {
        const words = content.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3);
        // Simple frequency-based extraction
        const freq = new Map();
        words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
        // Filter stop words
        const stopWords = new Set([
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all',
            'can', 'her', 'was', 'one', 'our', 'out', 'this', 'that',
            'with', 'have', 'from', 'they', 'been', 'will', 'their'
        ]);
        return Array.from(freq.entries())
            .filter(([word]) => !stopWords.has(word))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word);
    }
    /**
     * Match configured selectors
     */
    matchSelectors(content) {
        const matched = [];
        for (const [id, selector] of this.selectors) {
            if (!selector.active)
                continue;
            let isMatch = false;
            switch (selector.type) {
                case 'keyword':
                    isMatch = content.toUpperCase().includes(selector.value.toUpperCase());
                    break;
                case 'regex':
                    try {
                        const regex = new RegExp(selector.value, 'gi');
                        isMatch = regex.test(content);
                    }
                    catch {
                        // Invalid regex
                    }
                    break;
            }
            if (isMatch) {
                matched.push(id);
            }
        }
        return matched;
    }
    /**
     * Topic classification (simplified)
     */
    classifyTopics(content) {
        const topicKeywords = {
            'Military Operations': ['operation', 'mission', 'tactical', 'objective', 'checkpoint'],
            'Communications': ['radio', 'transmission', 'frequency', 'signal', 'channel'],
            'Training': ['exercise', 'training', 'simulation', 'drill', 'practice'],
            'Logistics': ['supply', 'transport', 'equipment', 'resources', 'delivery']
        };
        const contentLower = content.toLowerCase();
        const topics = [];
        for (const [topic, keywords] of Object.entries(topicKeywords)) {
            const matches = keywords.filter(kw => contentLower.includes(kw)).length;
            if (matches > 0) {
                topics.push({
                    topic,
                    confidence: Math.min(0.95, 0.3 + matches * 0.2)
                });
            }
        }
        return topics.sort((a, b) => b.confidence - a.confidence);
    }
    /**
     * Simple sentiment analysis
     */
    analyzeSentiment(content) {
        const positive = ['good', 'success', 'complete', 'ready', 'confirmed'];
        const negative = ['fail', 'error', 'negative', 'abort', 'cancel'];
        const contentLower = content.toLowerCase();
        let score = 0;
        positive.forEach(w => { if (contentLower.includes(w))
            score += 0.2; });
        negative.forEach(w => { if (contentLower.includes(w))
            score -= 0.2; });
        return {
            score: Math.max(-1, Math.min(1, score)),
            magnitude: Math.abs(score)
        };
    }
    /**
     * Assess message urgency
     */
    assessUrgency(content) {
        const urgentKeywords = ['urgent', 'immediate', 'emergency', 'critical', 'asap', 'priority'];
        const contentLower = content.toLowerCase();
        const urgentCount = urgentKeywords.filter(kw => contentLower.includes(kw)).length;
        if (urgentCount >= 2)
            return 'critical';
        if (urgentCount === 1)
            return 'high';
        if (content === content.toUpperCase() && content.length > 20)
            return 'medium';
        return 'low';
    }
    /**
     * Assess formality level (0-1)
     */
    assessFormality(content) {
        const formalIndicators = ['pursuant', 'hereby', 'regarding', 'furthermore', 'accordingly'];
        const informalIndicators = ['hey', 'yeah', 'gonna', 'wanna', 'lol', 'btw'];
        const contentLower = content.toLowerCase();
        let score = 0.5;
        formalIndicators.forEach(w => { if (contentLower.includes(w))
            score += 0.1; });
        informalIndicators.forEach(w => { if (contentLower.includes(w))
            score -= 0.1; });
        return Math.max(0, Math.min(1, score));
    }
    /**
     * Normalize text for comparison
     */
    normalizeText(content) {
        return content
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }
    /**
     * Simple language detection
     */
    detectLanguage(content) {
        // Simplified - would use proper library in production
        return 'en';
    }
    /**
     * Add a selector
     */
    addSelector(selector) {
        const id = (0, uuid_1.v4)();
        this.selectors.set(id, { ...selector, id });
        return id;
    }
    /**
     * Remove a selector
     */
    removeSelector(id) {
        return this.selectors.delete(id);
    }
    /**
     * Get all selectors
     */
    getSelectors() {
        return Array.from(this.selectors.values());
    }
}
exports.MessageAnalyzer = MessageAnalyzer;
