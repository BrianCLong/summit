/**
 * STIX 2.1 Object Processor
 * Converts STIX objects to internal IoC format and handles enrichment
 */

import {
  StixCoreObject,
  Indicator,
  Malware,
  ThreatActor,
  AttackPattern,
  Campaign,
  IntrusionSet,
  Relationship,
  Sighting,
  IPv4Address,
  IPv6Address,
  DomainName,
  URL as StixURL,
  File,
  StixBundle,
} from '../types/stix.js';
import {
  IOC,
  IOCType,
  ThreatType,
  Severity,
  TLP,
  Confidence,
  IOCRelationship,
  IOCSighting,
} from '../types/ioc.js';

export class StixProcessor {
  /**
   * Process a STIX bundle and extract IoCs
   */
  async processBundle(bundle: StixBundle): Promise<IOC[]> {
    const iocs: IOC[] = [];
    const relationships: Relationship[] = [];
    const sightings: Sighting[] = [];

    // First pass: process indicators and observables
    for (const obj of bundle.objects) {
      if (obj.type === 'indicator') {
        const ioc = await this.processIndicator(obj as Indicator);
        if (ioc) iocs.push(ioc);
      } else if (obj.type === 'relationship') {
        relationships.push(obj as Relationship);
      } else if (obj.type === 'sighting') {
        sightings.push(obj as Sighting);
      } else if (this.isObservable(obj.type)) {
        const ioc = await this.processObservable(obj);
        if (ioc) iocs.push(ioc);
      }
    }

    // Second pass: add relationships and context
    for (const rel of relationships) {
      this.applyRelationship(iocs, rel, bundle.objects);
    }

    // Third pass: add sightings
    for (const sighting of sightings) {
      this.applySighting(iocs, sighting);
    }

    return iocs;
  }

  /**
   * Process a STIX Indicator to IoC
   */
  private async processIndicator(indicator: Indicator): Promise<IOC | null> {
    try {
      // Parse the STIX pattern to extract observable
      const observable = this.parseStixPattern(indicator.pattern);
      if (!observable) return null;

      const now = new Date().toISOString();

      const ioc: IOC = {
        id: `ioc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: observable.type,
        value: observable.value,
        description: indicator.description,
        threatType: this.mapIndicatorTypes(indicator.indicator_types),
        severity: this.inferSeverity(indicator),
        confidence: this.mapConfidence(indicator.confidence),
        confidenceScore: indicator.confidence || 50,
        firstSeen: indicator.valid_from,
        lastSeen: indicator.valid_until || now,
        tags: indicator.labels || [],
        source: 'STIX',
        sources: [
          {
            name: 'STIX',
            confidence: indicator.confidence || 50,
            firstSeen: indicator.valid_from,
            lastSeen: indicator.valid_until || now,
          },
        ],
        tlp: this.mapTLP(indicator.object_marking_refs),
        isActive: !indicator.revoked && (!indicator.valid_until || new Date(indicator.valid_until) > new Date()),
        falsePositive: false,
        whitelisted: false,
        context: {
          killChain: indicator.kill_chain_phases?.map(kc => kc.phase_name as any) || [],
          mitreTactics: [],
          mitreTechniques: [],
          references: indicator.external_references?.map(ref => ({
            type: 'report' as const,
            url: ref.url,
            title: ref.source_name,
            description: ref.description,
          })) || [],
        },
        relationships: [],
        sightings: [],
        enrichment: {},
        attribution: {
          confidence: 'UNKNOWN',
          confidenceScore: 0,
          reasoning: [],
        },
        metadata: {
          stix_pattern: indicator.pattern,
          stix_pattern_type: indicator.pattern_type,
        },
        createdBy: indicator.created_by_ref || 'stix-import',
        createdAt: indicator.created,
        updatedAt: indicator.modified,
        expiresAt: indicator.valid_until,
        stixId: indicator.id,
      };

      return ioc;
    } catch (error) {
      console.error('Error processing STIX indicator:', error);
      return null;
    }
  }

  /**
   * Process a STIX Cyber Observable to IoC
   */
  private async processObservable(observable: any): Promise<IOC | null> {
    try {
      const now = new Date().toISOString();
      let type: IOCType;
      let value: string;

      switch (observable.type) {
        case 'ipv4-addr':
          type = 'ipv4';
          value = (observable as IPv4Address).value;
          break;
        case 'ipv6-addr':
          type = 'ipv6';
          value = (observable as IPv6Address).value;
          break;
        case 'domain-name':
          type = 'domain';
          value = (observable as DomainName).value;
          break;
        case 'url':
          type = 'url';
          value = (observable as StixURL).value;
          break;
        case 'file':
          const file = observable as File;
          if (file.hashes) {
            if (file.hashes['SHA-256']) {
              type = 'sha256';
              value = file.hashes['SHA-256'];
            } else if (file.hashes['SHA-1']) {
              type = 'sha1';
              value = file.hashes['SHA-1'];
            } else if (file.hashes['MD5']) {
              type = 'md5';
              value = file.hashes['MD5'];
            } else {
              return null;
            }
          } else {
            return null;
          }
          break;
        default:
          return null;
      }

      const ioc: IOC = {
        id: `ioc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        value,
        threatType: [],
        severity: 'MEDIUM',
        confidence: 'MEDIUM',
        confidenceScore: 50,
        firstSeen: now,
        lastSeen: now,
        tags: [],
        source: 'STIX',
        sources: [
          {
            name: 'STIX',
            confidence: 50,
            firstSeen: now,
            lastSeen: now,
          },
        ],
        tlp: this.mapTLP(observable.object_marking_refs),
        isActive: true,
        falsePositive: false,
        whitelisted: false,
        context: {
          killChain: [],
          mitreTactics: [],
          mitreTechniques: [],
          references: [],
        },
        relationships: [],
        sightings: [],
        enrichment: {},
        attribution: {
          confidence: 'UNKNOWN',
          confidenceScore: 0,
          reasoning: [],
        },
        metadata: {},
        createdBy: 'stix-import',
        createdAt: now,
        updatedAt: now,
        stixId: observable.id,
      };

      return ioc;
    } catch (error) {
      console.error('Error processing STIX observable:', error);
      return null;
    }
  }

  /**
   * Parse STIX pattern to extract observable
   */
  private parseStixPattern(pattern: string): { type: IOCType; value: string } | null {
    // Basic STIX pattern parsing
    // Pattern format: [ipv4-addr:value = '1.2.3.4']

    const ipv4Match = pattern.match(/ipv4-addr:value\s*=\s*'([^']+)'/);
    if (ipv4Match) return { type: 'ipv4', value: ipv4Match[1] };

    const ipv6Match = pattern.match(/ipv6-addr:value\s*=\s*'([^']+)'/);
    if (ipv6Match) return { type: 'ipv6', value: ipv6Match[1] };

    const domainMatch = pattern.match(/domain-name:value\s*=\s*'([^']+)'/);
    if (domainMatch) return { type: 'domain', value: domainMatch[1] };

    const urlMatch = pattern.match(/url:value\s*=\s*'([^']+)'/);
    if (urlMatch) return { type: 'url', value: urlMatch[1] };

    const sha256Match = pattern.match(/file:hashes\.\s*'?SHA-?256'?\s*=\s*'([^']+)'/i);
    if (sha256Match) return { type: 'sha256', value: sha256Match[1] };

    const sha1Match = pattern.match(/file:hashes\.\s*'?SHA-?1'?\s*=\s*'([^']+)'/i);
    if (sha1Match) return { type: 'sha1', value: sha1Match[1] };

    const md5Match = pattern.match(/file:hashes\.\s*'?MD5'?\s*=\s*'([^']+)'/i);
    if (md5Match) return { type: 'md5', value: md5Match[1] };

    return null;
  }

  /**
   * Apply relationship to IoCs
   */
  private applyRelationship(iocs: IOC[], relationship: Relationship, allObjects: any[]): void {
    const sourceIoc = iocs.find(ioc => ioc.stixId === relationship.source_ref);
    if (!sourceIoc) return;

    const targetIoc = iocs.find(ioc => ioc.stixId === relationship.target_ref);
    if (targetIoc) {
      sourceIoc.relationships.push({
        relatedIOC: targetIoc.id,
        relationshipType: this.mapRelationshipType(relationship.relationship_type),
        confidence: relationship.confidence || 50,
        context: relationship.description,
      });
    }

    // Add context from related objects
    const targetObj = allObjects.find(obj => obj.id === relationship.target_ref);
    if (targetObj) {
      this.enrichFromRelatedObject(sourceIoc, targetObj, relationship.relationship_type);
    }
  }

  /**
   * Apply sighting to IoCs
   */
  private applySighting(iocs: IOC[], sighting: Sighting): void {
    const ioc = iocs.find(ioc => ioc.stixId === sighting.sighting_of_ref);
    if (!ioc) return;

    ioc.sightings.push({
      id: sighting.id,
      iocId: ioc.id,
      timestamp: sighting.last_seen || sighting.created,
      source: sighting.created_by_ref || 'unknown',
      sourceType: 'external',
      count: sighting.count || 1,
      confidence: sighting.confidence || 50,
    });

    // Update last seen
    if (sighting.last_seen && sighting.last_seen > ioc.lastSeen) {
      ioc.lastSeen = sighting.last_seen;
    }
  }

  /**
   * Enrich IoC from related STIX object
   */
  private enrichFromRelatedObject(ioc: IOC, obj: any, relationshipType: string): void {
    switch (obj.type) {
      case 'malware':
        const malware = obj as Malware;
        if (malware.name && !ioc.context.family) {
          ioc.context.family = malware.name;
        }
        if (malware.aliases) {
          ioc.context.aliases = [...(ioc.context.aliases || []), ...malware.aliases];
        }
        break;

      case 'threat-actor':
        const actor = obj as ThreatActor;
        if (actor.name) {
          ioc.attribution.actors = [...(ioc.attribution.actors || []), actor.name];
        }
        if (actor.aliases) {
          ioc.attribution.aliases = [...(ioc.attribution.aliases || []), ...actor.aliases];
        }
        break;

      case 'campaign':
        const campaign = obj as Campaign;
        if (campaign.name) {
          ioc.context.campaigns = [...(ioc.context.campaigns || []), campaign.name];
        }
        break;

      case 'intrusion-set':
        const intrusionSet = obj as IntrusionSet;
        if (intrusionSet.name) {
          ioc.attribution.groups = [...(ioc.attribution.groups || []), intrusionSet.name];
        }
        break;

      case 'attack-pattern':
        const attackPattern = obj as AttackPattern;
        // Extract MITRE ATT&CK ID from external references
        const mitreRef = attackPattern.external_references?.find(
          ref => ref.source_name === 'mitre-attack'
        );
        if (mitreRef?.external_id) {
          ioc.context.mitreTechniques.push(mitreRef.external_id);
        }
        break;
    }
  }

  /**
   * Helper methods
   */

  private isObservable(type: string): boolean {
    const observableTypes = [
      'ipv4-addr',
      'ipv6-addr',
      'domain-name',
      'url',
      'email-addr',
      'file',
      'mutex',
      'process',
      'software',
      'user-account',
    ];
    return observableTypes.includes(type);
  }

  private mapIndicatorTypes(types?: string[]): ThreatType[] {
    if (!types || types.length === 0) return [];

    const mapping: Record<string, ThreatType> = {
      'malicious-activity': 'malware',
      'malware': 'malware',
      'phishing': 'phishing',
      'c2': 'command_control',
      'command-and-control': 'command_control',
      'ransomware': 'ransomware',
      'apt': 'apt',
      'reconnaissance': 'reconnaissance',
      'lateral-movement': 'lateral_movement',
      'persistence': 'persistence',
      'exfiltration': 'exfiltration',
      'cryptomining': 'cryptomining',
      'botnet': 'botnet',
    };

    return types
      .map(t => mapping[t.toLowerCase()])
      .filter(t => t !== undefined);
  }

  private inferSeverity(indicator: Indicator): Severity {
    const confidence = indicator.confidence || 50;
    const hasHighValuePhases = indicator.kill_chain_phases?.some(
      kc => ['command_control', 'actions_objectives', 'exfiltration'].includes(kc.phase_name)
    );

    if (confidence >= 90 && hasHighValuePhases) return 'CRITICAL';
    if (confidence >= 75) return 'HIGH';
    if (confidence >= 50) return 'MEDIUM';
    if (confidence >= 25) return 'LOW';
    return 'INFO';
  }

  private mapConfidence(score?: number): Confidence {
    if (!score) return 'UNKNOWN';
    if (score >= 90) return 'CONFIRMED';
    if (score >= 70) return 'HIGH';
    if (score >= 50) return 'MEDIUM';
    if (score >= 30) return 'LOW';
    return 'UNKNOWN';
  }

  private mapTLP(markingRefs?: string[]): TLP {
    if (!markingRefs) return 'CLEAR';

    for (const ref of markingRefs) {
      if (ref.includes('tlp-red') || ref.includes('TLP:RED')) return 'RED';
      if (ref.includes('tlp-amber') || ref.includes('TLP:AMBER')) return 'AMBER';
      if (ref.includes('tlp-green') || ref.includes('TLP:GREEN')) return 'GREEN';
      if (ref.includes('tlp-white') || ref.includes('TLP:WHITE')) return 'WHITE';
      if (ref.includes('tlp-clear') || ref.includes('TLP:CLEAR')) return 'CLEAR';
    }

    return 'CLEAR';
  }

  private mapRelationshipType(stixType: string): IOCRelationship['relationshipType'] {
    const mapping: Record<string, IOCRelationship['relationshipType']> = {
      'related-to': 'related',
      'variant-of': 'variant',
      'derived-from': 'derived_from',
      'communicates-with': 'communicates_with',
      'downloads': 'downloads',
      'drops': 'drops',
      'uses': 'uses',
      'part-of': 'part_of',
      'child-of': 'child_of',
      'parent-of': 'parent_of',
      'similar-to': 'similar_to',
      'resolves-to': 'resolves_to',
      'belongs-to': 'belongs_to',
    };

    return mapping[stixType] || 'related';
  }
}
