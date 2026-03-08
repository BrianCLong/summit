"use strict";
// @ts-nocheck
/**
 * Crypto Analyzer - Cryptographic traffic analysis
 * TRAINING/SIMULATION ONLY
 *
 * This module analyzes metadata and patterns in encrypted traffic
 * for educational purposes. It does NOT decrypt content.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoAnalyzer = void 0;
const uuid_1 = require("uuid");
class CryptoAnalyzer {
    knownCipherSuites = new Map();
    constructor() {
        this.initializeCipherSuites();
    }
    initializeCipherSuites() {
        // Educational cipher suite database
        const suites = [
            ['TLS_AES_256_GCM_SHA384', {
                    name: 'TLS_AES_256_GCM_SHA384',
                    strength: 'strong',
                    keyExchange: 'TLS 1.3',
                    authentication: 'Certificate',
                    encryption: 'AES-256-GCM',
                    mac: 'AEAD',
                    vulnerabilities: [],
                    recommendation: 'Recommended for use'
                }],
            ['TLS_AES_128_GCM_SHA256', {
                    name: 'TLS_AES_128_GCM_SHA256',
                    strength: 'strong',
                    keyExchange: 'TLS 1.3',
                    authentication: 'Certificate',
                    encryption: 'AES-128-GCM',
                    mac: 'AEAD',
                    vulnerabilities: [],
                    recommendation: 'Recommended for use'
                }],
            ['TLS_CHACHA20_POLY1305_SHA256', {
                    name: 'TLS_CHACHA20_POLY1305_SHA256',
                    strength: 'strong',
                    keyExchange: 'TLS 1.3',
                    authentication: 'Certificate',
                    encryption: 'ChaCha20-Poly1305',
                    mac: 'AEAD',
                    vulnerabilities: [],
                    recommendation: 'Recommended for use'
                }],
            ['TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384', {
                    name: 'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
                    strength: 'strong',
                    keyExchange: 'ECDHE',
                    authentication: 'RSA',
                    encryption: 'AES-256-GCM',
                    mac: 'AEAD',
                    vulnerabilities: [],
                    recommendation: 'Recommended for TLS 1.2'
                }],
            ['TLS_RSA_WITH_AES_128_CBC_SHA', {
                    name: 'TLS_RSA_WITH_AES_128_CBC_SHA',
                    strength: 'moderate',
                    keyExchange: 'RSA',
                    authentication: 'RSA',
                    encryption: 'AES-128-CBC',
                    mac: 'SHA-1',
                    vulnerabilities: ['No forward secrecy', 'CBC mode vulnerable to padding oracle'],
                    recommendation: 'Consider upgrading to AEAD cipher'
                }],
            ['TLS_RSA_WITH_3DES_EDE_CBC_SHA', {
                    name: 'TLS_RSA_WITH_3DES_EDE_CBC_SHA',
                    strength: 'weak',
                    keyExchange: 'RSA',
                    authentication: 'RSA',
                    encryption: '3DES',
                    mac: 'SHA-1',
                    vulnerabilities: ['Sweet32 attack', 'No forward secrecy', 'Slow performance'],
                    recommendation: 'Avoid - deprecated cipher'
                }],
            ['TLS_RSA_WITH_RC4_128_SHA', {
                    name: 'TLS_RSA_WITH_RC4_128_SHA',
                    strength: 'weak',
                    keyExchange: 'RSA',
                    authentication: 'RSA',
                    encryption: 'RC4',
                    mac: 'SHA-1',
                    vulnerabilities: ['RC4 biases', 'No forward secrecy'],
                    recommendation: 'Avoid - RC4 is broken'
                }]
        ];
        suites.forEach(([name, analysis]) => {
            this.knownCipherSuites.set(name, analysis);
        });
    }
    /**
     * Analyze encrypted traffic metadata
     */
    analyzeTraffic(packets) {
        const sizes = packets.map(p => p.size);
        const times = packets.map(p => p.timestamp.getTime());
        // Calculate inter-arrival times
        const interArrivalTimes = [];
        for (let i = 1; i < times.length; i++) {
            interArrivalTimes.push(times[i] - times[i - 1]);
        }
        // Calculate entropy of packet sizes
        const entropy = this.calculateEntropy(sizes);
        // Calculate pattern score
        const patternScore = this.calculatePatternScore(sizes, interArrivalTimes);
        const metadata = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            protocol: 'TLS',
            characteristics: {
                packetSizes: sizes,
                interArrivalTimes,
                entropy,
                patternScore
            },
            classification: this.classifyTraffic(sizes, interArrivalTimes),
            isSimulated: true
        };
        return metadata;
    }
    /**
     * Analyze cipher suite security
     */
    analyzeCipherSuite(suiteName) {
        const known = this.knownCipherSuites.get(suiteName);
        if (known)
            return known;
        // Parse unknown cipher suite
        return this.parseUnknownCipherSuite(suiteName);
    }
    /**
     * Analyze certificate
     */
    analyzeCertificate(certData) {
        const issues = [];
        const recommendations = [];
        // Check expiration
        const now = new Date();
        if (certData.validTo < now) {
            issues.push('Certificate has expired');
        }
        else if (certData.validTo.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000) {
            issues.push('Certificate expires within 30 days');
        }
        // Check key size
        if (certData.publicKeySize < 2048) {
            issues.push(`Weak key size: ${certData.publicKeySize} bits`);
            recommendations.push('Use at least 2048-bit RSA or 256-bit ECC');
        }
        // Check signature algorithm
        if (certData.signatureAlgorithm.includes('SHA1') ||
            certData.signatureAlgorithm.includes('MD5')) {
            issues.push(`Weak signature algorithm: ${certData.signatureAlgorithm}`);
            recommendations.push('Use SHA-256 or stronger');
        }
        // Check self-signed
        if (certData.subject === certData.issuer) {
            issues.push('Self-signed certificate');
            recommendations.push('Use certificates from trusted CA');
        }
        const riskLevel = issues.length > 2 ? 'high' :
            issues.length > 0 ? 'medium' : 'low';
        return { issues, recommendations, riskLevel };
    }
    /**
     * Generate simulated encrypted traffic for training
     */
    generateSimulatedTraffic(type) {
        const patterns = this.getTrafficPattern(type);
        const packets = patterns.map((size, i) => ({
            timestamp: new Date(Date.now() + i * patterns.avgInterval),
            size: size + Math.floor((Math.random() - 0.5) * patterns.sizeVariance),
            direction: (i % 2 === 0 ? 'client' : 'server')
        }));
        const metadata = this.analyzeTraffic(packets);
        metadata.protocol = 'TLS';
        metadata.version = '1.3';
        metadata.handshake = this.generateSimulatedHandshake();
        return metadata;
    }
    getTrafficPattern(type) {
        const patterns = {
            web: {
                sizes: [500, 1400, 1400, 1400, 200, 100, 1400, 500],
                avgInterval: 50,
                sizeVariance: 200
            },
            voip: {
                sizes: Array(50).fill(160),
                avgInterval: 20,
                sizeVariance: 20
            },
            streaming: {
                sizes: Array(100).fill(1400),
                avgInterval: 10,
                sizeVariance: 100
            },
            file_transfer: {
                sizes: [200, ...Array(50).fill(1400), 100],
                avgInterval: 5,
                sizeVariance: 50
            }
        };
        return patterns[type] || patterns.web;
    }
    generateSimulatedHandshake() {
        return {
            clientHello: {
                supportedVersions: ['TLS 1.3', 'TLS 1.2'],
                cipherSuites: [
                    'TLS_AES_256_GCM_SHA384',
                    'TLS_AES_128_GCM_SHA256',
                    'TLS_CHACHA20_POLY1305_SHA256'
                ],
                extensions: ['server_name', 'supported_versions', 'signature_algorithms'],
                sni: 'training.example.com'
            },
            serverHello: {
                selectedVersion: 'TLS 1.3',
                selectedCipher: 'TLS_AES_256_GCM_SHA384',
                certificate: {
                    subject: 'CN=training.example.com',
                    issuer: 'CN=Training CA',
                    validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    validTo: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
                    serialNumber: (0, uuid_1.v4)().replace(/-/g, ''),
                    signatureAlgorithm: 'SHA256withRSA',
                    publicKeyAlgorithm: 'RSA',
                    publicKeySize: 2048,
                    fingerprint: (0, uuid_1.v4)(),
                    isExpired: false,
                    isSelfSigned: false
                }
            }
        };
    }
    calculateEntropy(values) {
        if (values.length === 0)
            return 0;
        const counts = new Map();
        values.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
        let entropy = 0;
        const total = values.length;
        for (const count of counts.values()) {
            const p = count / total;
            if (p > 0) {
                entropy -= p * Math.log2(p);
            }
        }
        return entropy;
    }
    calculatePatternScore(sizes, intervals) {
        // Higher score = more predictable pattern
        if (sizes.length < 2)
            return 0;
        // Check size variance
        const sizeStd = this.standardDeviation(sizes);
        const sizeMean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
        const sizeCV = sizeMean > 0 ? sizeStd / sizeMean : 0;
        // Check interval variance
        let intervalCV = 0;
        if (intervals.length > 0) {
            const intervalStd = this.standardDeviation(intervals);
            const intervalMean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            intervalCV = intervalMean > 0 ? intervalStd / intervalMean : 0;
        }
        // Low CV = high pattern score
        return 1 - Math.min(1, (sizeCV + intervalCV) / 2);
    }
    standardDeviation(values) {
        if (values.length === 0)
            return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
    }
    classifyTraffic(sizes, intervals) {
        const indicators = [];
        let category = 'unknown';
        let application;
        let confidence = 0.5;
        const avgSize = sizes.length > 0
            ? sizes.reduce((a, b) => a + b, 0) / sizes.length
            : 0;
        const avgInterval = intervals.length > 0
            ? intervals.reduce((a, b) => a + b, 0) / intervals.length
            : 0;
        const sizeVariance = this.standardDeviation(sizes);
        // VoIP detection
        if (avgSize < 200 && sizeVariance < 50 && avgInterval < 30) {
            category = 'voip';
            application = 'Voice/Video Call';
            confidence = 0.8;
            indicators.push('Small fixed-size packets', 'Regular intervals');
        }
        // Streaming detection
        else if (avgSize > 1000 && avgInterval < 20) {
            category = 'streaming';
            application = 'Media Streaming';
            confidence = 0.75;
            indicators.push('Large packets', 'High throughput');
        }
        // File transfer detection
        else if (avgSize > 1300 && sizeVariance < 200) {
            category = 'file_transfer';
            application = 'File Transfer';
            confidence = 0.7;
            indicators.push('Maximum size packets', 'Consistent sizing');
        }
        // Web browsing detection
        else if (sizeVariance > 300) {
            category = 'web';
            application = 'Web Browsing';
            confidence = 0.6;
            indicators.push('Variable packet sizes', 'Burst patterns');
        }
        return { category, application, confidence, indicators };
    }
    parseUnknownCipherSuite(name) {
        // Basic parsing for unknown suites
        const parts = name.split('_');
        return {
            name,
            strength: 'unknown',
            keyExchange: parts.find(p => ['RSA', 'ECDHE', 'DHE'].includes(p)) || 'Unknown',
            authentication: 'Unknown',
            encryption: parts.find(p => p.includes('AES') || p.includes('CHACHA')) || 'Unknown',
            mac: parts.find(p => p.includes('SHA')) || 'Unknown',
            vulnerabilities: ['Unknown cipher suite - manual review required'],
            recommendation: 'Verify cipher suite security manually'
        };
    }
    getCipherSuites() {
        return Array.from(this.knownCipherSuites.values());
    }
}
exports.CryptoAnalyzer = CryptoAnalyzer;
