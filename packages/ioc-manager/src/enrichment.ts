import axios, { AxiosInstance } from 'axios';
import { IOC, IOCType } from './types.js';

/**
 * IOC Enrichment Service
 * Enriches IOCs with data from various threat intelligence providers
 */
export class IOCEnrichmentService {
  private httpClient: AxiosInstance;
  private apiKeys: Map<string, string> = new Map();

  constructor() {
    this.httpClient = axios.create({
      timeout: 30000,
    });
  }

  /**
   * Set API key for a provider
   */
  setApiKey(provider: string, apiKey: string): void {
    this.apiKeys.set(provider, apiKey);
  }

  /**
   * Enrich an IOC with data from multiple providers
   */
  async enrichIOC(ioc: IOC, providers: string[]): Promise<IOC> {
    const enrichments: any = {};

    for (const provider of providers) {
      try {
        const data = await this.enrichWithProvider(ioc, provider);
        enrichments[provider] = data;
      } catch (error) {
        console.error(`Error enriching with ${provider}:`, error);
      }
    }

    // Merge enrichments
    const enrichment = {
      ...ioc.enrichment,
      ...this.mergeEnrichments(enrichments, ioc.type),
    };

    return {
      ...ioc,
      enrichment,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Enrich with a specific provider
   */
  private async enrichWithProvider(ioc: IOC, provider: string): Promise<any> {
    switch (provider.toUpperCase()) {
      case 'VIRUSTOTAL':
        return this.enrichWithVirusTotal(ioc);
      case 'ALIENVAULT_OTX':
        return this.enrichWithAlienVaultOTX(ioc);
      case 'ABUSEIPDB':
        return this.enrichWithAbuseIPDB(ioc);
      case 'SHODAN':
        return this.enrichWithShodan(ioc);
      case 'WHOIS':
        return this.enrichWithWhois(ioc);
      case 'GEOIP':
        return this.enrichWithGeoIP(ioc);
      default:
        console.warn(`Unknown provider: ${provider}`);
        return {};
    }
  }

  /**
   * Enrich with VirusTotal
   */
  private async enrichWithVirusTotal(ioc: IOC): Promise<any> {
    const apiKey = this.apiKeys.get('VIRUSTOTAL');
    if (!apiKey) {
      throw new Error('VirusTotal API key not configured');
    }

    let endpoint = '';
    let identifier = ioc.value;

    switch (ioc.type) {
      case 'FILE_HASH_MD5':
      case 'FILE_HASH_SHA1':
      case 'FILE_HASH_SHA256':
        endpoint = `https://www.virustotal.com/api/v3/files/${identifier}`;
        break;
      case 'DOMAIN':
        endpoint = `https://www.virustotal.com/api/v3/domains/${identifier}`;
        break;
      case 'IP_ADDRESS':
        endpoint = `https://www.virustotal.com/api/v3/ip_addresses/${identifier}`;
        break;
      case 'URL':
        const urlId = Buffer.from(identifier).toString('base64url');
        endpoint = `https://www.virustotal.com/api/v3/urls/${urlId}`;
        break;
      default:
        throw new Error(`VirusTotal does not support IOC type: ${ioc.type}`);
    }

    const response = await this.httpClient.get(endpoint, {
      headers: {
        'x-apikey': apiKey,
      },
    });

    return {
      lastAnalysisStats: response.data.data.attributes?.last_analysis_stats,
      reputation: response.data.data.attributes?.reputation,
      malicious: response.data.data.attributes?.last_analysis_stats?.malicious || 0,
      suspicious: response.data.data.attributes?.last_analysis_stats?.suspicious || 0,
      harmless: response.data.data.attributes?.last_analysis_stats?.harmless || 0,
    };
  }

  /**
   * Enrich with AlienVault OTX
   */
  private async enrichWithAlienVaultOTX(ioc: IOC): Promise<any> {
    const apiKey = this.apiKeys.get('ALIENVAULT_OTX');
    if (!apiKey) {
      throw new Error('AlienVault OTX API key not configured');
    }

    let endpoint = '';
    const baseUrl = 'https://otx.alienvault.com/api/v1/indicators';

    switch (ioc.type) {
      case 'IP_ADDRESS':
        endpoint = `${baseUrl}/IPv4/${ioc.value}/general`;
        break;
      case 'DOMAIN':
        endpoint = `${baseUrl}/domain/${ioc.value}/general`;
        break;
      case 'FILE_HASH_MD5':
      case 'FILE_HASH_SHA1':
      case 'FILE_HASH_SHA256':
        endpoint = `${baseUrl}/file/${ioc.value}/general`;
        break;
      case 'URL':
        endpoint = `${baseUrl}/url/${encodeURIComponent(ioc.value)}/general`;
        break;
      default:
        throw new Error(`AlienVault OTX does not support IOC type: ${ioc.type}`);
    }

    const response = await this.httpClient.get(endpoint, {
      headers: {
        'X-OTX-API-KEY': apiKey,
      },
    });

    return {
      pulseCount: response.data.pulse_info?.count || 0,
      reputation: response.data.reputation || 0,
      threatScore: response.data.base_indicator?.indicator || 0,
    };
  }

  /**
   * Enrich with AbuseIPDB
   */
  private async enrichWithAbuseIPDB(ioc: IOC): Promise<any> {
    if (ioc.type !== 'IP_ADDRESS') {
      throw new Error('AbuseIPDB only supports IP addresses');
    }

    const apiKey = this.apiKeys.get('ABUSEIPDB');
    if (!apiKey) {
      throw new Error('AbuseIPDB API key not configured');
    }

    const response = await this.httpClient.get('https://api.abuseipdb.com/api/v2/check', {
      params: {
        ipAddress: ioc.value,
        maxAgeInDays: 90,
      },
      headers: {
        'Key': apiKey,
        'Accept': 'application/json',
      },
    });

    return {
      abuseConfidenceScore: response.data.data.abuseConfidenceScore,
      usageType: response.data.data.usageType,
      isp: response.data.data.isp,
      domain: response.data.data.domain,
      totalReports: response.data.data.totalReports,
      numDistinctUsers: response.data.data.numDistinctUsers,
      lastReportedAt: response.data.data.lastReportedAt,
    };
  }

  /**
   * Enrich with Shodan
   */
  private async enrichWithShodan(ioc: IOC): Promise<any> {
    if (ioc.type !== 'IP_ADDRESS') {
      throw new Error('Shodan only supports IP addresses');
    }

    const apiKey = this.apiKeys.get('SHODAN');
    if (!apiKey) {
      throw new Error('Shodan API key not configured');
    }

    const response = await this.httpClient.get(`https://api.shodan.io/shodan/host/${ioc.value}`, {
      params: {
        key: apiKey,
      },
    });

    return {
      ports: response.data.ports,
      services: response.data.data?.map((service: any) => ({
        port: service.port,
        product: service.product,
        version: service.version,
      })),
      os: response.data.os,
      organization: response.data.org,
      asn: response.data.asn,
      vulnerabilities: response.data.vulns,
      tags: response.data.tags,
    };
  }

  /**
   * Enrich with WHOIS
   */
  private async enrichWithWhois(ioc: IOC): Promise<any> {
    if (ioc.type !== 'DOMAIN' && ioc.type !== 'IP_ADDRESS') {
      throw new Error('WHOIS only supports domains and IP addresses');
    }

    // Simple WHOIS implementation using a public API
    const response = await this.httpClient.get(`https://www.whoisxmlapi.com/whoisserver/WhoisService`, {
      params: {
        domainName: ioc.value,
        outputFormat: 'JSON',
      },
    });

    return {
      registrar: response.data.WhoisRecord?.registrarName,
      createdDate: response.data.WhoisRecord?.createdDate,
      updatedDate: response.data.WhoisRecord?.updatedDate,
      expiresDate: response.data.WhoisRecord?.expiresDate,
      registrant: response.data.WhoisRecord?.registrant,
      nameServers: response.data.WhoisRecord?.nameServers?.hostNames,
    };
  }

  /**
   * Enrich with GeoIP
   */
  private async enrichWithGeoIP(ioc: IOC): Promise<any> {
    if (ioc.type !== 'IP_ADDRESS') {
      throw new Error('GeoIP only supports IP addresses');
    }

    // Using ipapi.co for GeoIP lookup
    const response = await this.httpClient.get(`https://ipapi.co/${ioc.value}/json/`);

    return {
      country: response.data.country_name,
      countryCode: response.data.country_code,
      city: response.data.city,
      region: response.data.region,
      latitude: response.data.latitude,
      longitude: response.data.longitude,
      timezone: response.data.timezone,
      asn: response.data.asn,
      org: response.data.org,
    };
  }

  /**
   * Merge enrichment data from multiple providers
   */
  private mergeEnrichments(enrichments: Record<string, any>, type: IOCType): any {
    const merged: any = {};

    // GeoIP data
    const geoipData = enrichments['GEOIP'] || enrichments['ABUSEIPDB'] || enrichments['SHODAN'];
    if (geoipData) {
      merged.geoip = {
        country: geoipData.country || geoipData.countryCode,
        city: geoipData.city,
        lat: geoipData.latitude,
        lon: geoipData.longitude,
        asn: geoipData.asn,
        org: geoipData.org || geoipData.organization || geoipData.isp,
      };
    }

    // WHOIS data
    if (enrichments['WHOIS']) {
      merged.whois = enrichments['WHOIS'];
    }

    // Reputation data
    const reputationProviders: any[] = [];

    if (enrichments['VIRUSTOTAL']) {
      const vt = enrichments['VIRUSTOTAL'];
      reputationProviders.push({
        name: 'VirusTotal',
        score: this.calculateVirusTotalScore(vt),
        verdict: vt.malicious > 0 ? 'malicious' : 'clean',
      });
    }

    if (enrichments['ALIENVAULT_OTX']) {
      const otx = enrichments['ALIENVAULT_OTX'];
      reputationProviders.push({
        name: 'AlienVault OTX',
        score: otx.threatScore || 0,
        verdict: otx.pulseCount > 0 ? 'suspicious' : 'unknown',
      });
    }

    if (enrichments['ABUSEIPDB']) {
      const abuseipdb = enrichments['ABUSEIPDB'];
      reputationProviders.push({
        name: 'AbuseIPDB',
        score: 100 - abuseipdb.abuseConfidenceScore,
        verdict: abuseipdb.abuseConfidenceScore > 50 ? 'malicious' : 'clean',
      });
    }

    if (reputationProviders.length > 0) {
      const avgScore = reputationProviders.reduce((sum, p) => sum + p.score, 0) / reputationProviders.length;
      merged.reputation = {
        score: Math.round(avgScore),
        providers: reputationProviders,
      };
    }

    return merged;
  }

  /**
   * Calculate VirusTotal reputation score
   */
  private calculateVirusTotalScore(vt: any): number {
    const total = (vt.malicious || 0) + (vt.suspicious || 0) + (vt.harmless || 0);
    if (total === 0) return 50; // Unknown

    const maliciousRatio = vt.malicious / total;
    return Math.round((1 - maliciousRatio) * 100);
  }
}
