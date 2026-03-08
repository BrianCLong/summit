"use strict";
/**
 * DNS Analyzer - DNS traffic analysis
 * TRAINING/SIMULATION ONLY
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DNSAnalyzer = void 0;
const uuid_1 = require("uuid");
class DNSAnalyzer {
    queries = new Map();
    responses = new Map();
    domainCounts = new Map();
    resolverCounts = new Map();
    suspiciousDomains = new Set();
    /**
     * Process a DNS query
     */
    processQuery(query) {
        const dnsQuery = {
            ...query,
            id: (0, uuid_1.v4)(),
            isSimulated: true
        };
        this.queries.set(dnsQuery.id, dnsQuery);
        // Update statistics
        const domain = this.extractBaseDomain(query.queryName);
        this.domainCounts.set(domain, (this.domainCounts.get(domain) || 0) + 1);
        this.resolverCounts.set(query.destinationIP, (this.resolverCounts.get(query.destinationIP) || 0) + 1);
        // Check for threats
        this.analyzeThreat(dnsQuery);
        return dnsQuery;
    }
    /**
     * Process a DNS response
     */
    processResponse(response) {
        const dnsResponse = {
            ...response,
            id: (0, uuid_1.v4)(),
            isSimulated: true
        };
        this.responses.set(dnsResponse.id, dnsResponse);
        return dnsResponse;
    }
    /**
     * Analyze domain for threats
     */
    analyzeThreat(query) {
        const indicators = [];
        let threatType = null;
        let severity = 'low';
        const domain = query.queryName.toLowerCase();
        // Check for DGA (Domain Generation Algorithm)
        if (this.isDGALike(domain)) {
            indicators.push('High entropy domain name');
            indicators.push('Consonant clusters unusual for natural language');
            threatType = 'DGA';
            severity = 'high';
        }
        // Check for DNS tunneling indicators
        if (this.isTunnelLike(domain)) {
            indicators.push('Unusually long subdomain');
            indicators.push('Base64-like encoding in subdomain');
            threatType = 'TUNNEL';
            severity = 'high';
        }
        // Check for typosquatting
        const typosquatTarget = this.checkTyposquat(domain);
        if (typosquatTarget) {
            indicators.push(`Similar to legitimate domain: ${typosquatTarget}`);
            threatType = 'TYPOSQUAT';
            severity = 'medium';
        }
        if (threatType) {
            this.suspiciousDomains.add(domain);
            return {
                type: threatType,
                severity,
                domain,
                indicators,
                confidence: 0.7 + Math.random() * 0.2
            };
        }
        return null;
    }
    /**
     * Check if domain looks like DGA-generated
     */
    isDGALike(domain) {
        const parts = domain.split('.');
        const name = parts[0];
        if (name.length < 8)
            return false;
        // Calculate entropy
        const entropy = this.calculateEntropy(name);
        if (entropy < 3.5)
            return false;
        // Check for unusual character patterns
        const consonantRuns = name.match(/[bcdfghjklmnpqrstvwxyz]{4,}/gi);
        if (consonantRuns && consonantRuns.length > 0)
            return true;
        // Check vowel ratio
        const vowels = (name.match(/[aeiou]/gi) || []).length;
        const vowelRatio = vowels / name.length;
        if (vowelRatio < 0.15 || vowelRatio > 0.6)
            return true;
        return entropy > 4.0;
    }
    /**
     * Check if domain shows DNS tunneling patterns
     */
    isTunnelLike(domain) {
        const parts = domain.split('.');
        // Check for very long subdomains
        for (const part of parts.slice(0, -2)) {
            if (part.length > 40)
                return true;
            // Check for base64-like patterns
            if (/^[A-Za-z0-9+/=]{20,}$/.test(part))
                return true;
            // Check for hex-encoded data
            if (/^[0-9a-f]{32,}$/i.test(part))
                return true;
        }
        // Check total domain length
        if (domain.length > 100)
            return true;
        return false;
    }
    /**
     * Check for typosquatting of known domains
     */
    checkTyposquat(domain) {
        const knownDomains = [
            'google.com', 'facebook.com', 'amazon.com', 'microsoft.com',
            'apple.com', 'twitter.com', 'linkedin.com', 'paypal.com'
        ];
        const baseDomain = this.extractBaseDomain(domain);
        for (const known of knownDomains) {
            const distance = this.levenshteinDistance(baseDomain, known);
            if (distance > 0 && distance <= 2) {
                return known;
            }
        }
        return null;
    }
    /**
     * Generate simulated DNS traffic for training
     */
    generateSimulatedTraffic(count, includeMalicious = true) {
        const queries = [];
        const responses = [];
        const threats = [];
        const normalDomains = [
            'www.example.com', 'api.service.com', 'cdn.provider.net',
            'mail.company.org', 'app.platform.io', 'static.assets.com'
        ];
        const maliciousDomains = [
            'xkjh3kj4h5kjh3.malware.net', // DGA-like
            'YWJjZGVmZ2hpamtsbW5vcA.tunnel.com', // Base64 subdomain
            'gooogle.com', // Typosquat
            'amaz0n.com', // Typosquat
        ];
        for (let i = 0; i < count; i++) {
            const isMalicious = includeMalicious && Math.random() < 0.1;
            const domain = isMalicious
                ? maliciousDomains[Math.floor(Math.random() * maliciousDomains.length)]
                : normalDomains[Math.floor(Math.random() * normalDomains.length)];
            const query = this.processQuery({
                timestamp: new Date(),
                transactionId: Math.floor(Math.random() * 65535),
                queryName: domain,
                queryType: 'A',
                sourceIP: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                destinationIP: '8.8.8.8'
            });
            queries.push(query);
            // Generate response
            const response = this.processResponse({
                queryId: query.id,
                timestamp: new Date(query.timestamp.getTime() + Math.random() * 100),
                responseCode: isMalicious && Math.random() < 0.3 ? 'NXDOMAIN' : 'NOERROR',
                answers: [{
                        name: domain,
                        type: 'A',
                        class: 'IN',
                        ttl: 300,
                        data: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
                    }],
                authoritative: false,
                truncated: false,
                recursionAvailable: true,
                responseTime: 5 + Math.random() * 50
            });
            responses.push(response);
            // Collect threats
            const threat = this.analyzeThreat(query);
            if (threat)
                threats.push(threat);
        }
        return { queries, responses, threats };
    }
    /**
     * Get DNS statistics
     */
    getStatistics() {
        const queryTypes = {};
        const responseCodes = {};
        let totalResponseTime = 0;
        let nxdomainCount = 0;
        for (const query of this.queries.values()) {
            queryTypes[query.queryType] = (queryTypes[query.queryType] || 0) + 1;
        }
        for (const response of this.responses.values()) {
            responseCodes[response.responseCode] = (responseCodes[response.responseCode] || 0) + 1;
            totalResponseTime += response.responseTime;
            if (response.responseCode === 'NXDOMAIN')
                nxdomainCount++;
        }
        const topDomains = Array.from(this.domainCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([domain, count]) => ({ domain, count }));
        const topResolvers = Array.from(this.resolverCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([ip, count]) => ({ ip, count }));
        return {
            totalQueries: this.queries.size,
            totalResponses: this.responses.size,
            queryTypeDistribution: queryTypes,
            responseCodeDistribution: responseCodes,
            topQueriedDomains: topDomains,
            topResolvers: topResolvers,
            averageResponseTime: this.responses.size > 0 ? totalResponseTime / this.responses.size : 0,
            nxdomainRate: this.responses.size > 0 ? nxdomainCount / this.responses.size : 0,
            suspiciousQueries: this.suspiciousDomains.size
        };
    }
    /**
     * Get suspicious domains
     */
    getSuspiciousDomains() {
        return Array.from(this.suspiciousDomains);
    }
    extractBaseDomain(domain) {
        const parts = domain.split('.');
        if (parts.length >= 2) {
            return parts.slice(-2).join('.');
        }
        return domain;
    }
    calculateEntropy(str) {
        const freq = new Map();
        for (const char of str) {
            freq.set(char, (freq.get(char) || 0) + 1);
        }
        let entropy = 0;
        for (const count of freq.values()) {
            const p = count / str.length;
            entropy -= p * Math.log2(p);
        }
        return entropy;
    }
    levenshteinDistance(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[b.length][a.length];
    }
    clear() {
        this.queries.clear();
        this.responses.clear();
        this.domainCounts.clear();
        this.resolverCounts.clear();
        this.suspiciousDomains.clear();
    }
}
exports.DNSAnalyzer = DNSAnalyzer;
