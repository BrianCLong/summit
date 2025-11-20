/**
 * Attribution Engine
 * Performs threat actor attribution based on TTPs, infrastructure, and behavioral patterns
 */

import { IOC, Attribution, Confidence } from '@intelgraph/threat-intelligence';
import { AttackService, AttackGroup } from '@intelgraph/mitre-attack';

export interface AttributionFactors {
  ttpSimilarity: number;
  infrastructureOverlap: number;
  malwareFamily: number;
  geolocation: number;
  timing: number;
  victims: number;
}

export class AttributionEngine {
  private attackService: AttackService;

  constructor(attackService: AttackService) {
    this.attackService = attackService;
  }

  /**
   * Perform attribution for an IoC
   */
  async attributeIoC(ioc: IOC): Promise<Attribution> {
    const attribution: Attribution = {
      confidence: 'UNKNOWN',
      confidenceScore: 0,
      reasoning: [],
    };

    // Extract features for attribution
    const features = this.extractAttributionFeatures(ioc);

    // TTP-based attribution
    if (ioc.context.mitreTechniques.length > 0) {
      const ttpAttribution = await this.attributeByTTPs(ioc.context.mitreTechniques);
      if (ttpAttribution.groups && ttpAttribution.groups.length > 0) {
        attribution.groups = ttpAttribution.groups;
        attribution.confidence = ttpAttribution.confidence;
        attribution.confidenceScore = ttpAttribution.confidenceScore;
        attribution.reasoning.push(...ttpAttribution.reasoning);
      }
    }

    // Malware family-based attribution
    if (ioc.context.family) {
      const familyAttribution = this.attributeByMalwareFamily(ioc.context.family);
      if (familyAttribution.groups && familyAttribution.groups.length > 0) {
        if (!attribution.groups) {
          attribution.groups = familyAttribution.groups;
        } else {
          // Merge with existing attribution
          attribution.groups = this.mergeGroups(
            attribution.groups,
            familyAttribution.groups
          );
        }
        attribution.reasoning.push(...familyAttribution.reasoning);
      }
    }

    // Infrastructure-based attribution
    if (ioc.enrichment.geolocation) {
      const infraAttribution = this.attributeByInfrastructure(ioc);
      if (infraAttribution.countries && infraAttribution.countries.length > 0) {
        attribution.countries = infraAttribution.countries;
        attribution.reasoning.push(...infraAttribution.reasoning);
      }
    }

    // Campaign-based attribution
    if (ioc.context.campaigns && ioc.context.campaigns.length > 0) {
      attribution.reasoning.push(`Associated with campaigns: ${ioc.context.campaigns.join(', ')}`);
    }

    // Calculate final confidence
    if (attribution.groups && attribution.groups.length > 0) {
      const factors = this.calculateAttributionFactors(ioc, attribution);
      attribution.confidenceScore = this.calculateConfidence(factors);
      attribution.confidence = this.scoreToConfidence(attribution.confidenceScore);
    }

    return attribution;
  }

  /**
   * Attribute by TTPs
   */
  private async attributeByTTPs(techniques: string[]): Promise<Attribution> {
    const fingerprint = this.attackService.generateTTPFingerprint(techniques);

    const attribution: Attribution = {
      confidence: 'UNKNOWN',
      confidenceScore: fingerprint.confidence,
      reasoning: fingerprint.reasoning,
    };

    if (fingerprint.groups.length > 0) {
      attribution.groups = fingerprint.groups.map(g => g.name);
      attribution.confidence = this.scoreToConfidence(fingerprint.confidence);

      // Extract country information
      const countries = new Set<string>();
      for (const group of fingerprint.groups) {
        if (group.country) {
          countries.add(group.country);
        }
      }
      if (countries.size > 0) {
        attribution.countries = Array.from(countries);
      }
    }

    return attribution;
  }

  /**
   * Attribute by malware family
   */
  private attributeByMalwareFamily(family: string): Attribution {
    const attribution: Attribution = {
      confidence: 'LOW',
      confidenceScore: 30,
      reasoning: [],
    };

    // Get software from ATT&CK
    const software = this.attackService.getSoftware({
      search: family,
    });

    if (software.length > 0) {
      const sw = software[0];

      // Find groups using this software
      if (sw.groups && sw.groups.length > 0) {
        const groups = sw.groups
          .map(gid => this.attackService.getGroup(gid))
          .filter(g => g !== undefined)
          .map(g => g!.name);

        if (groups.length > 0) {
          attribution.groups = groups;
          attribution.confidence = 'MEDIUM';
          attribution.confidenceScore = 50;
          attribution.reasoning.push(
            `Malware family "${family}" is associated with threat groups: ${groups.join(', ')}`
          );
        }
      }
    }

    return attribution;
  }

  /**
   * Attribute by infrastructure patterns
   */
  private attributeByInfrastructure(ioc: IOC): Attribution {
    const attribution: Attribution = {
      confidence: 'LOW',
      confidenceScore: 20,
      reasoning: [],
    };

    if (ioc.enrichment.geolocation?.country) {
      const country = ioc.enrichment.geolocation.country;
      attribution.countries = [country];
      attribution.reasoning.push(`Infrastructure hosted in ${country}`);

      // Known attribution patterns (simplified)
      const knownPatterns: Record<string, string[]> = {
        'Russia': ['APT28', 'APT29', 'Turla', 'Sandworm'],
        'China': ['APT1', 'APT10', 'APT41', 'Winnti'],
        'North Korea': ['Lazarus Group', 'APT38', 'Kimsuky'],
        'Iran': ['APT33', 'APT34', 'OilRig'],
      };

      if (knownPatterns[country]) {
        attribution.groups = knownPatterns[country];
        attribution.confidenceScore = 40;
        attribution.confidence = 'MEDIUM';
        attribution.reasoning.push(
          `Infrastructure pattern consistent with groups operating from ${country}`
        );
      }
    }

    return attribution;
  }

  /**
   * Extract attribution features
   */
  private extractAttributionFeatures(ioc: IOC): AttributionFactors {
    return {
      ttpSimilarity: ioc.context.mitreTechniques.length > 0 ? 80 : 0,
      infrastructureOverlap: ioc.enrichment.geolocation ? 60 : 0,
      malwareFamily: ioc.context.family ? 70 : 0,
      geolocation: ioc.enrichment.geolocation?.country ? 50 : 0,
      timing: 40, // Placeholder
      victims: ioc.context.targetedSectors ? 50 : 0,
    };
  }

  /**
   * Calculate attribution factors
   */
  private calculateAttributionFactors(
    ioc: IOC,
    attribution: Attribution
  ): AttributionFactors {
    return {
      ttpSimilarity: ioc.context.mitreTechniques.length > 0 ? 80 : 0,
      infrastructureOverlap: attribution.countries ? 60 : 0,
      malwareFamily: ioc.context.family ? 70 : 0,
      geolocation: ioc.enrichment.geolocation ? 50 : 0,
      timing: 40,
      victims: ioc.context.targetedSectors ? 50 : 0,
    };
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(factors: AttributionFactors): number {
    const weights = {
      ttpSimilarity: 0.35,
      infrastructureOverlap: 0.20,
      malwareFamily: 0.25,
      geolocation: 0.10,
      timing: 0.05,
      victims: 0.05,
    };

    let score = 0;
    score += factors.ttpSimilarity * weights.ttpSimilarity;
    score += factors.infrastructureOverlap * weights.infrastructureOverlap;
    score += factors.malwareFamily * weights.malwareFamily;
    score += factors.geolocation * weights.geolocation;
    score += factors.timing * weights.timing;
    score += factors.victims * weights.victims;

    return Math.round(score);
  }

  /**
   * Convert score to confidence level
   */
  private scoreToConfidence(score: number): Confidence {
    if (score >= 90) return 'CONFIRMED';
    if (score >= 70) return 'HIGH';
    if (score >= 50) return 'MEDIUM';
    if (score >= 30) return 'LOW';
    return 'UNKNOWN';
  }

  /**
   * Merge group lists
   */
  private mergeGroups(groups1: string[], groups2: string[]): string[] {
    const merged = new Set<string>([...groups1, ...groups2]);
    return Array.from(merged);
  }

  /**
   * Perform infrastructure overlap analysis
   */
  async analyzeInfrastructureOverlap(iocs: IOC[]): Promise<Map<string, IOC[]>> {
    const clusters = new Map<string, IOC[]>();

    // Group by ASN
    for (const ioc of iocs) {
      const asn = ioc.enrichment.asn?.asn.toString();
      if (asn) {
        if (!clusters.has(asn)) {
          clusters.set(asn, []);
        }
        clusters.get(asn)!.push(ioc);
      }
    }

    return clusters;
  }

  /**
   * Analyze code similarity
   */
  async analyzeCodeSimilarity(hashes: string[]): Promise<Map<string, string[]>> {
    // Placeholder for code similarity analysis
    // In production, would use YARA, fuzzy hashing (ssdeep), or ML-based approaches
    const families = new Map<string, string[]>();

    // Simplified grouping logic
    for (const hash of hashes) {
      // Use first 4 chars as simple similarity metric (real implementation would be more sophisticated)
      const prefix = hash.substring(0, 4);
      if (!families.has(prefix)) {
        families.set(prefix, []);
      }
      families.get(prefix)!.push(hash);
    }

    return families;
  }

  /**
   * Analyze language and timezone patterns
   */
  async analyzeLanguageTimezone(iocs: IOC[]): Promise<{
    languages: string[];
    timezones: string[];
    confidence: number;
  }> {
    const timezones = new Set<string>();

    for (const ioc of iocs) {
      if (ioc.enrichment.geolocation?.timezone) {
        timezones.add(ioc.enrichment.geolocation.timezone);
      }
    }

    // Infer working hours from timestamp patterns
    // Simplified - real implementation would analyze actual timestamps

    return {
      languages: [], // Would extract from malware strings, C2 communications, etc.
      timezones: Array.from(timezones),
      confidence: timezones.size > 0 ? 60 : 0,
    };
  }

  /**
   * Correlate with historical campaigns
   */
  async correlateHistoricalCampaigns(ioc: IOC): Promise<string[]> {
    const campaigns: string[] = [];

    // Compare with known campaign patterns
    // This would query a database of historical campaigns in production

    if (ioc.context.campaigns) {
      campaigns.push(...ioc.context.campaigns);
    }

    return campaigns;
  }
}
