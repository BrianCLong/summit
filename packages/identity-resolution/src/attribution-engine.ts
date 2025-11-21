/**
 * Attribution Analysis Engine
 *
 * Digital footprint correlation, device fingerprinting, IP attribution,
 * geo-location analysis, and cross-platform identity linking.
 */

import { z } from 'zod';
import { AttributionRecord } from './types.js';

// ============================================================================
// Types
// ============================================================================

export interface DeviceFingerprint {
  fingerprintId: string;
  components: {
    userAgent: string;
    platform: string;
    language: string;
    timezone: string;
    screenResolution: string;
    colorDepth: number;
    plugins: string[];
    canvas: string;
    webgl: string;
    audio: string;
    fonts: string[];
  };
  entropy: number;
  uniqueness: number;
  firstSeen: string;
  lastSeen: string;
  occurrences: number;
}

export interface IPAttribution {
  ipAddress: string;
  type: 'IPV4' | 'IPV6';
  geolocation: {
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  network: {
    asn: number;
    organization: string;
    isp: string;
    isProxy: boolean;
    isVpn: boolean;
    isTor: boolean;
    isHosting: boolean;
  };
  risk: {
    score: number;
    factors: string[];
  };
  firstSeen: string;
  lastSeen: string;
  frequency: number;
}

export interface TemporalCorrelation {
  correlationId: string;
  entity1: { type: string; id: string };
  entity2: { type: string; id: string };
  temporalOverlap: number;
  activityCorrelation: number;
  confidence: number;
  timeRange: { start: string; end: string };
}

export interface SockPuppetIndicator {
  accountId: string;
  platform: string;
  indicators: {
    accountAge: number;
    postingPattern: string;
    followingBehavior: string;
    contentSimilarity: number;
    temporalCorrelation: number;
    networkOverlap: number;
  };
  linkedAccounts: string[];
  confidence: number;
  verdict: 'AUTHENTIC' | 'SUSPECTED_PUPPET' | 'CONFIRMED_PUPPET';
}

export interface CoordinatedBehavior {
  clusterId: string;
  accounts: Array<{
    platform: string;
    accountId: string;
    username: string;
  }>;
  behaviorType: 'AMPLIFICATION' | 'MANIPULATION' | 'ASTROTURFING' | 'BRIGADING';
  indicators: {
    temporalSynchronization: number;
    contentSimilarity: number;
    targetOverlap: number;
    networkCentrality: number;
  };
  confidence: number;
  detectedAt: string;
}

// ============================================================================
// Device Fingerprinting
// ============================================================================

export class DeviceFingerprintAnalyzer {
  private fingerprintDb: Map<string, DeviceFingerprint[]> = new Map();

  /**
   * Generate device fingerprint ID from components
   */
  generateFingerprintId(components: DeviceFingerprint['components']): string {
    const fingerprint = JSON.stringify(components);
    // Simple hash function for demo
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  /**
   * Calculate fingerprint entropy (uniqueness potential)
   */
  calculateEntropy(components: DeviceFingerprint['components']): number {
    let entropy = 0;

    // User agent entropy
    entropy += Math.log2(1000); // ~1000 common user agents

    // Screen resolution entropy
    entropy += Math.log2(50); // ~50 common resolutions

    // Timezone entropy
    entropy += Math.log2(24); // 24 timezones

    // Plugin entropy
    entropy += components.plugins.length * Math.log2(10);

    // Font entropy
    entropy += components.fonts.length * Math.log2(5);

    // Canvas/WebGL add significant entropy
    if (components.canvas) entropy += 10;
    if (components.webgl) entropy += 8;
    if (components.audio) entropy += 6;

    return entropy;
  }

  /**
   * Match a fingerprint against known fingerprints
   */
  matchFingerprint(
    probe: DeviceFingerprint['components'],
    gallery: DeviceFingerprint[]
  ): Array<{ fingerprint: DeviceFingerprint; similarity: number }> {
    const matches: Array<{ fingerprint: DeviceFingerprint; similarity: number }> = [];

    for (const fp of gallery) {
      let matchScore = 0;
      let totalWeight = 0;

      // Compare components with weights
      const comparisons = [
        { match: probe.userAgent === fp.components.userAgent, weight: 0.15 },
        { match: probe.platform === fp.components.platform, weight: 0.1 },
        { match: probe.timezone === fp.components.timezone, weight: 0.1 },
        { match: probe.screenResolution === fp.components.screenResolution, weight: 0.1 },
        { match: probe.canvas === fp.components.canvas, weight: 0.2 },
        { match: probe.webgl === fp.components.webgl, weight: 0.15 },
        { match: probe.audio === fp.components.audio, weight: 0.1 },
        { match: this.arrayOverlap(probe.fonts, fp.components.fonts) > 0.8, weight: 0.1 }
      ];

      for (const comp of comparisons) {
        if (comp.match) matchScore += comp.weight;
        totalWeight += comp.weight;
      }

      const similarity = matchScore / totalWeight;
      if (similarity > 0.7) {
        matches.push({ fingerprint: fp, similarity });
      }
    }

    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  private arrayOverlap(arr1: string[], arr2: string[]): number {
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = [...set1].filter(x => set2.has(x));
    const union = new Set([...arr1, ...arr2]);
    return intersection.length / union.size;
  }

  /**
   * Store fingerprint for identity
   */
  storeFingerprint(identityId: string, fingerprint: DeviceFingerprint): void {
    const existing = this.fingerprintDb.get(identityId) || [];
    existing.push(fingerprint);
    this.fingerprintDb.set(identityId, existing);
  }

  /**
   * Get fingerprints for identity
   */
  getFingerprints(identityId: string): DeviceFingerprint[] {
    return this.fingerprintDb.get(identityId) || [];
  }
}

// ============================================================================
// IP Attribution
// ============================================================================

export class IPAttributionAnalyzer {
  /**
   * Analyze IP address for attribution
   */
  async analyzeIP(ipAddress: string): Promise<IPAttribution> {
    // Simulate IP analysis
    const isIPv6 = ipAddress.includes(':');

    return {
      ipAddress,
      type: isIPv6 ? 'IPV6' : 'IPV4',
      geolocation: {
        country: 'US',
        region: 'California',
        city: 'San Francisco',
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10 // km
      },
      network: {
        asn: 13335,
        organization: 'Example ISP',
        isp: 'Example Internet Services',
        isProxy: false,
        isVpn: Math.random() > 0.9,
        isTor: Math.random() > 0.95,
        isHosting: Math.random() > 0.85
      },
      risk: {
        score: Math.floor(Math.random() * 30),
        factors: []
      },
      firstSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastSeen: new Date().toISOString(),
      frequency: Math.floor(Math.random() * 100) + 1
    };
  }

  /**
   * Correlate IP addresses to find patterns
   */
  correlateIPs(ipHistory: IPAttribution[]): {
    primaryLocation: IPAttribution['geolocation'];
    patterns: string[];
    anomalies: Array<{ ip: string; reason: string }>;
  } {
    // Find most frequent location
    const locationCounts = new Map<string, number>();
    for (const ip of ipHistory) {
      const key = `${ip.geolocation.country}-${ip.geolocation.city}`;
      locationCounts.set(key, (locationCounts.get(key) || 0) + 1);
    }

    let maxCount = 0;
    let primaryLocationKey = '';
    for (const [key, count] of locationCounts) {
      if (count > maxCount) {
        maxCount = count;
        primaryLocationKey = key;
      }
    }

    const primaryIP = ipHistory.find(ip =>
      `${ip.geolocation.country}-${ip.geolocation.city}` === primaryLocationKey
    );

    // Detect anomalies
    const anomalies: Array<{ ip: string; reason: string }> = [];
    for (const ip of ipHistory) {
      if (ip.network.isTor) {
        anomalies.push({ ip: ip.ipAddress, reason: 'TOR exit node detected' });
      }
      if (ip.network.isVpn) {
        anomalies.push({ ip: ip.ipAddress, reason: 'VPN service detected' });
      }
      if (ip.network.isProxy) {
        anomalies.push({ ip: ip.ipAddress, reason: 'Proxy service detected' });
      }
    }

    return {
      primaryLocation: primaryIP?.geolocation || ipHistory[0].geolocation,
      patterns: ['Regular business hours activity', 'Single timezone usage'],
      anomalies
    };
  }
}

// ============================================================================
// Temporal Correlation
// ============================================================================

export class TemporalCorrelationAnalyzer {
  /**
   * Analyze temporal correlation between entities
   */
  analyzeCorrelation(
    entity1Activity: Array<{ timestamp: string; action: string }>,
    entity2Activity: Array<{ timestamp: string; action: string }>
  ): TemporalCorrelation {
    // Calculate temporal overlap
    const e1Times = entity1Activity.map(a => new Date(a.timestamp).getTime());
    const e2Times = entity2Activity.map(a => new Date(a.timestamp).getTime());

    // Simple overlap calculation
    let overlappingPeriods = 0;
    const windowMs = 60 * 60 * 1000; // 1 hour window

    for (const t1 of e1Times) {
      for (const t2 of e2Times) {
        if (Math.abs(t1 - t2) < windowMs) {
          overlappingPeriods++;
        }
      }
    }

    const temporalOverlap = overlappingPeriods / Math.max(e1Times.length, e2Times.length);

    // Calculate activity pattern correlation
    const e1Hours = e1Times.map(t => new Date(t).getHours());
    const e2Hours = e2Times.map(t => new Date(t).getHours());
    const activityCorrelation = this.calculateHourlyCorrelation(e1Hours, e2Hours);

    return {
      correlationId: crypto.randomUUID(),
      entity1: { type: 'ACCOUNT', id: 'entity1' },
      entity2: { type: 'ACCOUNT', id: 'entity2' },
      temporalOverlap,
      activityCorrelation,
      confidence: (temporalOverlap + activityCorrelation) / 2,
      timeRange: {
        start: new Date(Math.min(...e1Times, ...e2Times)).toISOString(),
        end: new Date(Math.max(...e1Times, ...e2Times)).toISOString()
      }
    };
  }

  private calculateHourlyCorrelation(hours1: number[], hours2: number[]): number {
    const dist1 = new Array(24).fill(0);
    const dist2 = new Array(24).fill(0);

    for (const h of hours1) dist1[h]++;
    for (const h of hours2) dist2[h]++;

    // Normalize
    const sum1 = dist1.reduce((a, b) => a + b, 0) || 1;
    const sum2 = dist2.reduce((a, b) => a + b, 0) || 1;
    const norm1 = dist1.map(v => v / sum1);
    const norm2 = dist2.map(v => v / sum2);

    // Cosine similarity
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    for (let i = 0; i < 24; i++) {
      dotProduct += norm1[i] * norm2[i];
      mag1 += norm1[i] * norm1[i];
      mag2 += norm2[i] * norm2[i];
    }

    return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2)) || 0;
  }
}

// ============================================================================
// Sock Puppet Detection
// ============================================================================

export class SockPuppetDetector {
  /**
   * Detect sock puppet accounts
   */
  detect(accounts: Array<{
    id: string;
    platform: string;
    createdAt: string;
    postCount: number;
    followers: number;
    following: number;
    posts: Array<{ timestamp: string; content: string }>;
  }>): SockPuppetIndicator[] {
    const indicators: SockPuppetIndicator[] = [];

    for (const account of accounts) {
      const accountAge = (Date.now() - new Date(account.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const postingFreq = account.postCount / Math.max(accountAge, 1);

      // Calculate indicators
      const indicator: SockPuppetIndicator = {
        accountId: account.id,
        platform: account.platform,
        indicators: {
          accountAge,
          postingPattern: postingFreq > 50 ? 'HIGH_FREQUENCY' : 'NORMAL',
          followingBehavior: account.following > account.followers * 10 ? 'AGGRESSIVE' : 'NORMAL',
          contentSimilarity: 0,
          temporalCorrelation: 0,
          networkOverlap: 0
        },
        linkedAccounts: [],
        confidence: 0,
        verdict: 'AUTHENTIC'
      };

      // Determine verdict based on indicators
      let suspicionScore = 0;
      if (accountAge < 30) suspicionScore += 0.2;
      if (postingFreq > 100) suspicionScore += 0.3;
      if (account.followers < 10 && account.postCount > 100) suspicionScore += 0.3;

      indicator.confidence = suspicionScore;
      if (suspicionScore > 0.7) {
        indicator.verdict = 'CONFIRMED_PUPPET';
      } else if (suspicionScore > 0.4) {
        indicator.verdict = 'SUSPECTED_PUPPET';
      }

      indicators.push(indicator);
    }

    return indicators;
  }
}

// ============================================================================
// Coordinated Behavior Detection
// ============================================================================

export class CoordinatedBehaviorDetector {
  /**
   * Detect coordinated inauthentic behavior
   */
  detect(accounts: Array<{
    platform: string;
    accountId: string;
    username: string;
    posts: Array<{ timestamp: string; content: string; target?: string }>;
  }>): CoordinatedBehavior[] {
    const clusters: CoordinatedBehavior[] = [];

    // Group by temporal synchronization
    const timeWindows = new Map<string, typeof accounts>();

    for (const account of accounts) {
      for (const post of account.posts) {
        const windowKey = Math.floor(new Date(post.timestamp).getTime() / (5 * 60 * 1000)).toString();
        const window = timeWindows.get(windowKey) || [];
        window.push(account);
        timeWindows.set(windowKey, window);
      }
    }

    // Find clusters with coordinated timing
    for (const [windowKey, windowAccounts] of timeWindows) {
      if (windowAccounts.length >= 3) {
        const uniqueAccounts = [...new Set(windowAccounts.map(a => a.accountId))];
        if (uniqueAccounts.length >= 3) {
          clusters.push({
            clusterId: crypto.randomUUID(),
            accounts: uniqueAccounts.slice(0, 10).map(id => {
              const acc = accounts.find(a => a.accountId === id)!;
              return {
                platform: acc.platform,
                accountId: acc.accountId,
                username: acc.username
              };
            }),
            behaviorType: 'AMPLIFICATION',
            indicators: {
              temporalSynchronization: 0.85,
              contentSimilarity: 0.7,
              targetOverlap: 0.6,
              networkCentrality: 0.5
            },
            confidence: 0.75,
            detectedAt: new Date().toISOString()
          });
        }
      }
    }

    return clusters;
  }
}

// ============================================================================
// Unified Attribution Engine
// ============================================================================

export class AttributionEngine {
  private deviceAnalyzer = new DeviceFingerprintAnalyzer();
  private ipAnalyzer = new IPAttributionAnalyzer();
  private temporalAnalyzer = new TemporalCorrelationAnalyzer();
  private puppetDetector = new SockPuppetDetector();
  private coordBehaviorDetector = new CoordinatedBehaviorDetector();

  /**
   * Build comprehensive attribution record for an identity
   */
  async buildAttributionRecord(
    identityId: string,
    data: {
      ipAddresses?: string[];
      deviceFingerprints?: DeviceFingerprint['components'][];
      activities?: Array<{ timestamp: string; action: string }>;
    }
  ): Promise<AttributionRecord> {
    // Analyze IP addresses
    const ipAnalysis: IPAttribution[] = [];
    if (data.ipAddresses) {
      for (const ip of data.ipAddresses) {
        ipAnalysis.push(await this.ipAnalyzer.analyzeIP(ip));
      }
    }

    // Analyze device fingerprints
    const deviceAnalysis: DeviceFingerprint[] = [];
    if (data.deviceFingerprints) {
      for (const components of data.deviceFingerprints) {
        const fpId = this.deviceAnalyzer.generateFingerprintId(components);
        const entropy = this.deviceAnalyzer.calculateEntropy(components);
        deviceAnalysis.push({
          fingerprintId: fpId,
          components,
          entropy,
          uniqueness: Math.min(1, entropy / 40),
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          occurrences: 1
        });
      }
    }

    // Build temporal patterns
    let temporalPatterns: AttributionRecord['temporalPatterns'];
    if (data.activities) {
      const hours = data.activities.map(a => new Date(a.timestamp).getHours());
      const hourCounts: Record<number, number> = {};
      for (const h of hours) {
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      }

      const activeHours = Object.entries(hourCounts)
        .map(([hour, freq]) => ({ hour: parseInt(hour), frequency: freq }))
        .sort((a, b) => b.frequency - a.frequency);

      temporalPatterns = {
        activeHours,
        activityPattern: hourCounts
      };
    }

    // Build geolocation from IPs
    const geolocation = ipAnalysis.length > 0 ? {
      primaryLocations: ipAnalysis.map(ip => ({
        latitude: ip.geolocation.latitude,
        longitude: ip.geolocation.longitude,
        frequency: ip.frequency
      }))
    } : undefined;

    return {
      attributionId: crypto.randomUUID(),
      identityId,
      digitalFootprint: {
        ipAddresses: ipAnalysis.map(ip => ({
          ip: ip.ipAddress,
          firstSeen: ip.firstSeen,
          lastSeen: ip.lastSeen,
          frequency: ip.frequency,
          locations: [ip.geolocation.city]
        })),
        deviceFingerprints: deviceAnalysis.map(fp => ({
          fingerprintId: fp.fingerprintId,
          deviceType: fp.components.platform,
          firstSeen: fp.firstSeen,
          lastSeen: fp.lastSeen
        }))
      },
      temporalPatterns,
      geolocation,
      confidence: 0.8,
      metadata: {
        sources: ['ip_analysis', 'device_fingerprint', 'activity_analysis'],
        analysisDate: new Date().toISOString()
      }
    };
  }

  /**
   * Calculate attribution confidence score
   */
  calculateAttributionConfidence(record: AttributionRecord): {
    score: number;
    factors: Record<string, number>;
  } {
    const factors: Record<string, number> = {};

    // IP consistency
    const ipCount = record.digitalFootprint.ipAddresses?.length || 0;
    factors.ipConsistency = ipCount > 0 ? Math.min(1, 3 / ipCount) : 0;

    // Device consistency
    const deviceCount = record.digitalFootprint.deviceFingerprints?.length || 0;
    factors.deviceConsistency = deviceCount > 0 ? Math.min(1, 2 / deviceCount) : 0;

    // Temporal consistency
    factors.temporalConsistency = record.temporalPatterns ? 0.8 : 0.5;

    // Geolocation consistency
    const locCount = record.geolocation?.primaryLocations?.length || 0;
    factors.geoConsistency = locCount > 0 ? Math.min(1, 3 / locCount) : 0;

    // Calculate overall score
    const weights = {
      ipConsistency: 0.3,
      deviceConsistency: 0.3,
      temporalConsistency: 0.2,
      geoConsistency: 0.2
    };

    let score = 0;
    for (const [factor, weight] of Object.entries(weights)) {
      score += (factors[factor] || 0) * weight;
    }

    return { score, factors };
  }
}

export default AttributionEngine;
