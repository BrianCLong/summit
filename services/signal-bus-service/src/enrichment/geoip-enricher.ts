/**
 * GeoIP Enricher
 *
 * Enriches signals with geographic information based on IP addresses.
 * Uses an in-memory LRU cache to minimize database lookups.
 *
 * @module geoip-enricher
 */

import { LRUCache } from 'lru-cache';
import type { Logger } from 'pino';

import type { GeoIpEnrichment } from '../types.js';

/**
 * GeoIP enricher configuration
 */
export interface GeoIpEnricherConfig {
  /** Path to GeoIP database (MaxMind format) */
  databasePath?: string;
  /** Cache size (number of entries) */
  cacheSize: number;
  /** Cache TTL in milliseconds */
  cacheTtlMs: number;
  /** Enable threat scoring */
  enableThreatScoring: boolean;
  /** VPN/Proxy detection */
  enableVpnDetection: boolean;
}

/**
 * Default configuration
 */
const defaultConfig: GeoIpEnricherConfig = {
  cacheSize: 10000,
  cacheTtlMs: 3600000, // 1 hour
  enableThreatScoring: true,
  enableVpnDetection: true,
};

/**
 * Mock GeoIP data for development/testing
 * In production, this would use MaxMind or similar
 */
const mockGeoIpData: Map<string, GeoIpEnrichment> = new Map([
  [
    '8.8.8.8',
    {
      country: 'United States',
      countryCode: 'US',
      region: 'California',
      city: 'Mountain View',
      postalCode: '94043',
      latitude: 37.4056,
      longitude: -122.0775,
      timezone: 'America/Los_Angeles',
      isp: 'Google LLC',
      org: 'Google LLC',
      asn: 'AS15169',
      isVpn: false,
      isProxy: false,
      isTor: false,
      threatScore: 0,
    },
  ],
  [
    '1.1.1.1',
    {
      country: 'Australia',
      countryCode: 'AU',
      region: 'New South Wales',
      city: 'Sydney',
      postalCode: '2000',
      latitude: -33.8688,
      longitude: 151.2093,
      timezone: 'Australia/Sydney',
      isp: 'Cloudflare Inc',
      org: 'Cloudflare Inc',
      asn: 'AS13335',
      isVpn: false,
      isProxy: false,
      isTor: false,
      threatScore: 0,
    },
  ],
]);

/**
 * Known VPN/Proxy ASNs (simplified for example)
 */
const knownVpnAsns = new Set(['AS20473', 'AS9009', 'AS14618']);

/**
 * Known Tor exit node IPs (simplified for example)
 */
const knownTorExitNodes = new Set(['185.220.100.240', '185.220.100.241']);

/**
 * GeoIP Enricher class
 */
export class GeoIpEnricherService {
  private config: GeoIpEnricherConfig;
  private logger: Logger;
  private cache: LRUCache<string, GeoIpEnrichment>;
  private stats = {
    lookups: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
  };

  constructor(logger: Logger, config?: Partial<GeoIpEnricherConfig>) {
    this.logger = logger.child({ component: 'geoip-enricher' });
    this.config = { ...defaultConfig, ...config };

    this.cache = new LRUCache<string, GeoIpEnrichment>({
      max: this.config.cacheSize,
      ttl: this.config.cacheTtlMs,
    });

    this.logger.info(
      { cacheSize: this.config.cacheSize, ttl: this.config.cacheTtlMs },
      'GeoIP enricher initialized',
    );
  }

  /**
   * Enrich with GeoIP data for an IP address
   */
  async enrich(ipAddress: string): Promise<GeoIpEnrichment | null> {
    this.stats.lookups++;

    // Validate IP address
    if (!this.isValidIp(ipAddress)) {
      this.logger.debug({ ip: ipAddress }, 'Invalid IP address');
      return null;
    }

    // Skip private/reserved IPs
    if (this.isPrivateIp(ipAddress)) {
      return this.getPrivateIpResult(ipAddress);
    }

    // Check cache
    const cached = this.cache.get(ipAddress);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }
    this.stats.cacheMisses++;

    try {
      // Lookup GeoIP data
      const result = await this.lookupGeoIp(ipAddress);

      if (result) {
        // Enhance with threat scoring if enabled
        if (this.config.enableThreatScoring) {
          result.threatScore = this.calculateThreatScore(result);
        }

        // Cache the result
        this.cache.set(ipAddress, result);
      }

      return result;
    } catch (error) {
      this.stats.errors++;
      this.logger.error({ error, ip: ipAddress }, 'GeoIP lookup failed');
      return null;
    }
  }

  /**
   * Batch enrich multiple IP addresses
   */
  async enrichBatch(ipAddresses: string[]): Promise<Map<string, GeoIpEnrichment | null>> {
    const results = new Map<string, GeoIpEnrichment | null>();

    // Process in parallel with limited concurrency
    const batchSize = 10;
    for (let i = 0; i < ipAddresses.length; i += batchSize) {
      const batch = ipAddresses.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (ip) => ({
          ip,
          result: await this.enrich(ip),
        })),
      );

      for (const { ip, result } of batchResults) {
        results.set(ip, result);
      }
    }

    return results;
  }

  /**
   * Lookup GeoIP data (mock implementation)
   * In production, this would use MaxMind GeoIP2 or similar
   */
  private async lookupGeoIp(ipAddress: string): Promise<GeoIpEnrichment | null> {
    // Check mock data first
    const mockResult = mockGeoIpData.get(ipAddress);
    if (mockResult) {
      return { ...mockResult };
    }

    // Generate synthetic data based on IP octets for demonstration
    // In production, this would be actual GeoIP database lookup
    const octets = ipAddress.split('.').map(Number);
    const [first, second] = octets;

    // Simple region mapping based on first octet
    let country = 'Unknown';
    let countryCode = 'XX';
    let timezone = 'UTC';

    if (first >= 1 && first <= 126) {
      country = 'United States';
      countryCode = 'US';
      timezone = 'America/New_York';
    } else if (first >= 128 && first <= 191) {
      if (second < 128) {
        country = 'Germany';
        countryCode = 'DE';
        timezone = 'Europe/Berlin';
      } else {
        country = 'United Kingdom';
        countryCode = 'GB';
        timezone = 'Europe/London';
      }
    } else if (first >= 192 && first <= 223) {
      country = 'Japan';
      countryCode = 'JP';
      timezone = 'Asia/Tokyo';
    }

    // Generate mock ASN
    const asn = `AS${10000 + (first * 256 + second) % 90000}`;

    const result: GeoIpEnrichment = {
      country,
      countryCode,
      region: 'Unknown',
      city: 'Unknown',
      timezone,
      asn,
      isVpn: this.config.enableVpnDetection && knownVpnAsns.has(asn),
      isProxy: false,
      isTor: knownTorExitNodes.has(ipAddress),
    };

    return result;
  }

  /**
   * Calculate threat score based on enrichment data
   */
  private calculateThreatScore(enrichment: GeoIpEnrichment): number {
    let score = 0;

    // VPN adds risk
    if (enrichment.isVpn) {
      score += 20;
    }

    // Proxy adds risk
    if (enrichment.isProxy) {
      score += 30;
    }

    // Tor adds significant risk
    if (enrichment.isTor) {
      score += 50;
    }

    // Cap at 100
    return Math.min(score, 100);
  }

  /**
   * Validate IP address format
   */
  private isValidIp(ip: string): boolean {
    // IPv4 validation
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
      const octets = ip.split('.').map(Number);
      return octets.every((octet) => octet >= 0 && octet <= 255);
    }

    // IPv6 validation (simplified)
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    return ipv6Regex.test(ip);
  }

  /**
   * Check if IP is private/reserved
   */
  private isPrivateIp(ip: string): boolean {
    const octets = ip.split('.').map(Number);
    if (octets.length !== 4) {
      return false;
    }

    const [first, second] = octets;

    // 10.0.0.0/8
    if (first === 10) {
      return true;
    }

    // 172.16.0.0/12
    if (first === 172 && second >= 16 && second <= 31) {
      return true;
    }

    // 192.168.0.0/16
    if (first === 192 && second === 168) {
      return true;
    }

    // 127.0.0.0/8 (loopback)
    if (first === 127) {
      return true;
    }

    // 169.254.0.0/16 (link-local)
    if (first === 169 && second === 254) {
      return true;
    }

    return false;
  }

  /**
   * Get result for private IP addresses
   */
  private getPrivateIpResult(ip: string): GeoIpEnrichment {
    return {
      country: 'Private Network',
      countryCode: 'XX',
      isVpn: false,
      isProxy: false,
      isTor: false,
      threatScore: 0,
    };
  }

  /**
   * Get enricher statistics
   */
  getStats(): {
    lookups: number;
    cacheHits: number;
    cacheMisses: number;
    cacheHitRate: number;
    errors: number;
    cacheSize: number;
  } {
    return {
      ...this.stats,
      cacheHitRate:
        this.stats.lookups > 0
          ? this.stats.cacheHits / this.stats.lookups
          : 0,
      cacheSize: this.cache.size,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      lookups: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
    };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('GeoIP cache cleared');
  }

  /**
   * Warm up cache with known IPs
   */
  async warmCache(ipAddresses: string[]): Promise<void> {
    this.logger.info({ count: ipAddresses.length }, 'Warming GeoIP cache');
    await this.enrichBatch(ipAddresses);
    this.logger.info({ cacheSize: this.cache.size }, 'GeoIP cache warmed');
  }
}

/**
 * Create a GeoIP enricher instance
 */
export function createGeoIpEnricher(
  logger: Logger,
  config?: Partial<GeoIpEnricherConfig>,
): GeoIpEnricherService {
  return new GeoIpEnricherService(logger, config);
}
