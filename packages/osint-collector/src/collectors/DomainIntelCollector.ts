/**
 * Domain Intelligence Collector - Collects domain and IP intelligence
 */

import { CollectorBase } from '../core/CollectorBase.js';
import type { CollectionTask, DomainIntelligence } from '../types/index.js';
import { lookup as whoisLookup } from 'whois';
import { promises as dns } from 'dns';

export class DomainIntelCollector extends CollectorBase {
  protected async onInitialize(): Promise<void> {
    console.log(`Initializing ${this.config.name}`);
  }

  protected async performCollection(task: CollectionTask): Promise<unknown> {
    const domain = task.target;
    return await this.collectDomainIntel(domain);
  }

  protected async onShutdown(): Promise<void> {
    // Cleanup
  }

  protected countRecords(data: unknown): number {
    return 1;
  }

  /**
   * Collect comprehensive domain intelligence
   */
  async collectDomainIntel(domain: string): Promise<DomainIntelligence> {
    const [whoisData, dnsRecords, ipAddresses] = await Promise.allSettled([
      this.getWhoisData(domain),
      this.getDNSRecords(domain),
      this.resolveIPs(domain)
    ]);

    const intel: DomainIntelligence = {
      domain,
      ipAddresses: ipAddresses.status === 'fulfilled' ? ipAddresses.value : []
    };

    if (whoisData.status === 'fulfilled') {
      Object.assign(intel, this.parseWhoisData(whoisData.value));
    }

    if (dnsRecords.status === 'fulfilled') {
      intel.dnsRecords = dnsRecords.value;
    }

    return intel;
  }

  /**
   * Get WHOIS information
   */
  private async getWhoisData(domain: string): Promise<string> {
    return new Promise((resolve, reject) => {
      whoisLookup(domain, (err: Error | null, data: string) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  /**
   * Parse WHOIS data
   */
  private parseWhoisData(whoisText: string): Partial<DomainIntelligence> {
    const result: Partial<DomainIntelligence> = {};

    // Parse registrar
    const registrarMatch = whoisText.match(/Registrar:\s*(.+)/i);
    if (registrarMatch) {
      result.registrar = registrarMatch[1].trim();
    }

    // Parse dates
    const createdMatch = whoisText.match(/Creation Date:\s*(.+)/i);
    if (createdMatch) {
      result.registrationDate = new Date(createdMatch[1].trim());
    }

    const expiresMatch = whoisText.match(/Expir(?:y|ation) Date:\s*(.+)/i);
    if (expiresMatch) {
      result.expirationDate = new Date(expiresMatch[1].trim());
    }

    // Parse nameservers
    const nameservers = whoisText.match(/Name Server:\s*(.+)/gi);
    if (nameservers) {
      result.nameservers = nameservers.map(ns =>
        ns.replace(/Name Server:\s*/i, '').trim().toLowerCase()
      );
    }

    return result;
  }

  /**
   * Get DNS records
   */
  private async getDNSRecords(domain: string): Promise<Record<string, string[]>> {
    const records: Record<string, string[]> = {};

    try {
      // A records
      const aRecords = await dns.resolve4(domain);
      records['A'] = aRecords;
    } catch (e) {
      // Ignore
    }

    try {
      // AAAA records
      const aaaaRecords = await dns.resolve6(domain);
      records['AAAA'] = aaaaRecords;
    } catch (e) {
      // Ignore
    }

    try {
      // MX records
      const mxRecords = await dns.resolveMx(domain);
      records['MX'] = mxRecords.map(mx => `${mx.priority} ${mx.exchange}`);
    } catch (e) {
      // Ignore
    }

    try {
      // TXT records
      const txtRecords = await dns.resolveTxt(domain);
      records['TXT'] = txtRecords.map(txt => txt.join(''));
    } catch (e) {
      // Ignore
    }

    try {
      // NS records
      const nsRecords = await dns.resolveNs(domain);
      records['NS'] = nsRecords;
    } catch (e) {
      // Ignore
    }

    try {
      // CNAME records
      const cnameRecords = await dns.resolveCname(domain);
      records['CNAME'] = cnameRecords;
    } catch (e) {
      // Ignore
    }

    return records;
  }

  /**
   * Resolve domain to IP addresses
   */
  private async resolveIPs(domain: string): Promise<string[]> {
    try {
      const ips = await dns.resolve4(domain);
      return ips;
    } catch (e) {
      return [];
    }
  }

  /**
   * Get IP geolocation
   */
  async getIPGeolocation(ip: string): Promise<{
    ip: string;
    country?: string;
    city?: string;
    isp?: string;
    asn?: string;
  }> {
    // Would integrate with IP geolocation APIs like MaxMind, IPinfo, etc.
    return { ip };
  }

  /**
   * Get SSL certificate information
   */
  async getSSLCertificate(domain: string): Promise<{
    issuer: string;
    validFrom: Date;
    validTo: Date;
    subject: string;
  } | null> {
    // Would use TLS socket to retrieve certificate
    return null;
  }

  /**
   * Check subdomain enumeration
   */
  async enumerateSubdomains(domain: string): Promise<string[]> {
    // Would use certificate transparency logs, DNS brute force, etc.
    return [];
  }
}
