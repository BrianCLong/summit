/**
 * Digital footprint tracker
 */

import type {
  DigitalFootprint,
  UsernameRecord,
  EmailRecord,
  PhoneRecord,
  IPAddressRecord,
  DeviceRecord,
  SocialMediaProfile,
  DomainRecord,
  CryptoWalletRecord,
  FootprintMetadata
} from './types.js';

export class FootprintTracker {
  private footprints: Map<string, DigitalFootprint>;

  constructor() {
    this.footprints = new Map();
  }

  /**
   * Get or create footprint for entity
   */
  getFootprint(entityId: string): DigitalFootprint {
    let footprint = this.footprints.get(entityId);

    if (!footprint) {
      footprint = {
        entityId,
        usernames: [],
        emails: [],
        phones: [],
        ipAddresses: [],
        devices: [],
        socialMedia: [],
        domains: [],
        wallets: [],
        metadata: {
          firstSeen: new Date(),
          lastSeen: new Date(),
          totalPlatforms: 0,
          confidence: 0,
          riskScore: 0
        }
      };
      this.footprints.set(entityId, footprint);
    }

    return footprint;
  }

  /**
   * Add username to footprint
   */
  addUsername(entityId: string, record: UsernameRecord): void {
    const footprint = this.getFootprint(entityId);

    // Check if username already exists
    const existing = footprint.usernames.find(
      u => u.username === record.username && u.platform === record.platform
    );

    if (!existing) {
      footprint.usernames.push(record);
      this.updateMetadata(footprint);
    } else {
      // Update existing record
      existing.lastSeen = record.lastSeen;
      existing.verified = existing.verified || record.verified;
    }
  }

  /**
   * Add email to footprint
   */
  addEmail(entityId: string, record: EmailRecord): void {
    const footprint = this.getFootprint(entityId);

    const existing = footprint.emails.find(e => e.email === record.email);

    if (!existing) {
      footprint.emails.push(record);
      this.updateMetadata(footprint);
    } else {
      existing.verified = existing.verified || record.verified;
      existing.breached = existing.breached || record.breached;
    }
  }

  /**
   * Add phone to footprint
   */
  addPhone(entityId: string, record: PhoneRecord): void {
    const footprint = this.getFootprint(entityId);

    const existing = footprint.phones.find(p => p.phone === record.phone);

    if (!existing) {
      footprint.phones.push(record);
      this.updateMetadata(footprint);
    } else {
      existing.verified = existing.verified || record.verified;
    }
  }

  /**
   * Add IP address to footprint
   */
  addIPAddress(entityId: string, record: IPAddressRecord): void {
    const footprint = this.getFootprint(entityId);

    const existing = footprint.ipAddresses.find(ip => ip.ip === record.ip);

    if (!existing) {
      footprint.ipAddresses.push(record);
      this.updateMetadata(footprint);
    } else {
      existing.lastSeen = record.lastSeen;
      existing.connections++;
    }
  }

  /**
   * Add device to footprint
   */
  addDevice(entityId: string, record: DeviceRecord): void {
    const footprint = this.getFootprint(entityId);

    const existing = footprint.devices.find(
      d => d.fingerprint === record.fingerprint
    );

    if (!existing) {
      footprint.devices.push(record);
      this.updateMetadata(footprint);
    } else {
      existing.lastSeen = record.lastSeen;
    }
  }

  /**
   * Add social media profile to footprint
   */
  addSocialMedia(entityId: string, record: SocialMediaProfile): void {
    const footprint = this.getFootprint(entityId);

    const existing = footprint.socialMedia.find(
      s => s.platform === record.platform && s.username === record.username
    );

    if (!existing) {
      footprint.socialMedia.push(record);
      this.updateMetadata(footprint);
    } else {
      // Update with latest data
      Object.assign(existing, record);
    }
  }

  /**
   * Add domain to footprint
   */
  addDomain(entityId: string, record: DomainRecord): void {
    const footprint = this.getFootprint(entityId);

    const existing = footprint.domains.find(d => d.domain === record.domain);

    if (!existing) {
      footprint.domains.push(record);
      this.updateMetadata(footprint);
    } else {
      Object.assign(existing, record);
    }
  }

  /**
   * Add crypto wallet to footprint
   */
  addWallet(entityId: string, record: CryptoWalletRecord): void {
    const footprint = this.getFootprint(entityId);

    const existing = footprint.wallets.find(w => w.address === record.address);

    if (!existing) {
      footprint.wallets.push(record);
      this.updateMetadata(footprint);
    } else {
      existing.lastSeen = record.lastSeen;
      existing.balance = record.balance;
      existing.transactions = record.transactions;
    }
  }

  /**
   * Update footprint metadata
   */
  private updateMetadata(footprint: DigitalFootprint): void {
    footprint.metadata.lastSeen = new Date();

    // Calculate total platforms
    const platforms = new Set<string>();
    footprint.usernames.forEach(u => platforms.add(u.platform));
    footprint.socialMedia.forEach(s => platforms.add(s.platform));
    footprint.metadata.totalPlatforms = platforms.size;

    // Calculate confidence score
    let score = 0;
    let count = 0;

    footprint.usernames.forEach(u => {
      score += u.confidence;
      count++;
    });
    footprint.emails.forEach(e => {
      score += e.confidence;
      count++;
    });
    footprint.phones.forEach(p => {
      score += p.confidence;
      count++;
    });

    footprint.metadata.confidence = count > 0 ? score / count : 0;

    // Calculate risk score
    footprint.metadata.riskScore = this.calculateRiskScore(footprint);
  }

  /**
   * Calculate risk score based on footprint characteristics
   */
  private calculateRiskScore(footprint: DigitalFootprint): number {
    let risk = 0;

    // VPN/Proxy usage increases risk
    const vpnCount = footprint.ipAddresses.filter(ip => ip.vpn || ip.proxy).length;
    risk += vpnCount * 0.1;

    // Tor usage significantly increases risk
    const torCount = footprint.ipAddresses.filter(ip => ip.tor).length;
    risk += torCount * 0.3;

    // Breached emails increase risk
    const breachedCount = footprint.emails.filter(e => e.breached).length;
    risk += breachedCount * 0.2;

    // Multiple countries increase risk
    const countries = new Set(
      footprint.ipAddresses.map(ip => ip.geolocation.country)
    );
    if (countries.size > 5) risk += 0.2;

    // Cap at 1.0
    return Math.min(risk, 1.0);
  }

  /**
   * Search footprints by username
   */
  findByUsername(username: string): DigitalFootprint[] {
    const results: DigitalFootprint[] = [];

    for (const footprint of this.footprints.values()) {
      const hasUsername = footprint.usernames.some(
        u => u.username.toLowerCase() === username.toLowerCase()
      );

      if (hasUsername) {
        results.push(footprint);
      }
    }

    return results;
  }

  /**
   * Search footprints by email
   */
  findByEmail(email: string): DigitalFootprint[] {
    const results: DigitalFootprint[] = [];

    for (const footprint of this.footprints.values()) {
      const hasEmail = footprint.emails.some(
        e => e.email.toLowerCase() === email.toLowerCase()
      );

      if (hasEmail) {
        results.push(footprint);
      }
    }

    return results;
  }

  /**
   * Search footprints by phone
   */
  findByPhone(phone: string): DigitalFootprint[] {
    const results: DigitalFootprint[] = [];

    for (const footprint of this.footprints.values()) {
      const hasPhone = footprint.phones.some(p => p.phone === phone);

      if (hasPhone) {
        results.push(footprint);
      }
    }

    return results;
  }

  /**
   * Search footprints by IP address
   */
  findByIP(ip: string): DigitalFootprint[] {
    const results: DigitalFootprint[] = [];

    for (const footprint of this.footprints.values()) {
      const hasIP = footprint.ipAddresses.some(addr => addr.ip === ip);

      if (hasIP) {
        results.push(footprint);
      }
    }

    return results;
  }

  /**
   * Get high-risk footprints
   */
  getHighRiskFootprints(threshold: number = 0.7): DigitalFootprint[] {
    return Array.from(this.footprints.values()).filter(
      f => f.metadata.riskScore >= threshold
    );
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalFootprints: number;
    totalUsernames: number;
    totalEmails: number;
    totalPhones: number;
    totalIPs: number;
    totalDevices: number;
    totalSocialMedia: number;
    averageRiskScore: number;
  } {
    let totalUsernames = 0;
    let totalEmails = 0;
    let totalPhones = 0;
    let totalIPs = 0;
    let totalDevices = 0;
    let totalSocialMedia = 0;
    let totalRisk = 0;

    for (const footprint of this.footprints.values()) {
      totalUsernames += footprint.usernames.length;
      totalEmails += footprint.emails.length;
      totalPhones += footprint.phones.length;
      totalIPs += footprint.ipAddresses.length;
      totalDevices += footprint.devices.length;
      totalSocialMedia += footprint.socialMedia.length;
      totalRisk += footprint.metadata.riskScore;
    }

    const count = this.footprints.size;

    return {
      totalFootprints: count,
      totalUsernames,
      totalEmails,
      totalPhones,
      totalIPs,
      totalDevices,
      totalSocialMedia,
      averageRiskScore: count > 0 ? totalRisk / count : 0
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.footprints.clear();
  }
}
