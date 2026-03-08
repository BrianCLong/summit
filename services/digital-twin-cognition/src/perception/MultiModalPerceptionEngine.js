"use strict";
/**
 * MultiModalPerceptionEngine - Multi-Modal Sensing and Fusion
 *
 * Implements perception capabilities across multiple modalities:
 * - Time-series sensor data processing
 * - Text analysis (work orders, logs, reports)
 * - Image/video analysis (inspections, thermal, drones)
 * - Document understanding (manuals, regulations)
 *
 * Features:
 * - Unified feature extraction across modalities
 * - Multi-modal fusion for integrated understanding
 * - Anomaly detection across all input types
 * - Real-time streaming ingestion
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiModalPerceptionEngine = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'MultiModalPerceptionEngine' });
class MultiModalPerceptionEngine extends events_1.EventEmitter {
    config;
    sensorBuffer = new Map();
    textBuffer = [];
    imageBuffer = [];
    documentBuffer = [];
    patternMemory = new Map();
    constructor(config = {}) {
        super();
        this.config = {
            sensorBufferSize: config.sensorBufferSize ?? 1000,
            anomalyThreshold: config.anomalyThreshold ?? 3.0,
            patternMinOccurrences: config.patternMinOccurrences ?? 3,
            textAnalysisEnabled: config.textAnalysisEnabled ?? true,
            imageAnalysisEnabled: config.imageAnalysisEnabled ?? true,
            fusionStrategy: config.fusionStrategy ?? 'HYBRID',
        };
    }
    /**
     * Ingest sensor readings
     */
    async ingestSensorData(readings) {
        for (const reading of readings) {
            const buffer = this.sensorBuffer.get(reading.sensorId) ?? [];
            buffer.push(reading);
            // Maintain buffer size
            while (buffer.length > this.config.sensorBufferSize) {
                buffer.shift();
            }
            this.sensorBuffer.set(reading.sensorId, buffer);
        }
        this.emit('sensor:ingested', { count: readings.length });
    }
    /**
     * Ingest text inputs
     */
    async ingestTextInput(input) {
        // Extract entities if not already done
        if (input.entities.length === 0) {
            input.entities = await this.extractEntities(input.content);
        }
        this.textBuffer.push(input);
        // Keep buffer manageable
        if (this.textBuffer.length > 100) {
            this.textBuffer.shift();
        }
        this.emit('text:ingested', { type: input.type, source: input.source });
    }
    /**
     * Ingest image inputs
     */
    async ingestImageInput(input) {
        // Analyze image if not already done
        if (!input.analysis) {
            input.analysis = await this.analyzeImage(input);
        }
        this.imageBuffer.push(input);
        // Keep buffer manageable
        if (this.imageBuffer.length > 50) {
            this.imageBuffer.shift();
        }
        this.emit('image:ingested', { type: input.type, id: input.id });
    }
    /**
     * Ingest document inputs
     */
    async ingestDocumentInput(input) {
        // Extract knowledge if not already done
        if (input.extractedKnowledge.length === 0) {
            input.extractedKnowledge = await this.extractKnowledge(input);
        }
        this.documentBuffer.push(input);
        // Keep buffer manageable
        if (this.documentBuffer.length > 50) {
            this.documentBuffer.shift();
        }
        this.emit('document:ingested', { type: input.type, id: input.id });
    }
    /**
     * Run perception pipeline on all buffered inputs
     */
    async perceive() {
        const startTime = Date.now();
        // Process each modality
        const sensorFeatures = await this.processSensorData();
        const textFeatures = this.config.textAnalysisEnabled
            ? await this.processTextData()
            : this.emptyTextFeatures();
        const imageFeatures = this.config.imageAnalysisEnabled
            ? await this.processImageData()
            : this.emptyImageFeatures();
        const documentFeatures = await this.processDocumentData();
        // Fuse representations
        const fusedRepresentation = await this.fuseModalities(sensorFeatures, textFeatures, imageFeatures, documentFeatures);
        // Detect anomalies across modalities
        const detectedAnomalies = await this.detectAnomalies(sensorFeatures, textFeatures, imageFeatures, fusedRepresentation);
        // Extract patterns
        const extractedPatterns = await this.extractPatterns(sensorFeatures, textFeatures, fusedRepresentation);
        // Generate alerts
        const alerts = await this.generateAlerts(detectedAnomalies, extractedPatterns);
        const output = {
            timestamp: new Date(),
            sensorFeatures,
            textFeatures,
            imageFeatures,
            documentFeatures,
            fusedRepresentation,
            detectedAnomalies,
            extractedPatterns,
            alerts,
            confidence: fusedRepresentation.confidence,
        };
        const duration = Date.now() - startTime;
        logger.debug({ duration, anomalies: detectedAnomalies.length, patterns: extractedPatterns.length }, 'Perception completed');
        this.emit('perception:completed', output);
        return output;
    }
    /**
     * Process sensor data to extract features
     */
    async processSensorData() {
        const byType = new Map();
        const anomalyScores = new Map();
        const trendIndicators = new Map();
        // Aggregate by sensor type
        const typeBuffers = new Map();
        for (const [sensorId, readings] of this.sensorBuffer) {
            if (readings.length === 0)
                continue;
            const numericValues = readings
                .filter((r) => typeof r.value === 'number')
                .map((r) => r.value);
            if (numericValues.length === 0)
                continue;
            const sensorType = readings[0].type;
            // Calculate statistics
            const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
            const min = Math.min(...numericValues);
            const max = Math.max(...numericValues);
            const stdDev = Math.sqrt(numericValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
                numericValues.length);
            const latest = numericValues[numericValues.length - 1];
            // Calculate trend
            const trend = this.calculateTrend(numericValues);
            trendIndicators.set(sensorId, trend);
            // Calculate anomaly score (z-score of latest value)
            const zScore = stdDev > 0 ? Math.abs((latest - mean) / stdDev) : 0;
            anomalyScores.set(sensorId, zScore);
            // Aggregate by type
            const typeValues = typeBuffers.get(sensorType) ?? [];
            typeValues.push(...numericValues.slice(-10));
            typeBuffers.set(sensorType, typeValues);
            // Update type aggregation
            const existing = byType.get(sensorType);
            if (!existing) {
                byType.set(sensorType, {
                    count: numericValues.length,
                    mean,
                    min,
                    max,
                    stdDev,
                    latest,
                    trend: trend.direction === 'UP' ? 'RISING' : trend.direction === 'DOWN' ? 'FALLING' : 'STABLE',
                    quality: readings.reduce((q, r) => q + r.quality, 0) / readings.length,
                });
            }
            else {
                byType.set(sensorType, {
                    count: existing.count + numericValues.length,
                    mean: (existing.mean + mean) / 2,
                    min: Math.min(existing.min, min),
                    max: Math.max(existing.max, max),
                    stdDev: (existing.stdDev + stdDev) / 2,
                    latest,
                    trend: trend.direction === 'UP' ? 'RISING' : trend.direction === 'DOWN' ? 'FALLING' : 'STABLE',
                    quality: (existing.quality + readings.reduce((q, r) => q + r.quality, 0) / readings.length) / 2,
                });
            }
        }
        // Calculate correlations
        const correlations = this.calculateCorrelations();
        return {
            byType,
            anomalyScores,
            trendIndicators,
            correlations,
        };
    }
    calculateTrend(values) {
        if (values.length < 3) {
            return { direction: 'STABLE', magnitude: 0, confidence: 0, duration: 0 };
        }
        const n = values.length;
        const xMean = (n - 1) / 2;
        const yMean = values.reduce((a, b) => a + b, 0) / n;
        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
            numerator += (i - xMean) * (values[i] - yMean);
            denominator += (i - xMean) ** 2;
        }
        const slope = denominator !== 0 ? numerator / denominator : 0;
        const normalizedSlope = slope / (Math.abs(yMean) || 1);
        // Calculate R-squared
        const predictions = values.map((_, i) => yMean + slope * (i - xMean));
        const ssRes = values.reduce((sum, v, i) => sum + (v - predictions[i]) ** 2, 0);
        const ssTot = values.reduce((sum, v) => sum + (v - yMean) ** 2, 0);
        const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
        return {
            direction: normalizedSlope > 0.02 ? 'UP' : normalizedSlope < -0.02 ? 'DOWN' : 'STABLE',
            magnitude: Math.abs(normalizedSlope),
            confidence: Math.max(0, Math.min(1, rSquared)),
            duration: n,
        };
    }
    calculateCorrelations() {
        const pairs = [];
        const strongCorrelations = [];
        const sensorIds = Array.from(this.sensorBuffer.keys());
        for (let i = 0; i < sensorIds.length; i++) {
            for (let j = i + 1; j < sensorIds.length; j++) {
                const bufferA = this.sensorBuffer.get(sensorIds[i]) ?? [];
                const bufferB = this.sensorBuffer.get(sensorIds[j]) ?? [];
                if (bufferA.length < 10 || bufferB.length < 10)
                    continue;
                const valuesA = bufferA
                    .filter((r) => typeof r.value === 'number')
                    .map((r) => r.value)
                    .slice(-50);
                const valuesB = bufferB
                    .filter((r) => typeof r.value === 'number')
                    .map((r) => r.value)
                    .slice(-50);
                const minLen = Math.min(valuesA.length, valuesB.length);
                if (minLen < 10)
                    continue;
                const correlation = this.pearsonCorrelation(valuesA.slice(-minLen), valuesB.slice(-minLen));
                pairs.push({
                    sensorA: sensorIds[i],
                    sensorB: sensorIds[j],
                    correlation,
                });
                if (Math.abs(correlation) > 0.7) {
                    strongCorrelations.push({
                        sensors: [sensorIds[i], sensorIds[j]],
                        coefficient: correlation,
                    });
                }
            }
        }
        return { pairs, strongCorrelations };
    }
    pearsonCorrelation(x, y) {
        const n = x.length;
        const xMean = x.reduce((a, b) => a + b, 0) / n;
        const yMean = y.reduce((a, b) => a + b, 0) / n;
        let numerator = 0;
        let denomX = 0;
        let denomY = 0;
        for (let i = 0; i < n; i++) {
            const dx = x[i] - xMean;
            const dy = y[i] - yMean;
            numerator += dx * dy;
            denomX += dx * dx;
            denomY += dy * dy;
        }
        const denom = Math.sqrt(denomX * denomY);
        return denom !== 0 ? numerator / denom : 0;
    }
    /**
     * Process text data to extract features
     */
    async processTextData() {
        const allEntities = [];
        const urgencyScores = new Map();
        const actionItems = [];
        for (const input of this.textBuffer) {
            allEntities.push(...input.entities);
            // Calculate urgency
            const urgency = this.calculateUrgency(input.content);
            urgencyScores.set(input.id, urgency);
            // Extract action items
            const items = this.extractActionItems(input);
            actionItems.push(...items);
        }
        // Sentiment analysis
        const sentiment = this.analyzeSentiment();
        // Topic extraction
        const topics = this.extractTopics();
        return {
            entities: allEntities,
            sentiment,
            urgencyScores,
            topics,
            actionItems,
        };
    }
    calculateUrgency(content) {
        const urgencyKeywords = [
            { word: 'urgent', weight: 0.9 },
            { word: 'critical', weight: 0.95 },
            { word: 'emergency', weight: 1.0 },
            { word: 'immediate', weight: 0.85 },
            { word: 'asap', weight: 0.8 },
            { word: 'priority', weight: 0.7 },
            { word: 'important', weight: 0.6 },
            { word: 'attention', weight: 0.5 },
        ];
        const lowerContent = content.toLowerCase();
        let maxUrgency = 0;
        for (const { word, weight } of urgencyKeywords) {
            if (lowerContent.includes(word)) {
                maxUrgency = Math.max(maxUrgency, weight);
            }
        }
        return maxUrgency;
    }
    extractActionItems(input) {
        const items = [];
        const actionPatterns = [
            /need to ([^.]+)/gi,
            /must ([^.]+)/gi,
            /should ([^.]+)/gi,
            /action required: ([^.]+)/gi,
            /todo: ([^.]+)/gi,
        ];
        for (const pattern of actionPatterns) {
            let match;
            while ((match = pattern.exec(input.content)) !== null) {
                items.push({
                    text: match[1].trim(),
                    priority: input.urgency ?? 0.5,
                    source: input.id,
                });
            }
        }
        return items;
    }
    analyzeSentiment() {
        const positiveWords = ['good', 'excellent', 'working', 'normal', 'stable', 'optimal'];
        const negativeWords = ['bad', 'error', 'failure', 'problem', 'issue', 'critical', 'fault'];
        const concernWords = ['concern', 'worry', 'risk', 'potential', 'might', 'could'];
        let positiveCount = 0;
        let negativeCount = 0;
        let concernCount = 0;
        let totalWords = 0;
        for (const input of this.textBuffer) {
            const words = input.content.toLowerCase().split(/\s+/);
            totalWords += words.length;
            for (const word of words) {
                if (positiveWords.some((p) => word.includes(p)))
                    positiveCount++;
                if (negativeWords.some((n) => word.includes(n)))
                    negativeCount++;
                if (concernWords.some((c) => word.includes(c)))
                    concernCount++;
            }
        }
        const overall = totalWords > 0
            ? (positiveCount - negativeCount) / Math.max(1, positiveCount + negativeCount)
            : 0;
        return {
            overall: (overall + 1) / 2, // Normalize to 0-1
            byCategory: new Map([
                ['positive', positiveCount / Math.max(1, totalWords)],
                ['negative', negativeCount / Math.max(1, totalWords)],
                ['concern', concernCount / Math.max(1, totalWords)],
            ]),
            urgency: Math.max(...Array.from(this.textBuffer.map((t) => t.urgency ?? 0))),
            concern: concernCount / Math.max(1, totalWords),
        };
    }
    extractTopics() {
        const topicKeywords = {
            maintenance: ['maintenance', 'repair', 'fix', 'replace', 'service'],
            safety: ['safety', 'hazard', 'risk', 'protection', 'compliance'],
            performance: ['performance', 'efficiency', 'output', 'throughput', 'capacity'],
            quality: ['quality', 'defect', 'specification', 'tolerance', 'standard'],
            energy: ['energy', 'power', 'consumption', 'electricity', 'fuel'],
        };
        const topicCounts = {};
        let totalMatches = 0;
        for (const input of this.textBuffer) {
            const lowerContent = input.content.toLowerCase();
            for (const [topic, keywords] of Object.entries(topicKeywords)) {
                for (const keyword of keywords) {
                    if (lowerContent.includes(keyword)) {
                        topicCounts[topic] = (topicCounts[topic] ?? 0) + 1;
                        totalMatches++;
                    }
                }
            }
        }
        const topics = Object.entries(topicCounts)
            .map(([topic, count]) => ({
            topic,
            weight: totalMatches > 0 ? count / totalMatches : 0,
        }))
            .sort((a, b) => b.weight - a.weight);
        return {
            topics,
            dominant: topics[0]?.topic ?? 'general',
        };
    }
    /**
     * Process image data to extract features
     */
    async processImageData() {
        const detectedObjects = [];
        const anomalies = [];
        const measurements = new Map();
        const visualPatterns = [];
        for (const input of this.imageBuffer) {
            if (input.analysis) {
                detectedObjects.push(...input.analysis.detectedObjects);
                anomalies.push(...input.analysis.anomalies);
                if (input.analysis.measurements) {
                    for (const [key, value] of Object.entries(input.analysis.measurements)) {
                        measurements.set(key, value);
                    }
                }
            }
        }
        // Identify visual patterns
        const objectCounts = new Map();
        for (const obj of detectedObjects) {
            objectCounts.set(obj.label, (objectCounts.get(obj.label) ?? 0) + 1);
        }
        for (const [label, count] of objectCounts) {
            if (count >= this.config.patternMinOccurrences) {
                visualPatterns.push({
                    type: `recurring_${label}`,
                    location: { x: 0, y: 0, width: 1, height: 1 },
                    confidence: count / detectedObjects.length,
                    attributes: { count, label },
                });
            }
        }
        return {
            detectedObjects,
            anomalies,
            measurements,
            visualPatterns,
        };
    }
    /**
     * Process document data to extract features
     */
    async processDocumentData() {
        const knowledge = [];
        const rules = [];
        const specifications = [];
        const crossReferences = [];
        for (const input of this.documentBuffer) {
            knowledge.push(...input.extractedKnowledge);
            // Extract rules from knowledge
            for (const k of input.extractedKnowledge) {
                if (k.type === 'RULE') {
                    const parts = k.content.split(' THEN ');
                    if (parts.length === 2) {
                        rules.push({
                            id: (0, uuid_1.v4)(),
                            condition: parts[0].replace('IF ', ''),
                            action: parts[1],
                            source: input.id,
                            confidence: k.confidence,
                        });
                    }
                }
                if (k.type === 'SPECIFICATION') {
                    const specMatch = k.content.match(/(\w+)\s*[:=]\s*([\d.]+)\s*(\w+)?/);
                    if (specMatch) {
                        specifications.push({
                            parameter: specMatch[1],
                            value: parseFloat(specMatch[2]),
                            unit: specMatch[3],
                            source: input.id,
                        });
                    }
                }
            }
        }
        return {
            knowledge,
            rules,
            specifications,
            crossReferences,
        };
    }
    /**
     * Fuse multi-modal representations
     */
    async fuseModalities(sensor, text, image, document) {
        const insights = [];
        const modalityWeights = new Map();
        // Calculate modality weights based on data quality and quantity
        const sensorWeight = this.calculateModalityWeight(this.sensorBuffer.size, Array.from(sensor.byType.values()).reduce((s, d) => s + d.quality, 0) /
            Math.max(1, sensor.byType.size));
        const textWeight = this.calculateModalityWeight(this.textBuffer.length, text.sentiment.overall);
        const imageWeight = this.calculateModalityWeight(this.imageBuffer.length, image.detectedObjects.length > 0 ? 0.8 : 0.2);
        const documentWeight = this.calculateModalityWeight(this.documentBuffer.length, document.knowledge.length > 0 ? 0.9 : 0.3);
        modalityWeights.set('sensor', sensorWeight);
        modalityWeights.set('text', textWeight);
        modalityWeights.set('image', imageWeight);
        modalityWeights.set('document', documentWeight);
        // Generate cross-modal insights
        // Sensor-Text correlation
        if (text.urgencyScores.size > 0 && sensor.anomalyScores.size > 0) {
            const hasTextUrgency = Array.from(text.urgencyScores.values()).some((u) => u > 0.7);
            const hasSensorAnomaly = Array.from(sensor.anomalyScores.values()).some((s) => s > this.config.anomalyThreshold);
            if (hasTextUrgency && hasSensorAnomaly) {
                insights.push({
                    type: 'CORRELATION',
                    content: 'High urgency text inputs correlate with sensor anomalies',
                    confidence: 0.8,
                    sources: ['sensor', 'text'],
                });
            }
        }
        // Image-Sensor correlation
        if (image.anomalies.length > 0 && sensor.anomalyScores.size > 0) {
            insights.push({
                type: 'CORRELATION',
                content: `${image.anomalies.length} visual anomalies detected alongside sensor readings`,
                confidence: 0.75,
                sources: ['sensor', 'image'],
            });
        }
        // Document-based recommendations
        if (document.rules.length > 0 && sensor.trendIndicators.size > 0) {
            for (const rule of document.rules) {
                insights.push({
                    type: 'RECOMMENDATION',
                    content: `Rule from documentation: ${rule.condition} -> ${rule.action}`,
                    confidence: rule.confidence,
                    sources: ['document'],
                });
            }
        }
        // Calculate coherence score
        const totalWeight = Array.from(modalityWeights.values()).reduce((a, b) => a + b, 0);
        const coherenceScore = totalWeight > 0 ? totalWeight / 4 : 0;
        // Generate embedding (simplified - in production would use neural embeddings)
        const embedding = this.generateFusedEmbedding(sensor, text, image, document);
        return {
            embedding,
            confidence: coherenceScore,
            modalityWeights,
            coherenceScore,
            keyInsights: insights,
        };
    }
    calculateModalityWeight(dataCount, quality) {
        const quantityWeight = Math.min(1, dataCount / 10);
        return quantityWeight * 0.4 + quality * 0.6;
    }
    generateFusedEmbedding(sensor, text, image, document) {
        const embedding = [];
        // Sensor features (normalized)
        for (const data of sensor.byType.values()) {
            embedding.push(data.mean / 1000, data.stdDev / 100, data.trend === 'RISING' ? 1 : data.trend === 'FALLING' ? -1 : 0);
        }
        // Pad to fixed size
        while (embedding.length < 30)
            embedding.push(0);
        // Text features
        embedding.push(text.sentiment.overall);
        embedding.push(text.sentiment.urgency);
        embedding.push(text.topics.topics[0]?.weight ?? 0);
        // Image features
        embedding.push(image.detectedObjects.length / 10);
        embedding.push(image.anomalies.length / 5);
        // Document features
        embedding.push(document.rules.length / 10);
        embedding.push(document.specifications.length / 20);
        // Normalize
        const max = Math.max(...embedding.map(Math.abs), 1);
        return embedding.map((v) => v / max);
    }
    /**
     * Detect anomalies across all modalities
     */
    async detectAnomalies(sensor, text, image, fused) {
        const anomalies = [];
        // Sensor anomalies
        for (const [sensorId, score] of sensor.anomalyScores) {
            if (score > this.config.anomalyThreshold) {
                const severity = score > 5 ? 'CRITICAL' : score > 4 ? 'HIGH' : score > 3 ? 'MEDIUM' : 'LOW';
                anomalies.push({
                    id: (0, uuid_1.v4)(),
                    modality: 'SENSOR',
                    type: 'STATISTICAL_DEVIATION',
                    severity,
                    confidence: Math.min(0.99, score / 10),
                    source: sensorId,
                    description: `Sensor ${sensorId} showing ${score.toFixed(1)} sigma deviation`,
                    context: { zScore: score },
                    timestamp: new Date(),
                });
            }
        }
        // Text-based anomalies (high urgency)
        for (const [inputId, urgency] of text.urgencyScores) {
            if (urgency > 0.8) {
                anomalies.push({
                    id: (0, uuid_1.v4)(),
                    modality: 'TEXT',
                    type: 'HIGH_URGENCY_MESSAGE',
                    severity: urgency > 0.95 ? 'CRITICAL' : 'HIGH',
                    confidence: urgency,
                    source: inputId,
                    description: 'High urgency text input detected',
                    context: { urgency },
                    timestamp: new Date(),
                });
            }
        }
        // Image anomalies
        for (const imageAnomaly of image.anomalies) {
            anomalies.push({
                id: (0, uuid_1.v4)(),
                modality: 'IMAGE',
                type: imageAnomaly.type,
                severity: imageAnomaly.severity,
                confidence: imageAnomaly.confidence,
                source: 'image_analysis',
                description: imageAnomaly.description,
                context: { location: imageAnomaly.location },
                timestamp: new Date(),
            });
        }
        // Fused anomalies (cross-modal)
        if (fused.coherenceScore < 0.3) {
            anomalies.push({
                id: (0, uuid_1.v4)(),
                modality: 'FUSED',
                type: 'LOW_COHERENCE',
                severity: 'MEDIUM',
                confidence: 1 - fused.coherenceScore,
                source: 'multi_modal_fusion',
                description: 'Low coherence across modalities suggests inconsistent state',
                context: { coherenceScore: fused.coherenceScore },
                timestamp: new Date(),
            });
        }
        return anomalies;
    }
    /**
     * Extract patterns from perception data
     */
    async extractPatterns(sensor, text, fused) {
        const patterns = [];
        // Trend patterns from sensors
        for (const [sensorId, trend] of sensor.trendIndicators) {
            if (trend.confidence > 0.7 && trend.direction !== 'STABLE') {
                const patternId = `trend_${sensorId}_${trend.direction}`;
                const existing = this.patternMemory.get(patternId);
                if (existing) {
                    existing.occurrences++;
                    existing.lastSeen = new Date();
                    existing.confidence = (existing.confidence + trend.confidence) / 2;
                }
                else {
                    const pattern = {
                        id: (0, uuid_1.v4)(),
                        type: trend.direction === 'UP' ? 'DEGRADATION' : 'EFFICIENCY',
                        description: `${sensorId} showing ${trend.direction.toLowerCase()} trend`,
                        signature: {
                            features: { sensorId, direction: trend.direction, magnitude: trend.magnitude },
                            timescale: trend.duration,
                            threshold: trend.magnitude,
                        },
                        occurrences: 1,
                        lastSeen: new Date(),
                        confidence: trend.confidence,
                    };
                    this.patternMemory.set(patternId, pattern);
                    patterns.push(pattern);
                }
            }
        }
        // Correlation patterns
        for (const corr of sensor.correlations.strongCorrelations) {
            patterns.push({
                id: (0, uuid_1.v4)(),
                type: 'OPERATIONAL',
                description: `Strong correlation between ${corr.sensors.join(' and ')}`,
                signature: {
                    features: { sensors: corr.sensors, coefficient: corr.coefficient },
                    timescale: 100,
                    threshold: 0.7,
                },
                occurrences: 1,
                lastSeen: new Date(),
                confidence: Math.abs(corr.coefficient),
            });
        }
        // Topic patterns from text
        if (text.topics.dominant !== 'general') {
            patterns.push({
                id: (0, uuid_1.v4)(),
                type: 'OPERATIONAL',
                description: `Dominant topic: ${text.topics.dominant}`,
                signature: {
                    features: { topic: text.topics.dominant },
                    timescale: this.textBuffer.length,
                    threshold: text.topics.topics[0]?.weight ?? 0,
                },
                occurrences: this.textBuffer.length,
                lastSeen: new Date(),
                confidence: text.topics.topics[0]?.weight ?? 0,
            });
        }
        return patterns;
    }
    /**
     * Generate alerts from detected anomalies and patterns
     */
    async generateAlerts(anomalies, patterns) {
        const alerts = [];
        // Critical and high severity anomalies become alerts
        for (const anomaly of anomalies) {
            if (anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH') {
                alerts.push({
                    id: (0, uuid_1.v4)(),
                    twinId: '', // Will be filled by caller
                    type: anomaly.modality === 'SENSOR'
                        ? 'THRESHOLD_BREACH'
                        : anomaly.modality === 'IMAGE'
                            ? 'ANOMALY_DETECTED'
                            : 'PREDICTION_ALERT',
                    severity: anomaly.severity,
                    title: `${anomaly.modality} Anomaly: ${anomaly.type}`,
                    description: anomaly.description,
                    source: anomaly.source,
                    context: anomaly.context,
                    recommendedActions: [],
                    createdAt: anomaly.timestamp,
                    status: 'ACTIVE',
                });
            }
        }
        // Degradation patterns become maintenance alerts
        const degradationPatterns = patterns.filter((p) => p.type === 'DEGRADATION');
        for (const pattern of degradationPatterns) {
            if (pattern.confidence > 0.8) {
                alerts.push({
                    id: (0, uuid_1.v4)(),
                    twinId: '',
                    type: 'MAINTENANCE_DUE',
                    severity: 'MEDIUM',
                    title: 'Degradation Pattern Detected',
                    description: pattern.description,
                    source: 'pattern_recognition',
                    context: pattern.signature.features,
                    recommendedActions: [],
                    createdAt: new Date(),
                    status: 'ACTIVE',
                });
            }
        }
        return alerts;
    }
    /**
     * Extract entities from text
     */
    async extractEntities(content) {
        const entities = [];
        // Simple pattern-based entity extraction
        const patterns = [
            { regex: /\b[A-Z]{2,}-\d+\b/g, type: 'ASSET_ID' },
            { regex: /\b\d+\.?\d*\s*(psi|bar|kPa|MPa)\b/gi, type: 'PRESSURE' },
            { regex: /\b\d+\.?\d*\s*(°[CF]|celsius|fahrenheit)\b/gi, type: 'TEMPERATURE' },
            { regex: /\b\d+\.?\d*\s*(kW|MW|W|hp)\b/gi, type: 'POWER' },
            { regex: /\b\d+\.?\d*\s*(m³\/h|gpm|L\/min)\b/gi, type: 'FLOW_RATE' },
            { regex: /\b(pump|motor|valve|sensor|compressor|fan|heater)\s*\d*\b/gi, type: 'EQUIPMENT' },
        ];
        for (const { regex, type } of patterns) {
            let match;
            while ((match = regex.exec(content)) !== null) {
                entities.push({
                    text: match[0],
                    type,
                    startOffset: match.index,
                    endOffset: match.index + match[0].length,
                    confidence: 0.9,
                });
            }
        }
        return entities;
    }
    /**
     * Analyze image (simplified - would use ML models in production)
     */
    async analyzeImage(input) {
        // Simulated image analysis
        return {
            detectedObjects: [],
            anomalies: [],
            measurements: {},
            confidence: 0.8,
        };
    }
    /**
     * Extract knowledge from document
     */
    async extractKnowledge(input) {
        const knowledge = [];
        // Simple pattern-based knowledge extraction
        const lines = input.content.split('\n');
        for (const line of lines) {
            // Extract rules (IF-THEN patterns)
            if (line.toLowerCase().includes('if ') && line.toLowerCase().includes(' then ')) {
                knowledge.push({
                    type: 'RULE',
                    content: line.trim(),
                    confidence: 0.8,
                    source: input.id,
                });
            }
            // Extract specifications (parameter = value patterns)
            const specMatch = line.match(/(\w+)\s*[:=]\s*([\d.]+)\s*(\w+)?/);
            if (specMatch) {
                knowledge.push({
                    type: 'SPECIFICATION',
                    content: line.trim(),
                    confidence: 0.9,
                    source: input.id,
                });
            }
            // Extract constraints (must, shall, should patterns)
            if (/\b(must|shall|should|required)\b/i.test(line)) {
                knowledge.push({
                    type: 'CONSTRAINT',
                    content: line.trim(),
                    confidence: 0.85,
                    source: input.id,
                });
            }
        }
        return knowledge;
    }
    emptyTextFeatures() {
        return {
            entities: [],
            sentiment: { overall: 0.5, byCategory: new Map(), urgency: 0, concern: 0 },
            urgencyScores: new Map(),
            topics: { topics: [], dominant: 'general' },
            actionItems: [],
        };
    }
    emptyImageFeatures() {
        return {
            detectedObjects: [],
            anomalies: [],
            measurements: new Map(),
            visualPatterns: [],
        };
    }
    /**
     * Clear all buffers
     */
    clearBuffers() {
        this.sensorBuffer.clear();
        this.textBuffer = [];
        this.imageBuffer = [];
        this.documentBuffer = [];
    }
    /**
     * Get current buffer statistics
     */
    getBufferStats() {
        let totalReadings = 0;
        for (const readings of this.sensorBuffer.values()) {
            totalReadings += readings.length;
        }
        return {
            sensors: this.sensorBuffer.size,
            sensorReadings: totalReadings,
            texts: this.textBuffer.length,
            images: this.imageBuffer.length,
            documents: this.documentBuffer.length,
        };
    }
}
exports.MultiModalPerceptionEngine = MultiModalPerceptionEngine;
exports.default = MultiModalPerceptionEngine;
