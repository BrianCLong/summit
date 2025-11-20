/**
 * IoC Enrichment Service
 * Enriches IoCs with additional context from various sources
 */

import axios from 'axios';
import {
  IOC,
  IOCEnrichment,
  Geolocation,
  ReputationData,
  DNSRecord,
  WhoisData,
  SandboxResult,
  ThreatIntelligence,
} from '../types/ioc.js';

export interface EnrichmentConfig {
  virustotal?: {
    apiKey: string;
    enabled: boolean;
  };
  shodan?: {
    apiKey: string;
    enabled: boolean;
  };
  maxmind?: {
    licenseKey: string;
    enabled: boolean;
  };
  abuseipdb?: {
    apiKey: string;
    enabled: boolean;
  };
  urlscan?: {
    apiKey: string;
    enabled: boolean;
  };
  hybridAnalysis?: {
    apiKey: string;
    enabled: boolean;
  };
}

export class EnrichmentService {
  private config: EnrichmentConfig;

  constructor(config: EnrichmentConfig) {
    this.config = config;
  }

  /**
   * Enrich an IoC with all available sources
   */
  async enrichIoC(ioc: IOC): Promise<IOCEnrichment> {
    const enrichment: IOCEnrichment = {
      ...ioc.enrichment,
      lastEnriched: new Date().toISOString(),
    };

    try {
      switch (ioc.type) {
        case 'ip':
        case 'ipv4':
        case 'ipv6':
          await this.enrichIP(ioc.value, enrichment);
          break;

        case 'domain':
          await this.enrichDomain(ioc.value, enrichment);
          break;

        case 'url':
          await this.enrichURL(ioc.value, enrichment);
          break;

        case 'md5':
        case 'sha1':
        case 'sha256':
        case 'sha512':
        case 'file_hash':
          await this.enrichFileHash(ioc.value, enrichment);
          break;
      }
    } catch (error) {
      console.error('[ENRICHMENT] Error enriching IoC:', error);
    }

    return enrichment;
  }

  /**
   * Enrich IP address
   */
  private async enrichIP(ip: string, enrichment: IOCEnrichment): Promise<void> {
    const tasks: Promise<void>[] = [];

    // Geolocation
    tasks.push(this.getGeolocation(ip).then(geo => {
      if (geo) enrichment.geolocation = geo;
    }));

    // Reputation
    tasks.push(this.getIPReputation(ip).then(rep => {
      if (rep) enrichment.reputation = rep;
    }));

    // Threat intelligence
    tasks.push(this.getIPThreatIntel(ip).then(ti => {
      if (ti.length > 0) enrichment.threatIntel = ti;
    }));

    await Promise.allSettled(tasks);
  }

  /**
   * Enrich domain
   */
  private async enrichDomain(domain: string, enrichment: IOCEnrichment): Promise<void> {
    const tasks: Promise<void>[] = [];

    // DNS records
    tasks.push(this.getDNSRecords(domain).then(dns => {
      if (dns.length > 0) enrichment.dns = dns;
    }));

    // WHOIS data
    tasks.push(this.getWhoisData(domain).then(whois => {
      if (whois) enrichment.whois = whois;
    }));

    // Reputation
    tasks.push(this.getDomainReputation(domain).then(rep => {
      if (rep) enrichment.reputation = rep;
    }));

    // Threat intelligence
    tasks.push(this.getDomainThreatIntel(domain).then(ti => {
      if (ti.length > 0) enrichment.threatIntel = ti;
    }));

    await Promise.allSettled(tasks);
  }

  /**
   * Enrich URL
   */
  private async enrichURL(url: string, enrichment: IOCEnrichment): Promise<void> {
    const tasks: Promise<void>[] = [];

    // URL reputation
    tasks.push(this.getURLReputation(url).then(rep => {
      if (rep) enrichment.reputation = rep;
    }));

    // URL scan
    tasks.push(this.getURLScan(url).then(scan => {
      if (scan) enrichment.sandbox = [scan];
    }));

    await Promise.allSettled(tasks);
  }

  /**
   * Enrich file hash
   */
  private async enrichFileHash(hash: string, enrichment: IOCEnrichment): Promise<void> {
    const tasks: Promise<void>[] = [];

    // VirusTotal analysis
    if (this.config.virustotal?.enabled) {
      tasks.push(this.getVirusTotalReport(hash).then(report => {
        if (report) {
          enrichment.reputation = report.reputation;
          enrichment.threatIntel = report.threatIntel;
          enrichment.malwareAnalysis = report.malwareAnalysis;
        }
      }));
    }

    // Hybrid Analysis
    if (this.config.hybridAnalysis?.enabled) {
      tasks.push(this.getHybridAnalysisReport(hash).then(report => {
        if (report) {
          if (!enrichment.sandbox) enrichment.sandbox = [];
          enrichment.sandbox.push(report);
        }
      }));
    }

    await Promise.allSettled(tasks);
  }

  /**
   * Get geolocation for IP
   */
  private async getGeolocation(ip: string): Promise<Geolocation | null> {
    try {
      // Using free IP geolocation service
      const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
        timeout: 5000,
      });

      if (response.data.error) {
        return null;
      }

      return {
        country: response.data.country_name,
        countryCode: response.data.country_code,
        region: response.data.region,
        city: response.data.city,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        asn: response.data.asn,
        organization: response.data.org,
        timezone: response.data.timezone,
      };
    } catch (error) {
      console.error('[ENRICHMENT] Geolocation error:', error);
      return null;
    }
  }

  /**
   * Get IP reputation
   */
  private async getIPReputation(ip: string): Promise<ReputationData | null> {
    if (!this.config.abuseipdb?.enabled || !this.config.abuseipdb.apiKey) {
      return null;
    }

    try {
      const response = await axios.get('https://api.abuseipdb.com/api/v2/check', {
        headers: { 'Key': this.config.abuseipdb.apiKey },
        params: { ipAddress: ip, maxAgeInDays: 90 },
        timeout: 10000,
      });

      const data = response.data.data;

      return {
        score: 100 - data.abuseConfidenceScore,
        category: data.abuseConfidenceScore >= 75 ? 'MALICIOUS' :
                 data.abuseConfidenceScore >= 50 ? 'SUSPICIOUS' :
                 data.abuseConfidenceScore >= 25 ? 'SUSPICIOUS' : 'BENIGN',
        sources: ['AbuseIPDB'],
        verdicts: {
          AbuseIPDB: data.abuseConfidenceScore >= 75 ? 'malicious' : 'clean',
        },
        details: {
          totalReports: data.totalReports,
          numDistinctUsers: data.numDistinctUsers,
          lastReportedAt: data.lastReportedAt,
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[ENRICHMENT] IP reputation error:', error);
      return null;
    }
  }

  /**
   * Get IP threat intelligence
   */
  private async getIPThreatIntel(ip: string): Promise<ThreatIntelligence[]> {
    const results: ThreatIntelligence[] = [];

    // Add VirusTotal if configured
    if (this.config.virustotal?.enabled && this.config.virustotal.apiKey) {
      try {
        const vt = await this.getVirusTotalIP(ip);
        if (vt) results.push(vt);
      } catch (error) {
        console.error('[ENRICHMENT] VirusTotal IP error:', error);
      }
    }

    return results;
  }

  /**
   * Get VirusTotal IP report
   */
  private async getVirusTotalIP(ip: string): Promise<ThreatIntelligence | null> {
    try {
      const response = await axios.get(
        `https://www.virustotal.com/api/v3/ip_addresses/${ip}`,
        {
          headers: { 'x-apikey': this.config.virustotal!.apiKey },
          timeout: 10000,
        }
      );

      const data = response.data.data.attributes;
      const stats = data.last_analysis_stats;
      const total = stats.harmless + stats.malicious + stats.suspicious + stats.undetected;
      const score = total > 0 ? ((stats.malicious + stats.suspicious) / total) * 100 : 0;

      return {
        source: 'VirusTotal',
        category: 'ip_reputation',
        score,
        verdict: stats.malicious > 0 ? 'malicious' : 'clean',
        details: {
          last_analysis_stats: stats,
          reputation: data.reputation,
          country: data.country,
          asn: data.asn,
        },
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get DNS records
   */
  private async getDNSRecords(domain: string): Promise<DNSRecord[]> {
    try {
      // Using DNS-over-HTTPS (Google)
      const response = await axios.get('https://dns.google/resolve', {
        params: { name: domain, type: 'A' },
        timeout: 5000,
      });

      if (response.data.Answer) {
        return response.data.Answer.map((record: any) => ({
          type: record.type === 1 ? 'A' : 'UNKNOWN',
          value: record.data,
          ttl: record.TTL,
          timestamp: new Date().toISOString(),
        }));
      }

      return [];
    } catch (error) {
      console.error('[ENRICHMENT] DNS error:', error);
      return [];
    }
  }

  /**
   * Get WHOIS data
   */
  private async getWhoisData(domain: string): Promise<WhoisData | null> {
    try {
      // Using a free WHOIS API
      const response = await axios.get(`https://www.whoisxmlapi.com/whoisserver/WhoisService`, {
        params: {
          domainName: domain,
          outputFormat: 'JSON',
        },
        timeout: 10000,
      });

      const data = response.data.WhoisRecord;
      if (!data) return null;

      return {
        domain: data.domainName,
        registrar: data.registrarName,
        registrant: data.registrant?.name,
        registrantOrg: data.registrant?.organization,
        registrantEmail: data.registrant?.email,
        creationDate: data.createdDate,
        expirationDate: data.expiresDate,
        updatedDate: data.updatedDate,
        nameservers: data.nameServers?.hostNames || [],
        status: data.status || [],
      };
    } catch (error) {
      console.error('[ENRICHMENT] WHOIS error:', error);
      return null;
    }
  }

  /**
   * Get domain reputation
   */
  private async getDomainReputation(domain: string): Promise<ReputationData | null> {
    // Implement domain reputation check (similar to IP reputation)
    return null;
  }

  /**
   * Get domain threat intelligence
   */
  private async getDomainThreatIntel(domain: string): Promise<ThreatIntelligence[]> {
    const results: ThreatIntelligence[] = [];

    if (this.config.virustotal?.enabled && this.config.virustotal.apiKey) {
      try {
        const vt = await this.getVirusTotalDomain(domain);
        if (vt) results.push(vt);
      } catch (error) {
        console.error('[ENRICHMENT] VirusTotal domain error:', error);
      }
    }

    return results;
  }

  /**
   * Get VirusTotal domain report
   */
  private async getVirusTotalDomain(domain: string): Promise<ThreatIntelligence | null> {
    try {
      const response = await axios.get(
        `https://www.virustotal.com/api/v3/domains/${domain}`,
        {
          headers: { 'x-apikey': this.config.virustotal!.apiKey },
          timeout: 10000,
        }
      );

      const data = response.data.data.attributes;
      const stats = data.last_analysis_stats;
      const total = stats.harmless + stats.malicious + stats.suspicious + stats.undetected;
      const score = total > 0 ? ((stats.malicious + stats.suspicious) / total) * 100 : 0;

      return {
        source: 'VirusTotal',
        category: 'domain_reputation',
        score,
        verdict: stats.malicious > 0 ? 'malicious' : 'clean',
        details: {
          last_analysis_stats: stats,
          reputation: data.reputation,
          categories: data.categories,
        },
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get URL reputation
   */
  private async getURLReputation(url: string): Promise<ReputationData | null> {
    // Implement URL reputation check
    return null;
  }

  /**
   * Get URL scan
   */
  private async getURLScan(url: string): Promise<SandboxResult | null> {
    if (!this.config.urlscan?.enabled || !this.config.urlscan.apiKey) {
      return null;
    }

    try {
      // Submit URL for scanning
      const submitResponse = await axios.post(
        'https://urlscan.io/api/v1/scan/',
        { url, visibility: 'public' },
        {
          headers: { 'API-Key': this.config.urlscan.apiKey },
          timeout: 10000,
        }
      );

      const scanId = submitResponse.data.uuid;

      // Wait for scan to complete (simplified - in production, use polling)
      await new Promise(resolve => setTimeout(resolve, 30000));

      // Get results
      const resultResponse = await axios.get(
        `https://urlscan.io/api/v1/result/${scanId}/`,
        { timeout: 10000 }
      );

      const data = resultResponse.data;

      return {
        id: scanId,
        provider: 'any.run',
        analysisId: scanId,
        verdict: data.verdicts?.overall?.malicious ? 'MALICIOUS' : 'CLEAN',
        score: data.verdicts?.overall?.score || 0,
        behaviors: [],
        networkActivity: data.data?.requests?.map((req: any) => ({
          protocol: 'HTTP',
          dstIp: req.response?.response?.remoteIPAddress || '',
          dstPort: 443,
          domain: req.request?.request?.url || '',
          url: req.request?.request?.url || '',
          timestamp: req.request?.request?.timestamp || '',
        })) || [],
        fileActivity: [],
        registryActivity: [],
        processActivity: [],
        reportUrl: `https://urlscan.io/result/${scanId}/`,
        analyzedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[ENRICHMENT] URLScan error:', error);
      return null;
    }
  }

  /**
   * Get VirusTotal file report
   */
  private async getVirusTotalReport(hash: string): Promise<any> {
    if (!this.config.virustotal?.enabled || !this.config.virustotal.apiKey) {
      return null;
    }

    try {
      const response = await axios.get(
        `https://www.virustotal.com/api/v3/files/${hash}`,
        {
          headers: { 'x-apikey': this.config.virustotal.apiKey },
          timeout: 10000,
        }
      );

      const data = response.data.data.attributes;
      const stats = data.last_analysis_stats;
      const total = stats.harmless + stats.malicious + stats.suspicious + stats.undetected;
      const score = total > 0 ? (100 - ((stats.malicious + stats.suspicious) / total) * 100) : 0;

      return {
        reputation: {
          score,
          category: stats.malicious > 10 ? 'MALICIOUS' :
                   stats.malicious > 0 ? 'SUSPICIOUS' : 'BENIGN',
          sources: ['VirusTotal'],
          verdicts: {
            VirusTotal: stats.malicious > 0 ? 'malicious' : 'clean',
          },
          details: { last_analysis_stats: stats },
          lastChecked: new Date().toISOString(),
        },
        threatIntel: [{
          source: 'VirusTotal',
          category: 'file_analysis',
          score: (stats.malicious / total) * 100,
          verdict: stats.malicious > 0 ? 'malicious' : 'clean',
          details: {
            detections: `${stats.malicious}/${total}`,
            names: data.names,
            type_description: data.type_description,
            magic: data.magic,
          },
          lastUpdated: new Date().toISOString(),
        }],
        malwareAnalysis: {
          families: data.popular_threat_classification?.suggested_threat_label ?
            [data.popular_threat_classification.suggested_threat_label] : [],
          capabilities: data.tags || [],
        },
      };
    } catch (error) {
      console.error('[ENRICHMENT] VirusTotal file error:', error);
      return null;
    }
  }

  /**
   * Get Hybrid Analysis report
   */
  private async getHybridAnalysisReport(hash: string): Promise<SandboxResult | null> {
    if (!this.config.hybridAnalysis?.enabled || !this.config.hybridAnalysis.apiKey) {
      return null;
    }

    try {
      const response = await axios.get(
        `https://www.hybrid-analysis.com/api/v2/search/hash`,
        {
          headers: {
            'api-key': this.config.hybridAnalysis.apiKey,
            'user-agent': 'Falcon Sandbox',
          },
          params: { hash },
          timeout: 10000,
        }
      );

      if (!response.data || response.data.length === 0) {
        return null;
      }

      const data = response.data[0];

      return {
        id: data.job_id,
        provider: 'hybrid-analysis',
        analysisId: data.job_id,
        verdict: data.verdict === 'malicious' ? 'MALICIOUS' :
                data.verdict === 'suspicious' ? 'SUSPICIOUS' : 'CLEAN',
        score: data.threat_score || 0,
        malwareFamily: data.vx_family,
        behaviors: data.mitre_attcks?.map((m: any) => ({
          category: m.tactic,
          description: m.technique,
          severity: 'MEDIUM' as const,
          mitreId: m.attck_id,
        })) || [],
        networkActivity: [],
        fileActivity: [],
        registryActivity: [],
        processActivity: [],
        reportUrl: data.permalink,
        analyzedAt: data.analysis_start_time,
      };
    } catch (error) {
      console.error('[ENRICHMENT] Hybrid Analysis error:', error);
      return null;
    }
  }
}
