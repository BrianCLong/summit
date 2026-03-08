"use strict";
/**
 * Sentiment and emotion analysis
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentimentAnalyzer = void 0;
class SentimentAnalyzer {
    positiveWords;
    negativeWords;
    emotionLexicon;
    constructor() {
        this.positiveWords = this.loadPositiveWords();
        this.negativeWords = this.loadNegativeWords();
        this.emotionLexicon = this.loadEmotionLexicon();
    }
    /**
     * Analyze sentiment of text
     */
    analyze(text) {
        const words = text.toLowerCase().match(/\w+/g) || [];
        let positiveCount = 0;
        let negativeCount = 0;
        for (const word of words) {
            if (this.positiveWords.has(word)) {
                positiveCount++;
            }
            if (this.negativeWords.has(word)) {
                negativeCount++;
            }
        }
        const total = positiveCount + negativeCount;
        const score = total === 0 ? 0 : (positiveCount - negativeCount) / total;
        let sentiment;
        if (score > 0.1) {
            sentiment = 'positive';
        }
        else if (score < -0.1) {
            sentiment = 'negative';
        }
        else {
            sentiment = 'neutral';
        }
        const confidence = Math.min(Math.abs(score) + 0.5, 1.0);
        return {
            sentiment,
            score,
            confidence,
            emotions: this.detectEmotions(text),
        };
    }
    /**
     * Aspect-based sentiment analysis
     */
    analyzeAspects(text, aspects) {
        const results = [];
        for (const aspect of aspects) {
            const mentions = this.findAspectMentions(text, aspect);
            const aspectSentiment = this.analyzeAspectSentiment(text, aspect, mentions);
            results.push({
                aspect,
                sentiment: aspectSentiment.sentiment,
                score: aspectSentiment.score,
                mentions,
            });
        }
        return results;
    }
    /**
     * Detect emotions in text
     */
    detectEmotions(text) {
        const emotions = new Map([
            ['joy', 0],
            ['anger', 0],
            ['fear', 0],
            ['sadness', 0],
            ['surprise', 0],
            ['disgust', 0],
        ]);
        const words = text.toLowerCase().match(/\w+/g) || [];
        for (const word of words) {
            const emotionScores = this.emotionLexicon.get(word);
            if (emotionScores) {
                for (const score of emotionScores) {
                    const current = emotions.get(score.emotion) || 0;
                    emotions.set(score.emotion, current + score.score);
                }
            }
        }
        const result = [];
        for (const [emotion, score] of emotions) {
            if (score > 0) {
                result.push({
                    emotion: emotion,
                    score,
                    confidence: Math.min(score / 5, 1.0),
                });
            }
        }
        return result.sort((a, b) => b.score - a.score);
    }
    /**
     * Detect sarcasm and irony
     */
    detectSarcasm(text) {
        const sarcasmIndicators = [
            'yeah right',
            'sure',
            'totally',
            'obviously',
            'clearly',
            'of course',
        ];
        const lower = text.toLowerCase();
        let indicatorCount = 0;
        for (const indicator of sarcasmIndicators) {
            if (lower.includes(indicator)) {
                indicatorCount++;
            }
        }
        // Check for contradicting sentiment
        const sentiment = this.analyze(text);
        const hasExclamation = /!+/.test(text);
        const hasQuotes = /"[^"]*"/.test(text);
        const sarcasmScore = indicatorCount * 0.3 +
            (hasExclamation ? 0.2 : 0) +
            (hasQuotes ? 0.2 : 0);
        return {
            isSarcastic: sarcasmScore > 0.5,
            confidence: Math.min(sarcasmScore, 1.0),
        };
    }
    /**
     * Track sentiment over time
     */
    trackSentiment(texts) {
        return texts.map((item) => ({
            timestamp: item.timestamp,
            sentiment: this.analyze(item.text),
        }));
    }
    /**
     * Find aspect mentions in text
     */
    findAspectMentions(text, aspect) {
        const mentions = [];
        const pattern = new RegExp(`\\b${aspect}\\b`, 'gi');
        let match;
        while ((match = pattern.exec(text)) !== null) {
            mentions.push({
                text: match[0],
                start: match.index,
                end: match.index + match[0].length,
            });
        }
        return mentions;
    }
    /**
     * Analyze sentiment for specific aspect
     */
    analyzeAspectSentiment(text, aspect, mentions) {
        if (mentions.length === 0) {
            return { sentiment: 'neutral', score: 0 };
        }
        let totalScore = 0;
        for (const mention of mentions) {
            // Get context around mention
            const contextStart = Math.max(0, mention.start - 50);
            const contextEnd = Math.min(text.length, mention.end + 50);
            const context = text.substring(contextStart, contextEnd);
            const contextSentiment = this.analyze(context);
            totalScore += contextSentiment.score;
        }
        const avgScore = totalScore / mentions.length;
        let sentiment;
        if (avgScore > 0.1) {
            sentiment = 'positive';
        }
        else if (avgScore < -0.1) {
            sentiment = 'negative';
        }
        else {
            sentiment = 'neutral';
        }
        return { sentiment, score: avgScore };
    }
    /**
     * Load positive words lexicon
     */
    loadPositiveWords() {
        return new Set([
            'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
            'love', 'best', 'perfect', 'awesome', 'brilliant', 'outstanding',
            'superb', 'magnificent', 'exceptional', 'marvelous', 'fabulous',
            'happy', 'joy', 'pleased', 'delighted', 'satisfied', 'positive',
            // Add more positive words
        ]);
    }
    /**
     * Load negative words lexicon
     */
    loadNegativeWords() {
        return new Set([
            'bad', 'terrible', 'awful', 'horrible', 'poor', 'worst',
            'hate', 'disappointing', 'useless', 'pathetic', 'disgusting',
            'sad', 'angry', 'frustrated', 'annoyed', 'upset', 'negative',
            'fail', 'failed', 'failure', 'wrong', 'broken', 'error',
            // Add more negative words
        ]);
    }
    /**
     * Load emotion lexicon
     */
    loadEmotionLexicon() {
        const lexicon = new Map();
        // Joy
        lexicon.set('happy', [{ emotion: 'joy', score: 0.9, confidence: 0.9 }]);
        lexicon.set('joy', [{ emotion: 'joy', score: 1.0, confidence: 1.0 }]);
        lexicon.set('delighted', [{ emotion: 'joy', score: 0.95, confidence: 0.95 }]);
        // Anger
        lexicon.set('angry', [{ emotion: 'anger', score: 0.9, confidence: 0.9 }]);
        lexicon.set('furious', [{ emotion: 'anger', score: 1.0, confidence: 1.0 }]);
        lexicon.set('mad', [{ emotion: 'anger', score: 0.8, confidence: 0.8 }]);
        // Fear
        lexicon.set('afraid', [{ emotion: 'fear', score: 0.9, confidence: 0.9 }]);
        lexicon.set('scared', [{ emotion: 'fear', score: 0.9, confidence: 0.9 }]);
        lexicon.set('terrified', [{ emotion: 'fear', score: 1.0, confidence: 1.0 }]);
        // Sadness
        lexicon.set('sad', [{ emotion: 'sadness', score: 0.9, confidence: 0.9 }]);
        lexicon.set('depressed', [{ emotion: 'sadness', score: 1.0, confidence: 1.0 }]);
        lexicon.set('miserable', [{ emotion: 'sadness', score: 0.95, confidence: 0.95 }]);
        return lexicon;
    }
}
exports.SentimentAnalyzer = SentimentAnalyzer;
__exportStar(require("./aspect-based"), exports);
__exportStar(require("./multilingual"), exports);
