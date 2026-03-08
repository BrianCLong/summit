"use strict";
/**
 * Agentic Enrichment Pipeline
 * AI-powered enrichment for STIX objects with embedding generation and context augmentation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgenticEnricher = void 0;
exports.createAgenticEnricher = createAgenticEnricher;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'agentic-enricher' });
// MITRE ATT&CK pattern keywords for basic mapping
const MITRE_PATTERNS = {
    'phishing': { id: 'T1566', name: 'Phishing', tactic: 'initial-access' },
    'spearphishing': { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'initial-access' },
    'credential': { id: 'T1078', name: 'Valid Accounts', tactic: 'defense-evasion' },
    'powershell': { id: 'T1059.001', name: 'PowerShell', tactic: 'execution' },
    'command.*line': { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'execution' },
    'registry': { id: 'T1112', name: 'Modify Registry', tactic: 'defense-evasion' },
    'scheduled.*task': { id: 'T1053', name: 'Scheduled Task/Job', tactic: 'persistence' },
    'service': { id: 'T1543', name: 'Create or Modify System Process', tactic: 'persistence' },
    'dll.*injection': { id: 'T1055.001', name: 'DLL Injection', tactic: 'defense-evasion' },
    'process.*injection': { id: 'T1055', name: 'Process Injection', tactic: 'defense-evasion' },
    'keylog': { id: 'T1056.001', name: 'Keylogging', tactic: 'collection' },
    'screen.*capture': { id: 'T1113', name: 'Screen Capture', tactic: 'collection' },
    'exfiltrat': { id: 'T1041', name: 'Exfiltration Over C2 Channel', tactic: 'exfiltration' },
    'encrypt': { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'impact' },
    'ransom': { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'impact' },
    'lateral.*movement': { id: 'T1021', name: 'Remote Services', tactic: 'lateral-movement' },
    'privilege.*escalat': { id: 'T1068', name: 'Exploitation for Privilege Escalation', tactic: 'privilege-escalation' },
    'rootkit': { id: 'T1014', name: 'Rootkit', tactic: 'defense-evasion' },
    'backdoor': { id: 'T1547', name: 'Boot or Logon Autostart Execution', tactic: 'persistence' },
    'c2': { id: 'T1071', name: 'Application Layer Protocol', tactic: 'command-and-control' },
    'command.*control': { id: 'T1071', name: 'Application Layer Protocol', tactic: 'command-and-control' },
    'beacon': { id: 'T1071', name: 'Application Layer Protocol', tactic: 'command-and-control' },
    'dns.*tunnel': { id: 'T1071.004', name: 'DNS', tactic: 'command-and-control' },
    'webshell': { id: 'T1505.003', name: 'Web Shell', tactic: 'persistence' },
};
class AgenticEnricher {
    config;
    rateLimiter;
    constructor(config = {}) {
        this.config = {
            openaiApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY || '',
            embeddingModel: config.embeddingModel || 'text-embedding-3-small',
            generateEmbeddings: config.generateEmbeddings ?? true,
            mapMitre: config.mapMitre ?? true,
            geolocate: config.geolocate ?? false,
            checkReputation: config.checkReputation ?? false,
            lookupWhois: config.lookupWhois ?? false,
            lookupDns: config.lookupDns ?? false,
            embeddingBatchSize: config.embeddingBatchSize || 100,
            rateLimitPerSecond: config.rateLimitPerSecond || 10,
        };
        this.rateLimiter = { lastCall: 0, callCount: 0 };
    }
    /**
     * Enrich a single STIX object
     */
    async enrich(object, metadata) {
        const startTime = Date.now();
        const result = {
            object,
            metadata,
            enrichments: {},
            processingTimeMs: 0,
        };
        try {
            // Generate embedding
            if (this.config.generateEmbeddings && this.config.openaiApiKey) {
                const text = this.objectToText(object);
                if (text) {
                    result.embedding = await this.generateEmbedding(text);
                }
            }
            // Map to MITRE ATT&CK
            if (this.config.mapMitre) {
                result.enrichments.mitreMappings = this.mapToMitre(object);
            }
            // Calculate risk score
            result.enrichments.riskScore = this.calculateRiskScore(object, result.enrichments);
            // Generate AI summary if we have an API key
            if (this.config.openaiApiKey) {
                result.enrichments.aiSummary = await this.generateSummary(object);
            }
            // Type-specific enrichments
            if (object.type === 'indicator') {
                const indicator = object;
                const value = this.extractPatternValue(indicator.pattern);
                if (value) {
                    // IP-based enrichments
                    if (this.isIPAddress(value)) {
                        if (this.config.geolocate) {
                            result.enrichments.geoLocation = await this.geolocateIP(value);
                        }
                        if (this.config.checkReputation) {
                            result.enrichments.reputation = await this.checkIPReputation(value);
                        }
                    }
                    // Domain-based enrichments
                    if (this.isDomain(value)) {
                        if (this.config.lookupWhois) {
                            result.enrichments.whois = await this.lookupWhois(value);
                        }
                        if (this.config.lookupDns) {
                            result.enrichments.dns = await this.lookupDns(value);
                        }
                        if (this.config.checkReputation) {
                            result.enrichments.reputation = await this.checkDomainReputation(value);
                        }
                    }
                }
            }
        }
        catch (error) {
            logger.error({ error: error.message, objectId: object.id }, 'Enrichment failed');
        }
        result.processingTimeMs = Date.now() - startTime;
        return result;
    }
    /**
     * Enrich a batch of STIX objects
     */
    async enrichBatch(objects) {
        const results = [];
        // Generate embeddings in batches
        if (this.config.generateEmbeddings && this.config.openaiApiKey) {
            const texts = objects.map(({ object }) => this.objectToText(object));
            const embeddings = await this.generateEmbeddingsBatch(texts.filter(Boolean));
            let embeddingIndex = 0;
            for (let i = 0; i < objects.length; i++) {
                const { object, metadata } = objects[i];
                const startTime = Date.now();
                const result = {
                    object,
                    metadata,
                    enrichments: {},
                    processingTimeMs: 0,
                };
                // Assign embedding if text was generated
                if (texts[i] && embeddingIndex < embeddings.length) {
                    result.embedding = embeddings[embeddingIndex++];
                }
                // Map to MITRE
                if (this.config.mapMitre) {
                    result.enrichments.mitreMappings = this.mapToMitre(object);
                }
                // Calculate risk score
                result.enrichments.riskScore = this.calculateRiskScore(object, result.enrichments);
                result.processingTimeMs = Date.now() - startTime;
                results.push(result);
            }
        }
        else {
            // Process individually without embeddings
            for (const { object, metadata } of objects) {
                results.push(await this.enrich(object, metadata));
            }
        }
        logger.info({ count: results.length }, 'Batch enrichment completed');
        return results;
    }
    /**
     * Convert STIX object to text for embedding
     */
    objectToText(object) {
        const parts = [];
        const obj = object;
        if (obj.name)
            parts.push(`Name: ${obj.name}`);
        if (obj.description)
            parts.push(`Description: ${obj.description}`);
        if (obj.pattern)
            parts.push(`Pattern: ${obj.pattern}`);
        if (obj.labels && Array.isArray(obj.labels)) {
            parts.push(`Labels: ${obj.labels.join(', ')}`);
        }
        if (obj.aliases && Array.isArray(obj.aliases)) {
            parts.push(`Aliases: ${obj.aliases.join(', ')}`);
        }
        if (obj.goals && Array.isArray(obj.goals)) {
            parts.push(`Goals: ${obj.goals.join(', ')}`);
        }
        parts.push(`Type: ${object.type}`);
        return parts.length > 1 ? parts.join('\n') : null;
    }
    /**
     * Generate embedding using OpenAI API
     */
    async generateEmbedding(text) {
        await this.rateLimit();
        try {
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.openaiApiKey}`,
                },
                body: JSON.stringify({
                    model: this.config.embeddingModel,
                    input: text,
                }),
            });
            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }
            const data = await response.json();
            return data.data[0].embedding;
        }
        catch (error) {
            logger.error({ error: error.message }, 'Failed to generate embedding');
            return [];
        }
    }
    /**
     * Generate embeddings in batch
     */
    async generateEmbeddingsBatch(texts) {
        if (texts.length === 0)
            return [];
        const embeddings = [];
        const batchSize = this.config.embeddingBatchSize;
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            await this.rateLimit();
            try {
                const response = await fetch('https://api.openai.com/v1/embeddings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.config.openaiApiKey}`,
                    },
                    body: JSON.stringify({
                        model: this.config.embeddingModel,
                        input: batch,
                    }),
                });
                if (!response.ok) {
                    throw new Error(`OpenAI API error: ${response.status}`);
                }
                const data = await response.json();
                embeddings.push(...data.data.map((d) => d.embedding));
            }
            catch (error) {
                logger.error({ error: error.message, batch: i }, 'Batch embedding failed');
                // Fill with empty arrays for failed batch
                embeddings.push(...batch.map(() => []));
            }
        }
        return embeddings;
    }
    /**
     * Map object to MITRE ATT&CK techniques
     */
    mapToMitre(object) {
        const mappings = [];
        const obj = object;
        // Combine searchable text
        const searchText = [
            obj.name,
            obj.description,
            obj.pattern,
            ...(Array.isArray(obj.labels) ? obj.labels : []),
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        // Search for MITRE patterns
        for (const [pattern, mapping] of Object.entries(MITRE_PATTERNS)) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(searchText)) {
                mappings.push(`${mapping.id}:${mapping.name}`);
            }
        }
        // Check external references for explicit MITRE mappings
        if (obj.external_references && Array.isArray(obj.external_references)) {
            for (const ref of obj.external_references) {
                if (ref.source_name === 'mitre-attack' && ref.external_id) {
                    if (!mappings.some((m) => m.startsWith(ref.external_id))) {
                        mappings.push(ref.external_id);
                    }
                }
            }
        }
        return [...new Set(mappings)];
    }
    /**
     * Calculate risk score based on object properties and enrichments
     */
    calculateRiskScore(object, enrichments) {
        let score = 50; // Base score
        const obj = object;
        // Confidence factor
        if (typeof obj.confidence === 'number') {
            score = (score + obj.confidence) / 2;
        }
        // Type-based adjustments
        const highRiskTypes = ['malware', 'attack-pattern', 'threat-actor'];
        if (highRiskTypes.includes(object.type)) {
            score += 10;
        }
        // MITRE mappings increase risk
        if (enrichments.mitreMappings && enrichments.mitreMappings.length > 0) {
            score += Math.min(enrichments.mitreMappings.length * 5, 20);
        }
        // Reputation score
        if (enrichments.reputation) {
            score = (score + enrichments.reputation.score) / 2;
        }
        // Severity labels
        const labels = obj.labels || [];
        if (labels.some((l) => /critical|severe/i.test(l)))
            score += 15;
        else if (labels.some((l) => /high/i.test(l)))
            score += 10;
        else if (labels.some((l) => /medium/i.test(l)))
            score += 5;
        // Threat actor sophistication
        if (obj.sophistication) {
            const sophMap = {
                'none': -10,
                'minimal': 0,
                'intermediate': 10,
                'advanced': 20,
                'expert': 30,
                'innovator': 40,
                'strategic': 50,
            };
            score += sophMap[obj.sophistication] || 0;
        }
        return Math.max(0, Math.min(100, Math.round(score)));
    }
    /**
     * Generate AI summary (placeholder - requires full OpenAI integration)
     */
    async generateSummary(object) {
        // For production, implement full chat completion API call
        const obj = object;
        if (obj.description && typeof obj.description === 'string') {
            return obj.description.substring(0, 200) + (obj.description.length > 200 ? '...' : '');
        }
        return undefined;
    }
    /**
     * Extract value from STIX pattern
     */
    extractPatternValue(pattern) {
        const match = pattern.match(/=\s*'([^']+)'/);
        return match ? match[1] : null;
    }
    /**
     * Check if value is an IP address
     */
    isIPAddress(value) {
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
        return ipv4Regex.test(value) || ipv6Regex.test(value);
    }
    /**
     * Check if value is a domain
     */
    isDomain(value) {
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
        return domainRegex.test(value);
    }
    /**
     * Geolocate IP address (placeholder)
     */
    async geolocateIP(ip) {
        // In production, integrate with MaxMind, IPInfo, or similar service
        logger.debug({ ip }, 'Geolocation lookup (stub)');
        return undefined;
    }
    /**
     * Check IP reputation (placeholder)
     */
    async checkIPReputation(ip) {
        // In production, integrate with VirusTotal, AbuseIPDB, or similar
        logger.debug({ ip }, 'IP reputation check (stub)');
        return undefined;
    }
    /**
     * Check domain reputation (placeholder)
     */
    async checkDomainReputation(domain) {
        // In production, integrate with VirusTotal, URLhaus, or similar
        logger.debug({ domain }, 'Domain reputation check (stub)');
        return undefined;
    }
    /**
     * WHOIS lookup (placeholder)
     */
    async lookupWhois(domain) {
        // In production, integrate with WHOIS API
        logger.debug({ domain }, 'WHOIS lookup (stub)');
        return undefined;
    }
    /**
     * DNS lookup (placeholder)
     */
    async lookupDns(domain) {
        // In production, use dns.promises or external DNS API
        logger.debug({ domain }, 'DNS lookup (stub)');
        return undefined;
    }
    /**
     * Simple rate limiter
     */
    async rateLimit() {
        const now = Date.now();
        const windowMs = 1000;
        if (now - this.rateLimiter.lastCall < windowMs) {
            this.rateLimiter.callCount++;
            if (this.rateLimiter.callCount >= this.config.rateLimitPerSecond) {
                const waitTime = windowMs - (now - this.rateLimiter.lastCall);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                this.rateLimiter.callCount = 0;
            }
        }
        else {
            this.rateLimiter.callCount = 1;
        }
        this.rateLimiter.lastCall = Date.now();
    }
}
exports.AgenticEnricher = AgenticEnricher;
/**
 * Factory function to create AgenticEnricher
 */
function createAgenticEnricher(config) {
    return new AgenticEnricher(config);
}
