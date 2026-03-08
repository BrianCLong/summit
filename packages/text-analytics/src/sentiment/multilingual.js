"use strict";
/**
 * Multilingual sentiment analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultilingualSentimentAnalyzer = void 0;
const index_1 = require("./index");
class MultilingualSentimentAnalyzer {
    analyzers = new Map();
    analyze(text, language) {
        let analyzer = this.analyzers.get(language);
        if (!analyzer) {
            analyzer = new index_1.SentimentAnalyzer();
            this.analyzers.set(language, analyzer);
        }
        return analyzer.analyze(text);
    }
}
exports.MultilingualSentimentAnalyzer = MultilingualSentimentAnalyzer;
