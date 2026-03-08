"use strict";
/**
 * IOC (Indicators of Compromise) Management Service
 * Comprehensive IOC lifecycle management with geospatial enrichment
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IOCManagementService = void 0;
/**
 * IOC Management Service
 * Provides comprehensive IOC lifecycle management
 */
class IOCManagementService {
    repository;
    iocCache;
    enrichmentCache;
    detectionRules;
    constructor(repository) {
        this.repository = repository;
        this.iocCache = new Map();
        this.enrichmentCache = new Map();
        this.detectionRules = new Map();
        this.initializeDefaultRules();
    }
    // ============================================================================
    // IOC Lifecycle Management
    // ============================================================================
    /**
     * Ingest new IOC with automatic enrichment
     */
    async ingestIOC(iocData) {
        const startTime = performance.now();
        // Validate and normalize IOC
        const normalizedValue = this.normalizeIOCValue(iocData.type, iocData.value);
        // Check for duplicates
        const existingIOC = await this.findByValue(normalizedValue);
        if (existingIOC) {
            // Update sighting count and last seen
            return this.updateIOCSighting(existingIOC);
        }
        // Create new IOC
        const ioc = {
            id: `ioc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: iocData.type,
            value: normalizedValue,
            severity: iocData.severity || 'MEDIUM',
            confidence: iocData.confidence || 50,
            tlp: iocData.tlp || 'AMBER',
            threatActors: iocData.threatActors || [],
            campaigns: iocData.campaigns || [],
            malwareFamilies: iocData.malwareFamilies || [],
            context: iocData.context || { description: '' },
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            active: true,
            sightings: 1,
            sources: iocData.sources || [],
            relatedIOCs: [],
            tenantId: iocData.tenantId || 'default',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        // Perform enrichment
        const enrichment = await this.enrichIOC(ioc);
        // Apply enrichment to IOC
        if (enrichment.enrichments.geolocation) {
            ioc.geolocation = enrichment.enrichments.geolocation;
        }
        // Auto-classify severity based on reputation
        if (enrichment.enrichments.reputation) {
            ioc.severity = this.classifySeverity(enrichment.enrichments.reputation.score);
        }
        // Store in repository
        await this.repository.bulkUpsertIOCs([ioc]);
        // Cache the IOC
        this.iocCache.set(ioc.id, ioc);
        return {
            ioc,
            enrichments: enrichment.enrichments,
            processingTime: performance.now() - startTime,
        };
    }
    /**
     * Bulk ingest IOCs from a threat feed
     */
    async bulkIngestIOCs(iocs, options) {
        const startTime = performance.now();
        const batchSize = options?.batchSize || 100;
        const enrichmentLevel = options?.enrichmentLevel || 'BASIC';
        let ingested = 0;
        let duplicates = 0;
        let errors = 0;
        let enriched = 0;
        // Process in batches
        for (let i = 0; i < iocs.length; i += batchSize) {
            const batch = iocs.slice(i, i + batchSize);
            const processedIOCs = [];
            for (const iocData of batch) {
                try {
                    const normalizedValue = this.normalizeIOCValue(iocData.type, iocData.value);
                    // Check for duplicates if enabled
                    if (options?.deduplication) {
                        const existing = await this.findByValue(normalizedValue);
                        if (existing) {
                            duplicates++;
                            continue;
                        }
                    }
                    const ioc = {
                        id: `ioc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        type: iocData.type,
                        value: normalizedValue,
                        severity: iocData.severity || 'MEDIUM',
                        confidence: iocData.confidence || 50,
                        tlp: iocData.tlp || 'AMBER',
                        threatActors: iocData.threatActors || [],
                        campaigns: iocData.campaigns || [],
                        malwareFamilies: iocData.malwareFamilies || [],
                        context: iocData.context || { description: '' },
                        firstSeen: new Date().toISOString(),
                        lastSeen: new Date().toISOString(),
                        active: true,
                        sightings: 1,
                        sources: iocData.sources || [],
                        relatedIOCs: [],
                        tenantId: iocData.tenantId || 'default',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                    // Perform enrichment based on level
                    if (enrichmentLevel !== 'NONE') {
                        const enrichment = await this.enrichIOC(ioc, enrichmentLevel === 'FULL');
                        if (enrichment.enrichments.geolocation) {
                            ioc.geolocation = enrichment.enrichments.geolocation;
                            enriched++;
                        }
                    }
                    processedIOCs.push(ioc);
                    ingested++;
                }
                catch (error) {
                    errors++;
                }
            }
            // Store batch in repository
            if (processedIOCs.length > 0) {
                await this.repository.bulkUpsertIOCs(processedIOCs);
            }
        }
        return {
            ingested,
            duplicates,
            errors,
            enriched,
            processingTime: performance.now() - startTime,
        };
    }
    /**
     * Enrich IOC with external data sources
     */
    async enrichIOC(ioc, fullEnrichment = false) {
        const startTime = performance.now();
        // Check cache first
        const cacheKey = `${ioc.type}_${ioc.value}`;
        const cached = this.enrichmentCache.get(cacheKey);
        if (cached && Date.now() - new Date(cached.ioc.updatedAt).getTime() < 3600000) {
            return cached;
        }
        const enrichments = {};
        // Geolocation enrichment for IP addresses
        if (ioc.type === 'IP_ADDRESS') {
            enrichments.geolocation = await this.geolocateIP(ioc.value);
        }
        // Domain enrichment
        if (ioc.type === 'DOMAIN' || ioc.type === 'URL') {
            if (fullEnrichment) {
                enrichments.whois = await this.lookupWHOIS(ioc.value);
                enrichments.dns = await this.lookupDNS(ioc.value);
            }
        }
        // Reputation lookup
        enrichments.reputation = await this.lookupReputation(ioc.type, ioc.value);
        // Related threat actors
        if (fullEnrichment) {
            enrichments.relatedThreatActors = await this.findRelatedThreatActors(ioc);
            enrichments.relatedMalware = await this.findRelatedMalware(ioc);
        }
        const result = {
            ioc,
            enrichments,
            processingTime: performance.now() - startTime,
        };
        // Cache result
        this.enrichmentCache.set(cacheKey, result);
        return result;
    }
    /**
     * Correlate IOC with existing intelligence
     */
    async correlateIOC(iocId) {
        const result = await this.repository.findIOCAttributionChain(iocId);
        const clusters = this.clusterRelatedIOCs(result.data.relatedIOCs);
        return {
            primaryIOC: result.data.ioc,
            correlations: result.data.relatedIOCs.map((ioc, idx) => ({
                ioc,
                relationshipType: 'RELATED_TO',
                confidence: 80 - idx * 5,
                evidence: [],
                distance: Math.floor(idx / 3) + 1,
            })),
            clusters,
            threatAssessment: {
                overallThreat: this.calculateThreatScore(result.data),
                attributedActors: result.data.threatActors.map(a => a.name),
                campaigns: result.data.campaigns,
                mitreTechniques: [],
            },
        };
    }
    // ============================================================================
    // Detection Rule Management
    // ============================================================================
    /**
     * Create a detection rule
     */
    async createDetectionRule(rule) {
        const detectionRule = {
            ...rule,
            id: `rule_${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.detectionRules.set(detectionRule.id, detectionRule);
        return detectionRule;
    }
    /**
     * Generate detection rules from IOCs
     */
    async generateDetectionRules(iocIds, ruleType) {
        const rules = [];
        for (const iocId of iocIds) {
            const ioc = this.iocCache.get(iocId);
            if (!ioc)
                continue;
            const pattern = this.generateRulePattern(ioc, ruleType);
            if (pattern) {
                // Map IOC severity to DetectionRule severity (filter out 'INFO')
                const ruleSeverity = ioc.severity === 'INFO' ? 'LOW' : ioc.severity;
                rules.push(await this.createDetectionRule({
                    name: `Detect ${ioc.type}: ${ioc.value.substring(0, 30)}`,
                    description: `Auto-generated rule for ${ioc.type} indicator`,
                    type: ruleType,
                    pattern,
                    severity: ruleSeverity,
                    tags: ioc.context.tags || [],
                    iocTypes: [ioc.type],
                    enabled: true,
                }));
            }
        }
        return rules;
    }
    /**
     * Export IOCs in STIX format
     */
    async exportToSTIX(iocIds) {
        const stixBundle = {
            type: 'bundle',
            id: `bundle--${crypto.randomUUID()}`,
            spec_version: '2.1',
            objects: [],
        };
        for (const iocId of iocIds) {
            const ioc = this.iocCache.get(iocId);
            if (!ioc)
                continue;
            const stixIndicator = {
                type: 'indicator',
                spec_version: '2.1',
                id: `indicator--${ioc.id}`,
                created: ioc.createdAt,
                modified: ioc.updatedAt,
                name: `${ioc.type}: ${ioc.value}`,
                description: ioc.context.description || '',
                indicator_types: [this.mapIOCTypeToSTIX(ioc.type)],
                pattern: this.createSTIXPattern(ioc),
                pattern_type: 'stix',
                valid_from: ioc.firstSeen,
                valid_until: ioc.expiresAt,
                confidence: ioc.confidence,
                labels: ioc.context.tags || [],
            };
            stixBundle.objects.push(stixIndicator);
            // Add geolocation as observed-data if available
            if (ioc.geolocation) {
                const locationObject = {
                    type: 'location',
                    spec_version: '2.1',
                    id: `location--${ioc.id}-geo`,
                    created: ioc.createdAt,
                    modified: ioc.updatedAt,
                    latitude: ioc.geolocation.latitude,
                    longitude: ioc.geolocation.longitude,
                    country: ioc.geolocation.country,
                    city: ioc.geolocation.city,
                };
                stixBundle.objects.push(locationObject);
            }
        }
        return JSON.stringify(stixBundle, null, 2);
    }
    // ============================================================================
    // Geospatial IOC Analysis
    // ============================================================================
    /**
     * Find IOCs within geographic proximity
     */
    async findIOCsInRegion(center, radiusMeters, options) {
        const result = await this.repository.findIOCsInProximity(center, radiusMeters, {
            types: options?.types,
            severities: options?.severities,
            limit: 1000,
        });
        return result.data.filter(ioc => !options?.minConfidence || ioc.confidence >= options.minConfidence);
    }
    /**
     * Generate geographic IOC heatmap
     */
    async generateIOCHeatmap(bbox, options) {
        const result = await this.repository.generateThreatHeatmap({
            bbox,
            limit: 10000,
        });
        return result.data.map(cell => ({
            h3Index: cell.h3Index,
            iocCount: cell.incidentCount,
            severityScore: cell.activityScore,
            topTypes: ['IP_ADDRESS', 'DOMAIN'], // Would be calculated from actual data
        }));
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    /**
     * Normalize IOC value based on type
     */
    normalizeIOCValue(type, value) {
        switch (type) {
            case 'IP_ADDRESS':
                return value.trim().toLowerCase();
            case 'DOMAIN':
                return value.trim().toLowerCase().replace(/^www\./, '');
            case 'URL':
                return value.trim().toLowerCase();
            case 'EMAIL':
                return value.trim().toLowerCase();
            case 'FILE_HASH_MD5':
            case 'FILE_HASH_SHA1':
            case 'FILE_HASH_SHA256':
                return value.trim().toLowerCase();
            default:
                return value.trim();
        }
    }
    /**
     * Find IOC by value
     */
    async findByValue(value) {
        // Check cache first
        for (const ioc of this.iocCache.values()) {
            if (ioc.value === value) {
                return ioc;
            }
        }
        return null;
    }
    /**
     * Update IOC sighting
     */
    async updateIOCSighting(ioc) {
        ioc.sightings++;
        ioc.lastSeen = new Date().toISOString();
        ioc.updatedAt = new Date().toISOString();
        this.iocCache.set(ioc.id, ioc);
        return {
            ioc,
            enrichments: {},
            processingTime: 0,
        };
    }
    /**
     * Geolocate IP address (simulated)
     */
    async geolocateIP(ip) {
        // Simulated geolocation - in production would use MaxMind or similar
        const octets = ip.split('.').map(Number);
        return {
            latitude: 38.0 + (octets[0] % 10) / 10,
            longitude: -77.0 + (octets[1] % 10) / 10,
            country: 'US',
            city: 'Washington',
            asn: `AS${octets[2] * 100 + octets[3]}`,
            isp: 'Example ISP',
            confidence: 85,
        };
    }
    /**
     * Lookup WHOIS data (simulated)
     */
    async lookupWHOIS(domain) {
        return {
            registrar: 'Example Registrar',
            registrantCountry: 'US',
            createdDate: '2020-01-01T00:00:00Z',
            updatedDate: '2024-01-01T00:00:00Z',
            expiryDate: '2025-01-01T00:00:00Z',
        };
    }
    /**
     * Lookup DNS records (simulated)
     */
    async lookupDNS(domain) {
        return {
            resolvedIPs: ['1.2.3.4', '5.6.7.8'],
            mx: ['mail.example.com'],
            txt: [],
            ns: ['ns1.example.com', 'ns2.example.com'],
        };
    }
    /**
     * Lookup reputation (simulated)
     */
    async lookupReputation(type, value) {
        // Simulated reputation lookup
        return {
            score: Math.floor(Math.random() * 100),
            categories: ['malware', 'phishing'],
            firstReported: '2024-01-01T00:00:00Z',
            lastReported: new Date().toISOString(),
            sources: 5,
        };
    }
    /**
     * Find related threat actors
     */
    async findRelatedThreatActors(ioc) {
        const result = await this.repository.findThreatActorsByCyberInfra(ioc.value);
        return result.data.map(({ actor, path }) => ({
            id: actor.id,
            name: actor.name,
            confidence: Math.max(0, 100 - path.length * 20),
        }));
    }
    /**
     * Find related malware
     */
    async findRelatedMalware(ioc) {
        // Simulated malware lookup
        return ioc.malwareFamilies.map(family => ({
            family,
            confidence: 80,
        }));
    }
    /**
     * Classify severity based on reputation score
     */
    classifySeverity(score) {
        if (score >= 90)
            return 'CRITICAL';
        if (score >= 70)
            return 'HIGH';
        if (score >= 40)
            return 'MEDIUM';
        if (score >= 20)
            return 'LOW';
        return 'INFO';
    }
    /**
     * Cluster related IOCs
     */
    clusterRelatedIOCs(iocs) {
        const clusters = [];
        // Group by type
        const byType = new Map();
        for (const ioc of iocs) {
            const existing = byType.get(ioc.type) || [];
            existing.push(ioc);
            byType.set(ioc.type, existing);
        }
        for (const [type, typeIOCs] of byType) {
            if (typeIOCs.length >= 2) {
                clusters.push({
                    id: `cluster_${type}_${Date.now()}`,
                    iocs: typeIOCs,
                    commonality: `Same IOC type: ${type}`,
                    threatLevel: this.calculateClusterThreatLevel(typeIOCs),
                });
            }
        }
        return clusters;
    }
    /**
     * Calculate cluster threat level
     */
    calculateClusterThreatLevel(iocs) {
        const avgConfidence = iocs.reduce((sum, ioc) => sum + ioc.confidence, 0) / iocs.length;
        if (avgConfidence >= 80)
            return 'CRITICAL';
        if (avgConfidence >= 60)
            return 'HIGH';
        if (avgConfidence >= 40)
            return 'MEDIUM';
        return 'LOW';
    }
    /**
     * Calculate threat score from IOC chain data
     */
    calculateThreatScore(data) {
        let score = data.ioc.confidence;
        score += data.relatedIOCs.length * 5;
        score += data.threatActors.length * 15;
        return Math.min(score, 100);
    }
    /**
     * Generate rule pattern for IOC
     */
    generateRulePattern(ioc, ruleType) {
        switch (ruleType) {
            case 'SNORT':
                if (ioc.type === 'IP_ADDRESS') {
                    return `alert ip any any -> ${ioc.value} any (msg:"Malicious IP ${ioc.value}"; sid:${Date.now()}; rev:1;)`;
                }
                if (ioc.type === 'DOMAIN') {
                    return `alert dns any any -> any any (msg:"Malicious Domain ${ioc.value}"; content:"${ioc.value}"; nocase; sid:${Date.now()}; rev:1;)`;
                }
                break;
            case 'YARA':
                if (ioc.type.startsWith('FILE_HASH')) {
                    return `rule ${ioc.value.substring(0, 10)}_malware { meta: description = "Detect ${ioc.value}" strings: $hash = "${ioc.value}" condition: $hash }`;
                }
                break;
            case 'SIGMA':
                return JSON.stringify({
                    title: `Detect ${ioc.type}`,
                    status: 'experimental',
                    logsource: { category: 'network' },
                    detection: { selection: { dst_ip: ioc.value }, condition: 'selection' },
                });
        }
        return null;
    }
    /**
     * Map IOC type to STIX indicator type
     */
    mapIOCTypeToSTIX(type) {
        const mapping = {
            IP_ADDRESS: 'ipv4-addr',
            DOMAIN: 'domain-name',
            URL: 'url',
            EMAIL: 'email-addr',
            FILE_HASH_MD5: 'file',
            FILE_HASH_SHA1: 'file',
            FILE_HASH_SHA256: 'file',
            FILE_NAME: 'file',
            FILE_PATH: 'file',
            REGISTRY_KEY: 'windows-registry-key',
            MUTEX: 'mutex',
            USER_AGENT: 'user-agent',
            CERTIFICATE: 'x509-certificate',
            CVE: 'vulnerability',
            YARA_RULE: 'malware',
            SNORT_RULE: 'malware',
            BITCOIN_ADDRESS: 'cryptocurrency-wallet',
            PHONE_NUMBER: 'phone-number',
            GEOLOCATION: 'location',
        };
        return mapping[type] || 'indicator';
    }
    /**
     * Create STIX pattern from IOC
     */
    createSTIXPattern(ioc) {
        switch (ioc.type) {
            case 'IP_ADDRESS':
                return `[ipv4-addr:value = '${ioc.value}']`;
            case 'DOMAIN':
                return `[domain-name:value = '${ioc.value}']`;
            case 'URL':
                return `[url:value = '${ioc.value}']`;
            case 'FILE_HASH_SHA256':
                return `[file:hashes.'SHA-256' = '${ioc.value}']`;
            case 'FILE_HASH_MD5':
                return `[file:hashes.MD5 = '${ioc.value}']`;
            default:
                return `[indicator:value = '${ioc.value}']`;
        }
    }
    /**
     * Initialize default detection rules
     */
    initializeDefaultRules() {
        // Add some default rules
        this.createDetectionRule({
            name: 'Detect Known C2 IP',
            description: 'Detect communication to known C2 infrastructure',
            type: 'SNORT',
            pattern: 'alert ip any any -> $EXTERNAL_NET any (msg:"Known C2 Communication"; sid:1000001;)',
            severity: 'HIGH',
            tags: ['c2', 'malware'],
            iocTypes: ['IP_ADDRESS'],
            enabled: true,
        });
        this.createDetectionRule({
            name: 'Detect Malware Hash',
            description: 'Detect files matching known malware hashes',
            type: 'YARA',
            pattern: 'rule MalwareDetection { condition: false }',
            severity: 'CRITICAL',
            tags: ['malware', 'hash'],
            iocTypes: ['FILE_HASH_SHA256', 'FILE_HASH_MD5'],
            enabled: true,
        });
    }
}
exports.IOCManagementService = IOCManagementService;
exports.default = IOCManagementService;
