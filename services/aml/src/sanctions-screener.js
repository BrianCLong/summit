"use strict";
/**
 * AML Sanctions Screening Engine
 * Sprint 28C: Real-time screening against global sanctions lists with ML-enhanced matching
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SanctionsScreener = void 0;
const events_1 = require("events");
const crypto_1 = __importDefault(require("crypto"));
class SanctionsScreener extends events_1.EventEmitter {
    sources = new Map();
    records = new Map();
    requests = new Map();
    alerts = new Map();
    // Advanced matching components
    nameVariations = new Map();
    phoneticIndex = new Map();
    synonymIndex = new Map();
    // ML models for enhanced matching
    nameEmbeddings = new Map();
    riskClassifier; // ML model for risk classification
    constructor() {
        super();
        this.initializeDefaultSources();
        this.initializeMatchingIndices();
    }
    /**
     * Register sanctions list source
     */
    async registerSource(source) {
        const fullSource = {
            ...source,
            id: crypto_1.default.randomUUID(),
        };
        this.sources.set(fullSource.id, fullSource);
        this.emit('source_registered', fullSource);
        // Trigger initial data load
        if (fullSource.url) {
            await this.loadSourceData(fullSource.id);
        }
        return fullSource;
    }
    /**
     * Load and index sanctions data from source
     */
    async loadSourceData(sourceId) {
        const source = this.sources.get(sourceId);
        if (!source) {
            throw new Error('Source not found');
        }
        const startTime = Date.now();
        let loaded = 0, updated = 0, errors = 0;
        try {
            // Mock data loading - in practice, fetch from actual sources
            const mockData = await this.fetchSourceData(source);
            for (const recordData of mockData) {
                try {
                    const record = await this.parseAndValidateRecord(recordData, sourceId);
                    const existing = this.records.get(record.id);
                    if (existing) {
                        if (this.isRecordNewer(record, existing)) {
                            this.records.set(record.id, record);
                            await this.updateMatchingIndices(record);
                            updated++;
                        }
                    }
                    else {
                        this.records.set(record.id, record);
                        await this.updateMatchingIndices(record);
                        loaded++;
                    }
                }
                catch (error) {
                    errors++;
                }
            }
            // Update source metadata
            source.lastUpdated = new Date();
            source.recordCount = mockData.length;
            source.checksum = this.calculateChecksum(mockData);
            this.sources.set(sourceId, source);
            const processingTime = Date.now() - startTime;
            this.emit('source_loaded', {
                sourceId,
                loaded,
                updated,
                errors,
                processingTime,
            });
            return { loaded, updated, errors, processingTime };
        }
        catch (error) {
            this.emit('source_load_failed', { sourceId, error: error.message });
            throw error;
        }
    }
    /**
     * Screen entity against sanctions lists
     */
    async screenEntity(target, configuration, requestor) {
        const request = {
            id: crypto_1.default.randomUUID(),
            requestor,
            target: {
                type: 'individual',
                data: target,
            },
            configuration: {
                threshold: 0.8,
                fuzzyMatching: true,
                phoneticMatching: true,
                synonymMatching: true,
                includeHistorical: false,
                ...configuration,
            },
            status: 'pending',
            timing: {
                requestTime: new Date(),
            },
        };
        this.requests.set(request.id, request);
        // Execute screening asynchronously
        this.executeScreening(request).catch((error) => {
            request.status = 'failed';
            request.timing.endTime = new Date();
            this.requests.set(request.id, request);
            this.emit('screening_failed', {
                requestId: request.id,
                error: error.message,
            });
        });
        return request;
    }
    /**
     * Batch screening for multiple entities
     */
    async screenBatch(entities, configuration, requestor) {
        const request = {
            id: crypto_1.default.randomUUID(),
            requestor,
            target: {
                type: 'batch',
                data: entities,
            },
            configuration,
            status: 'pending',
            timing: {
                requestTime: new Date(),
            },
        };
        this.requests.set(request.id, request);
        // Execute batch screening
        this.executeBatchScreening(request).catch((error) => {
            request.status = 'failed';
            this.requests.set(request.id, request);
        });
        return request;
    }
    /**
     * Create screening alert
     */
    async createAlert(requestId, matches, severity) {
        const request = this.requests.get(requestId);
        if (!request) {
            throw new Error('Screening request not found');
        }
        const alert = {
            id: crypto_1.default.randomUUID(),
            requestId,
            severity,
            type: this.determineAlertType(matches),
            subject: {
                name: request.target.data.names?.[0] || 'Unknown',
                type: request.target.type,
                identifiers: request.target.data.identifiers?.map((id) => id.value) || [],
            },
            matches: matches.map((m) => m.recordId),
            recommendation: this.determineRecommendation(matches, severity),
            status: 'open',
            investigation: {
                notes: [],
                decisions: [],
            },
            timing: {
                createdAt: new Date(),
                updatedAt: new Date(),
                dueDate: this.calculateDueDate(severity),
            },
        };
        this.alerts.set(alert.id, alert);
        this.emit('alert_created', alert);
        return alert;
    }
    /**
     * Update alert with investigation notes
     */
    async updateAlert(alertId, update) {
        const alert = this.alerts.get(alertId);
        if (!alert) {
            throw new Error('Alert not found');
        }
        if (update.status) {
            alert.status = update.status;
            if (update.status === 'closed') {
                alert.timing.closedAt = new Date();
            }
        }
        if (update.assignedTo) {
            alert.assignedTo = update.assignedTo;
        }
        if (update.notes) {
            update.notes.forEach((note) => {
                alert.investigation.notes.push({
                    timestamp: new Date(),
                    ...note,
                });
            });
        }
        if (update.decision) {
            alert.investigation.decisions.push({
                timestamp: new Date(),
                ...update.decision,
            });
        }
        alert.timing.updatedAt = new Date();
        this.alerts.set(alertId, alert);
        this.emit('alert_updated', alert);
        return alert;
    }
    /**
     * Process real-time sanctions list updates
     */
    async processRealTimeUpdate(update) {
        const source = this.sources.get(update.sourceId);
        if (!source) {
            throw new Error('Source not found');
        }
        let processed = 0;
        let errors = 0;
        const impactedScreenings = [];
        for (const recordUpdate of update.records) {
            try {
                switch (recordUpdate.action) {
                    case 'add':
                    case 'update':
                        if (recordUpdate.data) {
                            this.records.set(recordUpdate.recordId, recordUpdate.data);
                            await this.updateMatchingIndices(recordUpdate.data);
                            processed++;
                        }
                        break;
                    case 'delete':
                        this.records.delete(recordUpdate.recordId);
                        await this.removeFromIndices(recordUpdate.recordId);
                        processed++;
                        break;
                }
                // Check if this update affects any recent screenings
                const affected = await this.findAffectedScreenings(recordUpdate.recordId);
                impactedScreenings.push(...affected);
            }
            catch (error) {
                errors++;
            }
        }
        // Update source metadata
        source.lastUpdated = update.effectiveDate;
        source.checksum = update.checksum;
        this.sources.set(update.sourceId, source);
        this.emit('realtime_update_processed', {
            sourceId: update.sourceId,
            processed,
            errors,
            impactedScreenings: [...new Set(impactedScreenings)],
        });
        return {
            processed,
            errors,
            impactedScreenings: [...new Set(impactedScreenings)],
        };
    }
    /**
     * Get screening statistics
     */
    getStatistics() {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const recent = Array.from(this.requests.values()).filter((r) => r.timing.requestTime >= yesterday);
        const completed = recent.filter((r) => r.status === 'completed');
        const avgResponseTime = completed.length > 0
            ? completed.reduce((sum, r) => sum + (r.timing.duration || 0), 0) /
                completed.length
            : 0;
        const withMatches = completed.filter((r) => r.results && r.results.matches.length > 0);
        const matchRate = completed.length > 0 ? withMatches.length / completed.length : 0;
        const falsePositives = completed.reduce((sum, r) => sum + (r.results?.falsePositives.length || 0), 0);
        const totalMatches = completed.reduce((sum, r) => sum + (r.results?.matches.length || 0), 0);
        const falsePositiveRate = totalMatches > 0 ? falsePositives / totalMatches : 0;
        const openAlerts = Array.from(this.alerts.values()).filter((a) => a.status === 'open' || a.status === 'investigating').length;
        return {
            sources: this.sources.size,
            records: this.records.size,
            requests24h: recent.length,
            avgResponseTime,
            matchRate,
            falsePositiveRate,
            alertsOpen: openAlerts,
        };
    }
    async executeScreening(request) {
        request.status = 'screening';
        request.timing.startTime = new Date();
        try {
            const target = request.target.data;
            const matches = [];
            let recordsScreened = 0;
            // Get relevant records to screen
            const candidateRecords = await this.getCandidateRecords(target, request.configuration);
            for (const record of candidateRecords) {
                recordsScreened++;
                const match = await this.evaluateMatch(target, record, request.configuration);
                if (match && match.confidence >= request.configuration.threshold) {
                    matches.push(match);
                }
            }
            // Calculate overall risk
            const overallRisk = this.calculateOverallRisk(matches);
            const confidence = matches.length > 0
                ? matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length
                : 0;
            request.timing.endTime = new Date();
            request.timing.duration =
                request.timing.endTime.getTime() - request.timing.startTime.getTime();
            request.results = {
                requestId: request.id,
                overallRisk,
                confidence,
                matches: matches.sort((a, b) => b.confidence - a.confidence),
                falsePositives: [],
                analytics: {
                    recordsScreened,
                    listsChecked: request.configuration.lists,
                    processedInMs: request.timing.duration,
                    cacheHitRate: 0.85, // Mock cache hit rate
                },
                audit: {
                    screenedAt: request.timing.endTime,
                    screenedBy: request.requestor,
                    jurisdiction: 'US',
                    compliance: ['OFAC', 'BSA', 'PATRIOT_ACT'],
                },
            };
            request.status = 'completed';
            this.requests.set(request.id, request);
            // Create alert if matches found
            if (matches.length > 0) {
                const severity = this.determineSeverity(matches);
                await this.createAlert(request.id, matches, severity);
            }
            this.emit('screening_completed', request);
        }
        catch (error) {
            request.status = 'failed';
            request.timing.endTime = new Date();
            this.requests.set(request.id, request);
            throw error;
        }
    }
    async executeBatchScreening(request) {
        request.status = 'screening';
        request.timing.startTime = new Date();
        try {
            const entities = request.target.data;
            const batchResults = [];
            for (const entity of entities) {
                const matches = [];
                const candidateRecords = await this.getCandidateRecords(entity, request.configuration);
                for (const record of candidateRecords) {
                    const match = await this.evaluateMatch(entity, record, request.configuration);
                    if (match && match.confidence >= request.configuration.threshold) {
                        matches.push(match);
                    }
                }
                batchResults.push({ entityId: entity.id, matches });
            }
            request.timing.endTime = new Date();
            request.timing.duration =
                request.timing.endTime.getTime() - request.timing.startTime.getTime();
            request.status = 'completed';
            this.requests.set(request.id, request);
            this.emit('batch_screening_completed', {
                request,
                results: batchResults,
            });
        }
        catch (error) {
            request.status = 'failed';
            throw error;
        }
    }
    async getCandidateRecords(target, config) {
        const candidates = new Set();
        // Filter by configured lists
        const relevantRecords = Array.from(this.records.values()).filter((record) => config.lists.length === 0 || config.lists.includes(record.sourceId));
        // Use indices for efficient candidate selection
        for (const name of target.names || []) {
            // Exact matches
            const exactMatches = this.findExactMatches(name);
            exactMatches.forEach((record) => candidates.add(record));
            // Phonetic matches
            if (config.phoneticMatching) {
                const phoneticMatches = this.findPhoneticMatches(name);
                phoneticMatches.forEach((record) => candidates.add(record));
            }
            // Fuzzy matches (limited to prevent performance issues)
            if (config.fuzzyMatching) {
                const fuzzyMatches = this.findFuzzyMatches(name, 0.7);
                fuzzyMatches.slice(0, 100).forEach((record) => candidates.add(record)); // Limit fuzzy matches
            }
        }
        return Array.from(candidates);
    }
    async evaluateMatch(target, record, config) {
        const matchedFields = [];
        let totalScore = 0;
        let matchCount = 0;
        // Compare names
        for (const targetName of target.names || []) {
            for (const subject of record.subjects) {
                for (const sanctionName of subject.names) {
                    const similarity = this.calculateNameSimilarity(targetName, sanctionName.fullName, config);
                    if (similarity > 0.6) {
                        matchedFields.push({
                            field: 'name',
                            targetValue: targetName,
                            sanctionValue: sanctionName.fullName,
                            similarity,
                        });
                        totalScore += similarity;
                        matchCount++;
                    }
                }
            }
        }
        // Compare identifiers
        for (const targetId of target.identifiers || []) {
            for (const subject of record.subjects) {
                for (const sanctionId of subject.identifiers) {
                    if (targetId.type === sanctionId.type &&
                        targetId.value === sanctionId.value) {
                        matchedFields.push({
                            field: 'identifier',
                            targetValue: targetId.value,
                            sanctionValue: sanctionId.value,
                            similarity: 1.0,
                        });
                        totalScore += 1.0;
                        matchCount++;
                    }
                }
            }
        }
        if (matchCount === 0)
            return null;
        const confidence = totalScore / matchCount;
        const riskScore = this.calculateRiskScore(record, confidence);
        return {
            recordId: record.id,
            confidence,
            matchType: this.determineMatchType(matchedFields),
            matchedFields,
            record,
            riskScore,
            recommendation: this.getMatchRecommendation(confidence, riskScore),
        };
    }
    calculateNameSimilarity(name1, name2, config) {
        // Exact match
        if (name1.toLowerCase() === name2.toLowerCase())
            return 1.0;
        let maxSimilarity = 0;
        // Fuzzy matching
        if (config.fuzzyMatching) {
            maxSimilarity = Math.max(maxSimilarity, this.fuzzyStringMatch(name1, name2));
        }
        // Phonetic matching
        if (config.phoneticMatching) {
            maxSimilarity = Math.max(maxSimilarity, this.phoneticMatch(name1, name2));
        }
        // Synonym matching
        if (config.synonymMatching) {
            maxSimilarity = Math.max(maxSimilarity, this.synonymMatch(name1, name2));
        }
        return maxSimilarity;
    }
    fuzzyStringMatch(str1, str2) {
        const maxLen = Math.max(str1.length, str2.length);
        if (maxLen === 0)
            return 1.0;
        const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
        return 1.0 - distance / maxLen;
    }
    phoneticMatch(str1, str2) {
        const soundex1 = this.soundex(str1);
        const soundex2 = this.soundex(str2);
        return soundex1 === soundex2 ? 0.85 : 0.0;
    }
    synonymMatch(str1, str2) {
        const synonyms1 = this.synonymIndex.get(str1.toLowerCase()) || new Set();
        const synonyms2 = this.synonymIndex.get(str2.toLowerCase()) || new Set();
        if (synonyms1.has(str2.toLowerCase()) ||
            synonyms2.has(str1.toLowerCase())) {
            return 0.9;
        }
        return 0.0;
    }
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1)
            .fill(null)
            .map(() => Array(str1.length + 1).fill(null));
        for (let i = 0; i <= str1.length; i++)
            matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++)
            matrix[j][0] = j;
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
            }
        }
        return matrix[str2.length][str1.length];
    }
    soundex(str) {
        const a = str.toLowerCase().split('');
        const f = a.shift() || '';
        const r = a
            .join('')
            .replace(/[aeiouyhw]/g, '')
            .replace(/[bfpv]/g, '1')
            .replace(/[cgjkqsxz]/g, '2')
            .replace(/[dt]/g, '3')
            .replace(/[l]/g, '4')
            .replace(/[mn]/g, '5')
            .replace(/[r]/g, '6')
            .replace(/(.)\1+/g, '$1');
        return (f + r + '000').slice(0, 4).toUpperCase();
    }
    findExactMatches(name) {
        const matches = [];
        for (const record of this.records.values()) {
            for (const subject of record.subjects) {
                for (const sanctionName of subject.names) {
                    if (sanctionName.fullName.toLowerCase() === name.toLowerCase()) {
                        matches.push(record);
                        break;
                    }
                }
            }
        }
        return matches;
    }
    findPhoneticMatches(name) {
        const soundexCode = this.soundex(name);
        const recordIds = this.phoneticIndex.get(soundexCode) || new Set();
        return Array.from(recordIds)
            .map((id) => this.records.get(id))
            .filter(Boolean);
    }
    findFuzzyMatches(name, threshold) {
        const matches = [];
        for (const record of this.records.values()) {
            for (const subject of record.subjects) {
                for (const sanctionName of subject.names) {
                    const similarity = this.fuzzyStringMatch(name, sanctionName.fullName);
                    if (similarity >= threshold) {
                        matches.push({ record, similarity });
                    }
                }
            }
        }
        return matches
            .sort((a, b) => b.similarity - a.similarity)
            .map((m) => m.record);
    }
    calculateRiskScore(record, confidence) {
        let riskScore = confidence;
        // Adjust based on list type
        switch (record.listType) {
            case 'sdn':
                riskScore *= 1.0; // Highest risk
                break;
            case 'consolidated':
                riskScore *= 0.9;
                break;
            case 'pep':
                riskScore *= 0.7;
                break;
            default:
                riskScore *= 0.8;
        }
        // Adjust based on designation programs
        if (record.designation.programs.includes('TERRORISM')) {
            riskScore *= 1.2;
        }
        return Math.min(riskScore, 1.0);
    }
    calculateOverallRisk(matches) {
        if (matches.length === 0)
            return 'clear';
        const maxRisk = Math.max(...matches.map((m) => m.riskScore));
        if (maxRisk >= 0.95)
            return 'blocked';
        if (maxRisk >= 0.8)
            return 'match';
        if (maxRisk >= 0.6)
            return 'potential';
        return 'clear';
    }
    determineMatchType(matchedFields) {
        const exactFields = matchedFields.filter((f) => f.similarity === 1.0);
        if (exactFields.length > 0)
            return 'exact';
        const highFields = matchedFields.filter((f) => f.similarity >= 0.9);
        if (highFields.length > 0)
            return 'fuzzy';
        return 'partial';
    }
    getMatchRecommendation(confidence, riskScore) {
        if (riskScore >= 0.95)
            return 'block';
        if (riskScore >= 0.8)
            return 'escalate';
        if (riskScore >= 0.6)
            return 'review';
        return 'clear';
    }
    determineAlertType(matches) {
        const listTypes = matches.map((m) => m.record.listType);
        if (listTypes.includes('sdn'))
            return 'sanctions_match';
        if (listTypes.includes('pep'))
            return 'pep_match';
        return 'watchlist_hit';
    }
    determineSeverity(matches) {
        const maxRisk = Math.max(...matches.map((m) => m.riskScore));
        if (maxRisk >= 0.95)
            return 'critical';
        if (maxRisk >= 0.8)
            return 'high';
        if (maxRisk >= 0.6)
            return 'medium';
        return 'low';
    }
    determineRecommendation(matches, severity) {
        if (severity === 'critical')
            return 'block';
        if (severity === 'high')
            return 'escalate';
        if (severity === 'medium')
            return 'investigate';
        return 'investigate';
    }
    calculateDueDate(severity) {
        const now = new Date();
        const hours = severity === 'critical' ? 4 : severity === 'high' ? 24 : 72;
        return new Date(now.getTime() + hours * 60 * 60 * 1000);
    }
    async fetchSourceData(source) {
        // Mock data fetch - in practice, call actual APIs
        return [
            {
                id: `mock_record_${crypto_1.default.randomUUID()}`,
                fullName: 'John Doe',
                listType: 'sdn',
                programs: ['TERRORISM'],
            },
        ];
    }
    async parseAndValidateRecord(data, sourceId) {
        return {
            id: data.id,
            sourceId,
            externalId: data.id,
            type: 'individual',
            listType: data.listType,
            status: 'active',
            designation: {
                programs: data.programs || [],
                reasons: [],
                effectiveDate: new Date(),
            },
            subjects: [
                {
                    type: 'primary',
                    names: [
                        {
                            fullName: data.fullName,
                            quality: 'strong',
                        },
                    ],
                    identifiers: [],
                    dates: [],
                    places: [],
                    attributes: [],
                },
            ],
            relationships: [],
            metadata: {
                confidence: 1.0,
                lastVerified: new Date(),
                sources: [sourceId],
            },
        };
    }
    isRecordNewer(record1, record2) {
        return record1.metadata.lastVerified > record2.metadata.lastVerified;
    }
    calculateChecksum(data) {
        return crypto_1.default
            .createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
    }
    async updateMatchingIndices(record) {
        // Update phonetic index
        for (const subject of record.subjects) {
            for (const name of subject.names) {
                const soundexCode = this.soundex(name.fullName);
                if (!this.phoneticIndex.has(soundexCode)) {
                    this.phoneticIndex.set(soundexCode, new Set());
                }
                this.phoneticIndex.get(soundexCode).add(record.id);
            }
        }
    }
    async removeFromIndices(recordId) {
        // Remove from phonetic index
        for (const recordIds of this.phoneticIndex.values()) {
            recordIds.delete(recordId);
        }
    }
    async findAffectedScreenings(recordId) {
        // Find recent screenings that might be affected by this record update
        const recent = Array.from(this.requests.values()).filter((r) => r.timing.requestTime > new Date(Date.now() - 24 * 60 * 60 * 1000));
        return recent.map((r) => r.id);
    }
    initializeDefaultSources() {
        // OFAC SDN List
        this.registerSource({
            name: 'OFAC Specially Designated Nationals (SDN)',
            authority: 'U.S. Treasury Department',
            jurisdiction: 'US',
            type: 'sanctions',
            url: 'https://www.treasury.gov/ofac/downloads/sdn.xml',
            updateFrequency: 'daily',
            lastUpdated: new Date(),
            recordCount: 0,
            checksum: '',
            metadata: {
                reliability: 1.0,
                coverage: ['global'],
                language: 'en',
                format: 'xml',
            },
        });
        // UN Consolidated List
        this.registerSource({
            name: 'UN Consolidated List',
            authority: 'United Nations',
            jurisdiction: 'UN',
            type: 'sanctions',
            updateFrequency: 'daily',
            lastUpdated: new Date(),
            recordCount: 0,
            checksum: '',
            metadata: {
                reliability: 0.95,
                coverage: ['global'],
                language: 'en',
                format: 'xml',
            },
        });
    }
    initializeMatchingIndices() {
        // Initialize common name variations
        this.nameVariations.set('john', ['jon', 'johnny', 'johnnie']);
        this.nameVariations.set('william', ['bill', 'billy', 'will', 'willie']);
        this.nameVariations.set('robert', ['bob', 'bobby', 'rob', 'robbie']);
        // Initialize synonym index
        this.synonymIndex.set('corporation', new Set(['corp', 'inc', 'ltd', 'llc']));
        this.synonymIndex.set('company', new Set(['co', 'corp', 'inc']));
        this.synonymIndex.set('limited', new Set(['ltd', 'ltda']));
    }
}
exports.SanctionsScreener = SanctionsScreener;
