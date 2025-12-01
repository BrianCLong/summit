/**
 * Crypto Analyzer - Cryptographic traffic analysis
 * TRAINING/SIMULATION ONLY
 *
 * This module analyzes metadata and patterns in encrypted traffic
 * for educational purposes. It does NOT decrypt content.
 */

import { v4 as uuid } from 'uuid';

export interface EncryptedTrafficMetadata {
  id: string;
  timestamp: Date;

  // Protocol identification
  protocol: 'TLS' | 'SSH' | 'IPSec' | 'WPA' | 'UNKNOWN';
  version?: string;

  // Handshake info (visible metadata)
  handshake?: {
    clientHello?: {
      supportedVersions: string[];
      cipherSuites: string[];
      extensions: string[];
      sni?: string; // Server Name Indication
    };
    serverHello?: {
      selectedVersion: string;
      selectedCipher: string;
      certificate?: CertificateInfo;
    };
  };

  // Traffic characteristics
  characteristics: {
    packetSizes: number[];
    interArrivalTimes: number[];
    entropy: number;
    patternScore: number;
  };

  // Analysis
  classification?: TrafficClassification;

  isSimulated: boolean;
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
  signatureAlgorithm: string;
  publicKeyAlgorithm: string;
  publicKeySize: number;
  fingerprint: string;
  isExpired: boolean;
  isSelfSigned: boolean;
}

export interface TrafficClassification {
  category: 'web' | 'email' | 'voip' | 'streaming' | 'file_transfer' | 'messaging' | 'unknown';
  application?: string;
  confidence: number;
  indicators: string[];
}

export interface CipherSuiteAnalysis {
  name: string;
  strength: 'weak' | 'moderate' | 'strong' | 'unknown';
  keyExchange: string;
  authentication: string;
  encryption: string;
  mac: string;
  vulnerabilities: string[];
  recommendation: string;
}

export class CryptoAnalyzer {
  private knownCipherSuites: Map<string, CipherSuiteAnalysis> = new Map();

  constructor() {
    this.initializeCipherSuites();
  }

  private initializeCipherSuites(): void {
    // Educational cipher suite database
    const suites: Array<[string, CipherSuiteAnalysis]> = [
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
  analyzeTraffic(packets: Array<{
    timestamp: Date;
    size: number;
    direction: 'client' | 'server';
  }>): EncryptedTrafficMetadata {
    const sizes = packets.map(p => p.size);
    const times = packets.map(p => p.timestamp.getTime());

    // Calculate inter-arrival times
    const interArrivalTimes: number[] = [];
    for (let i = 1; i < times.length; i++) {
      interArrivalTimes.push(times[i] - times[i - 1]);
    }

    // Calculate entropy of packet sizes
    const entropy = this.calculateEntropy(sizes);

    // Calculate pattern score
    const patternScore = this.calculatePatternScore(sizes, interArrivalTimes);

    const metadata: EncryptedTrafficMetadata = {
      id: uuid(),
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
  analyzeCipherSuite(suiteName: string): CipherSuiteAnalysis {
    const known = this.knownCipherSuites.get(suiteName);
    if (known) return known;

    // Parse unknown cipher suite
    return this.parseUnknownCipherSuite(suiteName);
  }

  /**
   * Analyze certificate
   */
  analyzeCertificate(certData: {
    subject: string;
    issuer: string;
    validFrom: Date;
    validTo: Date;
    publicKeySize: number;
    signatureAlgorithm: string;
  }): {
    issues: string[];
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check expiration
    const now = new Date();
    if (certData.validTo < now) {
      issues.push('Certificate has expired');
    } else if (certData.validTo.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000) {
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
  generateSimulatedTraffic(
    type: 'web' | 'voip' | 'streaming' | 'file_transfer'
  ): EncryptedTrafficMetadata {
    const patterns = this.getTrafficPattern(type);

    const packets = patterns.map((size, i) => ({
      timestamp: new Date(Date.now() + i * patterns.avgInterval),
      size: size + Math.floor((Math.random() - 0.5) * patterns.sizeVariance),
      direction: (i % 2 === 0 ? 'client' : 'server') as const
    }));

    const metadata = this.analyzeTraffic(packets);
    metadata.protocol = 'TLS';
    metadata.version = '1.3';
    metadata.handshake = this.generateSimulatedHandshake();

    return metadata;
  }

  private getTrafficPattern(type: string): {
    sizes: number[];
    avgInterval: number;
    sizeVariance: number;
  } {
    const patterns: Record<string, { sizes: number[]; avgInterval: number; sizeVariance: number }> = {
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

  private generateSimulatedHandshake(): EncryptedTrafficMetadata['handshake'] {
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
          serialNumber: uuid().replace(/-/g, ''),
          signatureAlgorithm: 'SHA256withRSA',
          publicKeyAlgorithm: 'RSA',
          publicKeySize: 2048,
          fingerprint: uuid(),
          isExpired: false,
          isSelfSigned: false
        }
      }
    };
  }

  private calculateEntropy(values: number[]): number {
    if (values.length === 0) return 0;

    const counts = new Map<number, number>();
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

  private calculatePatternScore(sizes: number[], intervals: number[]): number {
    // Higher score = more predictable pattern
    if (sizes.length < 2) return 0;

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

  private standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  private classifyTraffic(
    sizes: number[],
    intervals: number[]
  ): TrafficClassification {
    const indicators: string[] = [];
    let category: TrafficClassification['category'] = 'unknown';
    let application: string | undefined;
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

  private parseUnknownCipherSuite(name: string): CipherSuiteAnalysis {
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

  getCipherSuites(): CipherSuiteAnalysis[] {
    return Array.from(this.knownCipherSuites.values());
  }
}
