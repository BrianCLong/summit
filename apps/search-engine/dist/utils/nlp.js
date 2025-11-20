import compromise from 'compromise';
import * as natural from 'natural';
import stopword from 'stopword';
const stopwordModule = stopword;
const { en, removeStopwords } = stopwordModule;
export class NLPProcessor {
    tokenizer;
    stemmer;
    sentimentAnalyzer;
    classifier;
    constructor() {
        this.tokenizer = new natural.WordTokenizer();
        this.stemmer = natural.PorterStemmer;
        this.sentimentAnalyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
        this.classifier = new natural.LogisticRegressionClassifier();
        this.initializeClassifier();
    }
    initializeClassifier() {
        const trainingData = [
            { text: 'threat malware attack vulnerability', label: 'security' },
            { text: 'person individual human people', label: 'entity' },
            { text: 'location address place geography', label: 'geographic' },
            { text: 'document file report paper', label: 'document' },
            { text: 'event incident occurrence happening', label: 'temporal' },
            {
                text: 'organization company business enterprise',
                label: 'organization',
            },
        ];
        trainingData.forEach((item) => {
            this.classifier.addDocument(item.text, item.label);
        });
        this.classifier.train();
    }
    tokenize(text) {
        return this.tokenizer.tokenize(text.toLowerCase()) || [];
    }
    removeStopwords(tokens, language = 'en') {
        const languageList = { en };
        return removeStopwords(tokens, languageList[language] || en);
    }
    stem(tokens) {
        return tokens.map((token) => this.stemmer.stem(token));
    }
    extractEntities(text) {
        const doc = compromise(text);
        return {
            people: doc.people().out('array'),
            places: doc.places().out('array'),
            organizations: doc.organizations().out('array'),
            dates: doc.dates?.().out('array') ?? [],
            misc: doc.topics().out('array'),
        };
    }
    extractKeyPhrases(text, maxPhrases = 10) {
        const tokens = this.tokenize(text);
        const cleanTokens = this.removeStopwords(tokens);
        const nGrams = this.generateNGrams(cleanTokens, 2, 3);
        const phraseFrequency = this.calculatePhraseFrequency(nGrams);
        return Object.entries(phraseFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, maxPhrases)
            .map(([phrase]) => phrase);
    }
    generateNGrams(tokens, minN, maxN) {
        const nGrams = [];
        for (let n = minN; n <= maxN; n++) {
            for (let i = 0; i <= tokens.length - n; i++) {
                const nGram = tokens.slice(i, i + n).join(' ');
                nGrams.push(nGram);
            }
        }
        return nGrams;
    }
    calculatePhraseFrequency(phrases) {
        const frequency = {};
        phrases.forEach((phrase) => {
            frequency[phrase] = (frequency[phrase] || 0) + 1;
        });
        return frequency;
    }
    analyzeSentiment(text) {
        const tokens = this.tokenize(text);
        const cleanTokens = this.removeStopwords(tokens);
        const score = this.sentimentAnalyzer.getSentiment(cleanTokens);
        let classification;
        if (score > 0.1) {
            classification = 'positive';
        }
        else if (score < -0.1) {
            classification = 'negative';
        }
        else {
            classification = 'neutral';
        }
        return {
            score,
            comparative: score / cleanTokens.length,
            classification,
        };
    }
    classifyIntent(text) {
        const features = this.extractFeatures(text);
        return this.classifier.classify(features.join(' '));
    }
    extractFeatures(text) {
        const tokens = this.tokenize(text);
        const cleanTokens = this.removeStopwords(tokens);
        const stemmedTokens = this.stem(cleanTokens);
        return stemmedTokens;
    }
    expandAcronyms(text) {
        const acronymMap = {
            IOC: 'Indicator of Compromise',
            TTPs: 'Tactics Techniques Procedures',
            APT: 'Advanced Persistent Threat',
            STIX: 'Structured Threat Information eXpression',
            TAXII: 'Trusted Automated eXchange of Indicator Information',
            CVE: 'Common Vulnerabilities and Exposures',
            CVSS: 'Common Vulnerability Scoring System',
            MITRE: 'MITRE ATT&CK Framework',
            TLP: 'Traffic Light Protocol',
            OSINT: 'Open Source Intelligence',
            HUMINT: 'Human Intelligence',
            SIGINT: 'Signals Intelligence',
            GEOINT: 'Geospatial Intelligence',
        };
        let expandedText = text;
        Object.entries(acronymMap).forEach(([acronym, expansion]) => {
            const regex = new RegExp(`\\b${acronym}\\b`, 'gi');
            expandedText = expandedText.replace(regex, `${acronym} (${expansion})`);
        });
        return expandedText;
    }
    detectLanguage(text) {
        const languages = [
            'english',
            'spanish',
            'french',
            'german',
            'italian',
            'portuguese',
        ];
        const scores = {};
        languages.forEach((lang) => {
            const langStopwords = stopwordModule[lang] || [];
            const tokens = this.tokenize(text);
            const stopwordCount = tokens.filter((token) => langStopwords.includes(token)).length;
            scores[lang] = stopwordCount / tokens.length;
        });
        return Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b)[0];
    }
    calculateTextSimilarity(text1, text2) {
        const tokens1 = new Set(this.removeStopwords(this.tokenize(text1)));
        const tokens2 = new Set(this.removeStopwords(this.tokenize(text2)));
        const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
        const union = new Set([...tokens1, ...tokens2]);
        return intersection.size / union.size;
    }
    generateSummary(text, maxSentences = 3) {
        const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
        if (sentences.length <= maxSentences) {
            return text;
        }
        const sentenceScores = sentences.map((sentence) => {
            const tokens = this.removeStopwords(this.tokenize(sentence));
            const keyPhrases = this.extractKeyPhrases(sentence, 5);
            return {
                sentence: sentence.trim(),
                score: tokens.length + keyPhrases.length * 2,
            };
        });
        return (sentenceScores
            .sort((a, b) => b.score - a.score)
            .slice(0, maxSentences)
            .map((item) => item.sentence)
            .join('. ') + '.');
    }
    extractDates(text) {
        const datePatterns = [
            /\b\d{4}-\d{2}-\d{2}\b/g,
            /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
            /\b\d{1,2}-\d{1,2}-\d{4}\b/g,
            /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi,
            /\b\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b/gi,
        ];
        const dates = [];
        datePatterns.forEach((pattern) => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const dateText = match[0];
                const normalized = this.normalizeDate(dateText);
                dates.push({
                    text: dateText,
                    start: match.index,
                    end: match.index + dateText.length,
                    normalized,
                });
            }
        });
        return dates.sort((a, b) => a.start - b.start);
    }
    normalizeDate(dateText) {
        try {
            const date = new Date(dateText);
            return date.toISOString().split('T')[0];
        }
        catch {
            return dateText;
        }
    }
    extractNumericValues(text) {
        const numericPattern = /\b(\d+(?:\.\d+)?)\s*([a-zA-Z%]+)?\b/g;
        const values = [];
        let match;
        while ((match = numericPattern.exec(text)) !== null) {
            const fullText = match[0];
            const value = parseFloat(match[1]);
            const unit = match[2];
            values.push({
                text: fullText,
                value,
                unit,
                start: match.index,
                end: match.index + fullText.length,
            });
        }
        return values;
    }
}
