"use strict";
/**
 * Advanced Psycholinguistic Analysis Module
 * Deep behavioral profiling through language patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PsycholinguisticAnalyzer = exports.DeceptionType = void 0;
var DeceptionType;
(function (DeceptionType) {
    DeceptionType["DISTANCING"] = "distancing";
    DeceptionType["QUALIFICATION"] = "qualification";
    DeceptionType["NEGATION_EXCESS"] = "negation_excess";
    DeceptionType["VAGUENESS"] = "vagueness";
    DeceptionType["DETAIL_MANIPULATION"] = "detail_manipulation";
    DeceptionType["TEMPORAL_INCONSISTENCY"] = "temporal_inconsistency";
    DeceptionType["EMOTIONAL_INCONGRUENCE"] = "emotional_incongruence";
    DeceptionType["PRONOUN_SHIFTING"] = "pronoun_shifting";
})(DeceptionType || (exports.DeceptionType = DeceptionType = {}));
class PsycholinguisticAnalyzer {
    liwcDictionary = new Map();
    personalityModels = [];
    deceptionModels = [];
    constructor() {
        this.initializeDictionaries();
        this.initializeModels();
    }
    initializeDictionaries() {
        // Initialize LIWC-like dictionaries
        this.liwcDictionary.set('positive_emotion', ['happy', 'joy', 'love', 'good', 'great', 'excellent']);
        this.liwcDictionary.set('negative_emotion', ['sad', 'angry', 'hate', 'bad', 'terrible', 'awful']);
        this.liwcDictionary.set('cognitive', ['think', 'know', 'believe', 'understand', 'realize']);
        this.liwcDictionary.set('tentative', ['maybe', 'perhaps', 'might', 'possibly', 'could']);
        this.liwcDictionary.set('certainty', ['always', 'never', 'definitely', 'certainly', 'absolutely']);
        this.liwcDictionary.set('first_person', ['i', 'me', 'my', 'mine', 'myself']);
        this.liwcDictionary.set('third_person', ['he', 'she', 'they', 'them', 'their']);
        this.liwcDictionary.set('negation', ['no', 'not', 'never', "don't", "won't", "can't"]);
    }
    initializeModels() {
        // Initialize personality and deception models
        this.personalityModels = [
            { name: 'big_five', version: '2.0', accuracy: 0.82 },
        ];
        this.deceptionModels = [
            { name: 'linguistic_inquiry', version: '1.5', accuracy: 0.75 },
            { name: 'statement_analysis', version: '2.0', accuracy: 0.78 },
        ];
    }
    /**
     * Comprehensive psycholinguistic analysis
     */
    async analyzeProfile(texts) {
        const combinedText = texts.join(' ');
        // Extract all features
        const personalityTraits = await this.analyzePersonality(texts);
        const emotionalProfile = await this.analyzeEmotions(texts);
        const cognitiveStyle = await this.analyzeCognitiveStyle(texts);
        const deceptionIndicators = await this.analyzeDeception(texts);
        const linguisticFingerprint = await this.extractLinguisticFingerprint(texts);
        const temporalEvolution = await this.analyzeTemporalEvolution(texts);
        // Detect anomalies
        const anomalies = await this.detectAnomalies(personalityTraits, emotionalProfile, linguisticFingerprint, temporalEvolution);
        // Calculate authenticity score
        const authenticityScore = this.calculateAuthenticityScore(deceptionIndicators, anomalies, temporalEvolution);
        return {
            personalityTraits,
            emotionalProfile,
            cognitiveStyle,
            deceptionIndicators,
            authenticityScore,
            linguisticFingerprint,
            temporalEvolution,
            anomalies,
        };
    }
    /**
     * Analyze Big Five personality traits from text
     */
    async analyzePersonality(texts) {
        const combinedText = texts.join(' ').toLowerCase();
        const words = combinedText.split(/\s+/);
        // Linguistic markers for each trait
        // Based on research in computational personality recognition
        // Openness: creative, intellectual vocabulary
        const opennessMarkers = ['creative', 'imagine', 'wonder', 'curious', 'explore', 'idea', 'theory'];
        const openness = this.countMarkers(words, opennessMarkers) / words.length * 100;
        // Conscientiousness: organized, methodical language
        const conscientiousnessMarkers = ['plan', 'organize', 'careful', 'detailed', 'responsible', 'schedule'];
        const conscientiousness = this.countMarkers(words, conscientiousnessMarkers) / words.length * 100;
        // Extraversion: social, enthusiastic language
        const extraversionMarkers = ['party', 'friend', 'fun', 'exciting', 'social', 'talk', 'people'];
        const extraversion = this.countMarkers(words, extraversionMarkers) / words.length * 100;
        // Agreeableness: warm, cooperative language
        const agreeablenessMarkers = ['help', 'kind', 'care', 'understand', 'support', 'together', 'share'];
        const agreeableness = this.countMarkers(words, agreeablenessMarkers) / words.length * 100;
        // Neuroticism: negative emotion, worry language
        const neuroticismMarkers = ['worry', 'anxious', 'stress', 'nervous', 'afraid', 'upset', 'sad'];
        const neuroticism = this.countMarkers(words, neuroticismMarkers) / words.length * 100;
        // Normalize to 0-1 scale
        const normalize = (value) => Math.min(value * 10, 1);
        return {
            openness: normalize(openness),
            conscientiousness: normalize(conscientiousness),
            extraversion: normalize(extraversion),
            agreeableness: normalize(agreeableness),
            neuroticism: normalize(neuroticism),
            confidence: Math.min(words.length / 1000, 1),
        };
    }
    countMarkers(words, markers) {
        return words.filter((w) => markers.includes(w)).length;
    }
    /**
     * Analyze emotional profile
     */
    async analyzeEmotions(texts) {
        const dominantEmotions = [];
        const sentimentProgression = [];
        // Analyze each text for emotions
        const emotions = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust'];
        const emotionCounts = {};
        for (const emotion of emotions) {
            emotionCounts[emotion] = 0;
        }
        for (const text of texts) {
            const textEmotions = this.detectEmotions(text);
            for (const [emotion, score] of Object.entries(textEmotions)) {
                emotionCounts[emotion] = (emotionCounts[emotion] || 0) + score;
            }
            // Track sentiment progression
            sentimentProgression.push(this.calculateSentiment(text));
        }
        // Convert to EmotionScore array
        for (const [emotion, count] of Object.entries(emotionCounts)) {
            if (count > 0) {
                dominantEmotions.push({
                    emotion,
                    score: count / texts.length,
                    frequency: count,
                });
            }
        }
        // Sort by score
        dominantEmotions.sort((a, b) => b.score - a.score);
        // Calculate emotional range and volatility
        const emotionalRange = this.calculateEmotionalRange(dominantEmotions);
        const emotionalVolatility = this.calculateVolatility(sentimentProgression);
        const affectiveConsistency = 1 - emotionalVolatility;
        return {
            dominantEmotions: dominantEmotions.slice(0, 5),
            emotionalRange,
            emotionalVolatility,
            sentimentProgression,
            affectiveConsistency,
        };
    }
    detectEmotions(text) {
        const words = text.toLowerCase().split(/\s+/);
        const emotions = {
            joy: 0,
            sadness: 0,
            anger: 0,
            fear: 0,
            surprise: 0,
            disgust: 0,
        };
        const emotionWords = {
            joy: ['happy', 'joy', 'excited', 'love', 'wonderful', 'great', 'amazing'],
            sadness: ['sad', 'unhappy', 'depressed', 'crying', 'miserable', 'lonely'],
            anger: ['angry', 'furious', 'mad', 'annoyed', 'frustrated', 'hate'],
            fear: ['afraid', 'scared', 'terrified', 'worried', 'anxious', 'nervous'],
            surprise: ['surprised', 'shocked', 'amazed', 'unexpected', 'wow'],
            disgust: ['disgusted', 'gross', 'awful', 'horrible', 'repulsed'],
        };
        for (const [emotion, markers] of Object.entries(emotionWords)) {
            emotions[emotion] = this.countMarkers(words, markers);
        }
        return emotions;
    }
    calculateSentiment(text) {
        const positiveWords = this.liwcDictionary.get('positive_emotion') || [];
        const negativeWords = this.liwcDictionary.get('negative_emotion') || [];
        const words = text.toLowerCase().split(/\s+/);
        const positive = this.countMarkers(words, positiveWords);
        const negative = this.countMarkers(words, negativeWords);
        return (positive - negative) / Math.max(words.length, 1);
    }
    calculateEmotionalRange(emotions) {
        if (emotions.length < 2)
            return 0;
        const scores = emotions.map((e) => e.score);
        return Math.max(...scores) - Math.min(...scores);
    }
    calculateVolatility(values) {
        if (values.length < 2)
            return 0;
        let totalChange = 0;
        for (let i = 1; i < values.length; i++) {
            totalChange += Math.abs(values[i] - values[i - 1]);
        }
        return totalChange / (values.length - 1);
    }
    /**
     * Analyze cognitive style
     */
    async analyzeCognitiveStyle(texts) {
        const combinedText = texts.join(' ').toLowerCase();
        const words = combinedText.split(/\s+/);
        // Analytical thinking markers
        const analyticalMarkers = ['because', 'therefore', 'thus', 'hence', 'consequently', 'analysis'];
        const analyticalThinking = this.countMarkers(words, analyticalMarkers) / words.length * 100;
        // Narrative thinking markers
        const narrativeMarkers = ['story', 'then', 'after', 'before', 'while', 'during'];
        const narrativeThinking = this.countMarkers(words, narrativeMarkers) / words.length * 100;
        // Temporal orientation
        const pastMarkers = ['was', 'were', 'did', 'had', 'used', 'ago', 'before'];
        const presentMarkers = ['is', 'are', 'am', 'do', 'now', 'today', 'currently'];
        const futureMarkers = ['will', 'going', 'plan', 'tomorrow', 'soon', 'later'];
        const pastFocus = this.countMarkers(words, pastMarkers);
        const presentFocus = this.countMarkers(words, presentMarkers);
        const futureFocus = this.countMarkers(words, futureMarkers);
        const totalTemporal = pastFocus + presentFocus + futureFocus || 1;
        // Certainty level
        const certaintyWords = this.liwcDictionary.get('certainty') || [];
        const tentativeWords = this.liwcDictionary.get('tentative') || [];
        const certainty = this.countMarkers(words, certaintyWords);
        const tentative = this.countMarkers(words, tentativeWords);
        const certaintyLevel = (certainty - tentative + 10) / 20;
        return {
            analyticalThinking: Math.min(analyticalThinking, 1),
            narrativeThinking: Math.min(narrativeThinking, 1),
            abstractReasoning: 0.5,
            concreteThinking: 0.5,
            temporalOrientation: {
                pastFocus: pastFocus / totalTemporal,
                presentFocus: presentFocus / totalTemporal,
                futureFocus: futureFocus / totalTemporal,
            },
            certaintyLevel: Math.max(0, Math.min(1, certaintyLevel)),
        };
    }
    /**
     * Analyze deception indicators
     */
    async analyzeDeception(texts) {
        const specificIndicators = [];
        const linguisticClues = [];
        const behavioralClues = [];
        for (const text of texts) {
            // Check for distancing language
            const distancing = this.detectDistancing(text);
            if (distancing.detected) {
                specificIndicators.push({
                    type: DeceptionType.DISTANCING,
                    strength: distancing.strength,
                    evidence: distancing.evidence,
                    confidence: 0.7,
                });
            }
            // Check for excessive negation
            const negation = this.detectExcessiveNegation(text);
            if (negation.detected) {
                specificIndicators.push({
                    type: DeceptionType.NEGATION_EXCESS,
                    strength: negation.strength,
                    evidence: negation.evidence,
                    confidence: 0.65,
                });
            }
            // Check for vagueness
            const vagueness = this.detectVagueness(text);
            if (vagueness.detected) {
                specificIndicators.push({
                    type: DeceptionType.VAGUENESS,
                    strength: vagueness.strength,
                    evidence: vagueness.evidence,
                    confidence: 0.6,
                });
            }
            // Check for pronoun shifting
            const pronounShifting = this.detectPronounShifting(texts);
            if (pronounShifting.detected) {
                specificIndicators.push({
                    type: DeceptionType.PRONOUN_SHIFTING,
                    strength: pronounShifting.strength,
                    evidence: pronounShifting.evidence,
                    confidence: 0.75,
                });
            }
        }
        // Calculate overall deception score
        const overallDeceptionScore = specificIndicators.length > 0
            ? specificIndicators.reduce((sum, ind) => sum + ind.strength * ind.confidence, 0) / specificIndicators.length
            : 0;
        return {
            overallDeceptionScore,
            specificIndicators,
            linguisticClues,
            behavioralClues,
        };
    }
    detectDistancing(text) {
        const words = text.toLowerCase().split(/\s+/);
        const evidence = [];
        // Distancing: reduced first-person pronouns, increased passive voice
        const firstPerson = this.countMarkers(words, ['i', 'me', 'my', 'mine']);
        const thirdPerson = this.countMarkers(words, ['he', 'she', 'they', 'it']);
        const distancingRatio = thirdPerson / Math.max(firstPerson + thirdPerson, 1);
        if (distancingRatio > 0.7) {
            evidence.push('High use of third-person pronouns');
        }
        // Check for passive voice indicators
        const passiveIndicators = ['was', 'were', 'been', 'being'];
        const passiveCount = this.countMarkers(words, passiveIndicators);
        if (passiveCount / words.length > 0.05) {
            evidence.push('High frequency of passive voice');
        }
        return {
            detected: evidence.length > 0,
            strength: evidence.length * 0.4,
            evidence,
        };
    }
    detectExcessiveNegation(text) {
        const words = text.toLowerCase().split(/\s+/);
        const negationWords = this.liwcDictionary.get('negation') || [];
        const negationCount = this.countMarkers(words, negationWords);
        const negationRate = negationCount / words.length;
        const evidence = [];
        if (negationRate > 0.05) {
            evidence.push(`High negation rate: ${(negationRate * 100).toFixed(1)}%`);
        }
        return {
            detected: negationRate > 0.05,
            strength: Math.min(negationRate * 10, 1),
            evidence,
        };
    }
    detectVagueness(text) {
        const words = text.toLowerCase().split(/\s+/);
        const vaguenessMarkers = ['something', 'somehow', 'somewhere', 'thing', 'stuff', 'kind of', 'sort of'];
        const vaguenessCount = this.countMarkers(words, vaguenessMarkers);
        const vaguenessRate = vaguenessCount / words.length;
        const evidence = [];
        if (vaguenessRate > 0.03) {
            evidence.push(`High vagueness rate: ${(vaguenessRate * 100).toFixed(1)}%`);
        }
        return {
            detected: vaguenessRate > 0.03,
            strength: Math.min(vaguenessRate * 20, 1),
            evidence,
        };
    }
    detectPronounShifting(texts) {
        const evidence = [];
        const pronounRatios = [];
        for (const text of texts) {
            const words = text.toLowerCase().split(/\s+/);
            const firstPerson = this.countMarkers(words, ['i', 'me', 'my']);
            const thirdPerson = this.countMarkers(words, ['he', 'she', 'they']);
            const total = firstPerson + thirdPerson;
            if (total > 0) {
                pronounRatios.push(firstPerson / total);
            }
        }
        if (pronounRatios.length < 2) {
            return { detected: false, strength: 0, evidence: [] };
        }
        // Check for significant shifts
        const volatility = this.calculateVolatility(pronounRatios);
        if (volatility > 0.3) {
            evidence.push('Significant pronoun usage shifts between texts');
        }
        return {
            detected: volatility > 0.3,
            strength: volatility,
            evidence,
        };
    }
    /**
     * Extract linguistic fingerprint
     */
    async extractLinguisticFingerprint(texts) {
        const combinedText = texts.join(' ');
        const words = combinedText.toLowerCase().split(/\s+/);
        // Vocabulary metrics
        const uniqueWords = new Set(words);
        const typeTokenRatio = uniqueWords.size / words.length;
        const hapaxLegomena = [...uniqueWords].filter((w) => words.filter((word) => word === w).length === 1).length;
        const averageWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
        // Function word profile
        const pronounProfile = this.analyzePronounProfile(words);
        return {
            vocabularyRichness: {
                typeTokenRatio,
                hapaxLegomena,
                averageWordLength,
                syllableComplexity: 0.5,
                vocabularyLevel: typeTokenRatio * 2,
                domainSpecificity: 0.3,
            },
            syntacticPatterns: [],
            functionWordUsage: {
                pronounUsage: pronounProfile,
                prepositionPatterns: [],
                conjunctionFrequency: 0,
                articleUsage: 0,
                auxiliaryPatterns: [],
            },
            punctuationPatterns: this.analyzePunctuation(combinedText),
            phraseologySignature: [],
            uniqueMarkers: [],
        };
    }
    analyzePronounProfile(words) {
        const firstSingular = this.countMarkers(words, ['i', 'me', 'my', 'mine', 'myself']);
        const firstPlural = this.countMarkers(words, ['we', 'us', 'our', 'ours', 'ourselves']);
        const secondPerson = this.countMarkers(words, ['you', 'your', 'yours', 'yourself']);
        const thirdSingular = this.countMarkers(words, ['he', 'she', 'him', 'her', 'his', 'hers']);
        const thirdPlural = this.countMarkers(words, ['they', 'them', 'their', 'theirs']);
        return {
            firstPersonSingular: firstSingular / words.length,
            firstPersonPlural: firstPlural / words.length,
            secondPerson: secondPerson / words.length,
            thirdPersonSingular: thirdSingular / words.length,
            thirdPersonPlural: thirdPlural / words.length,
            iWeRatio: firstSingular / Math.max(firstPlural, 1),
        };
    }
    analyzePunctuation(text) {
        const charCount = text.length;
        return {
            exclamationRate: (text.match(/!/g) || []).length / charCount,
            questionRate: (text.match(/\?/g) || []).length / charCount,
            ellipsisRate: (text.match(/\.\.\./g) || []).length / charCount,
            commaFrequency: (text.match(/,/g) || []).length / charCount,
            colonSemicolonRate: (text.match(/[;:]/g) || []).length / charCount,
        };
    }
    /**
     * Analyze temporal evolution
     */
    async analyzeTemporalEvolution(texts) {
        const periods = [];
        const suddenChanges = [];
        // Analyze each text as a period
        let prevCharacteristics = null;
        for (let i = 0; i < texts.length; i++) {
            const characteristics = await this.extractCharacteristics(texts[i]);
            if (prevCharacteristics) {
                const similarity = this.calculateCharacteristicSimilarity(prevCharacteristics, characteristics);
                if (similarity < 0.5) {
                    suddenChanges.push({
                        timestamp: new Date(),
                        affectedMetrics: Object.keys(characteristics),
                        magnitude: 1 - similarity,
                        possibleCauses: ['Style change', 'Different author', 'Topic shift'],
                    });
                }
            }
            periods.push({
                start: new Date(),
                end: new Date(),
                characteristics,
                similarity: prevCharacteristics ? this.calculateCharacteristicSimilarity(prevCharacteristics, characteristics) : 1,
            });
            prevCharacteristics = characteristics;
        }
        // Calculate overall consistency
        const similarities = periods.map((p) => p.similarity);
        const consistency = similarities.reduce((a, b) => a + b, 0) / similarities.length;
        // Calculate drift rate
        const driftRate = suddenChanges.length / Math.max(texts.length - 1, 1);
        return {
            periods,
            consistency,
            driftRate,
            suddenChanges,
        };
    }
    async extractCharacteristics(text) {
        const words = text.toLowerCase().split(/\s+/);
        return {
            wordCount: words.length,
            avgWordLength: words.reduce((sum, w) => sum + w.length, 0) / words.length,
            uniqueWordRatio: new Set(words).size / words.length,
            sentimentScore: this.calculateSentiment(text),
        };
    }
    calculateCharacteristicSimilarity(a, b) {
        const keys = Object.keys(a);
        let totalSimilarity = 0;
        for (const key of keys) {
            const aVal = a[key];
            const bVal = b[key];
            const maxVal = Math.max(Math.abs(aVal), Math.abs(bVal), 1);
            totalSimilarity += 1 - Math.abs(aVal - bVal) / maxVal;
        }
        return totalSimilarity / keys.length;
    }
    /**
     * Detect anomalies
     */
    async detectAnomalies(personality, emotional, fingerprint, evolution) {
        const anomalies = [];
        // Check for inconsistent personality
        if (personality.confidence < 0.3) {
            anomalies.push({
                type: 'low_personality_confidence',
                description: 'Personality traits unclear from available text',
                severity: 0.5,
                evidence: [],
                possibleExplanations: ['Insufficient text', 'Deliberately obscured personality', 'Multiple authors'],
            });
        }
        // Check for emotional inconsistency
        if (emotional.affectiveConsistency < 0.3) {
            anomalies.push({
                type: 'emotional_inconsistency',
                description: 'High emotional volatility across texts',
                severity: 0.7,
                evidence: [`Volatility: ${emotional.emotionalVolatility.toFixed(2)}`],
                possibleExplanations: ['Emotional instability', 'Different authors', 'Manipulative content'],
            });
        }
        // Check for sudden changes
        if (evolution.suddenChanges.length > 0) {
            for (const change of evolution.suddenChanges) {
                anomalies.push({
                    type: 'sudden_style_change',
                    description: 'Abrupt change in writing style detected',
                    severity: change.magnitude,
                    evidence: [`Affected metrics: ${change.affectedMetrics.join(', ')}`],
                    possibleExplanations: change.possibleCauses,
                });
            }
        }
        return anomalies;
    }
    /**
     * Calculate authenticity score
     */
    calculateAuthenticityScore(deception, anomalies, evolution) {
        let score = 1.0;
        // Deduct for deception indicators
        score -= deception.overallDeceptionScore * 0.3;
        // Deduct for anomalies
        const avgAnomalySeverity = anomalies.length > 0
            ? anomalies.reduce((sum, a) => sum + a.severity, 0) / anomalies.length
            : 0;
        score -= avgAnomalySeverity * 0.3;
        // Deduct for low consistency
        score -= (1 - evolution.consistency) * 0.2;
        // Deduct for high drift rate
        score -= evolution.driftRate * 0.2;
        return Math.max(0, Math.min(1, score));
    }
}
exports.PsycholinguisticAnalyzer = PsycholinguisticAnalyzer;
