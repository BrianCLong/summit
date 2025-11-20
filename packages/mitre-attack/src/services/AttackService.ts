/**
 * MITRE ATT&CK Service
 * Provides access to MITRE ATT&CK framework data and analysis capabilities
 */

import axios from 'axios';
import NodeCache from 'node-cache';
import {
  AttackMatrix,
  AttackTactic,
  AttackTechnique,
  AttackGroup,
  AttackSoftware,
  Mitigation,
  TechniqueFilter,
  GroupFilter,
  SoftwareFilter,
  TTPFingerprint,
  ThreatActorProfile,
  CoverageMatrix,
  TacticCoverage,
} from '../types/attack.js';

export class AttackService {
  private cache: NodeCache;
  private matrix: AttackMatrix | null = null;
  private techniques: Map<string, AttackTechnique> = new Map();
  private tactics: Map<string, AttackTactic> = new Map();
  private groups: Map<string, AttackGroup> = new Map();
  private software: Map<string, AttackSoftware> = new Map();
  private mitigations: Map<string, Mitigation> = new Map();
  private loaded: boolean = false;

  private static readonly ATTACK_STIX_URL =
    'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json';

  constructor() {
    this.cache = new NodeCache({ stdTTL: 86400 }); // 24 hour cache
  }

  /**
   * Initialize and load ATT&CK data
   */
  async initialize(): Promise<void> {
    if (this.loaded) return;

    console.log('[MITRE_ATTACK] Loading ATT&CK framework data...');

    try {
      await this.loadAttackData();
      this.loaded = true;
      console.log('[MITRE_ATTACK] Successfully loaded ATT&CK framework data');
      console.log(`  - Techniques: ${this.techniques.size}`);
      console.log(`  - Tactics: ${this.tactics.size}`);
      console.log(`  - Groups: ${this.groups.size}`);
      console.log(`  - Software: ${this.software.size}`);
      console.log(`  - Mitigations: ${this.mitigations.size}`);
    } catch (error) {
      console.error('[MITRE_ATTACK] Failed to load ATT&CK data:', error);
      throw error;
    }
  }

  /**
   * Load ATT&CK data from STIX bundle
   */
  private async loadAttackData(): Promise<void> {
    const response = await axios.get(this.constructor.ATTACK_STIX_URL as string, {
      timeout: 30000,
    });

    const stixBundle = response.data;
    const objects = stixBundle.objects;

    // Process all objects
    for (const obj of objects) {
      switch (obj.type) {
        case 'attack-pattern':
          this.processTechnique(obj);
          break;
        case 'intrusion-set':
          this.processGroup(obj);
          break;
        case 'malware':
        case 'tool':
          this.processSoftware(obj);
          break;
        case 'course-of-action':
          this.processMitigation(obj);
          break;
        case 'x-mitre-tactic':
          this.processTactic(obj);
          break;
      }
    }

    // Build relationships
    for (const obj of objects) {
      if (obj.type === 'relationship') {
        this.processRelationship(obj);
      }
    }

    // Build matrix
    this.buildMatrix();
  }

  /**
   * Process STIX technique object
   */
  private processTechnique(obj: any): void {
    const isSubtechnique = obj.x_mitre_is_subtechnique || false;
    const mitreId = obj.external_references?.find((ref: any) => ref.source_name === 'mitre-attack')?.external_id;

    if (!mitreId) return;

    const technique: AttackTechnique = {
      id: mitreId,
      name: obj.name,
      description: obj.description || '',
      tactics: obj.kill_chain_phases?.map((kc: any) => kc.phase_name) || [],
      platforms: obj.x_mitre_platforms || [],
      permissions: obj.x_mitre_permissions_required || [],
      dataSource: obj.x_mitre_data_sources || [],
      detection: obj.x_mitre_detection || '',
      url: obj.external_references?.find((ref: any) => ref.source_name === 'mitre-attack')?.url || '',
      isSubtechnique,
      created: obj.created,
      modified: obj.modified,
      version: obj.x_mitre_version,
      externalReferences: obj.external_references?.map((ref: any) => ({
        sourceName: ref.source_name,
        externalId: ref.external_id,
        url: ref.url,
        description: ref.description,
      })) || [],
      subtechniques: [],
      mitigations: [],
      groups: [],
      software: [],
    };

    this.techniques.set(mitreId, technique);
  }

  /**
   * Process STIX group object
   */
  private processGroup(obj: any): void {
    const mitreId = obj.external_references?.find((ref: any) => ref.source_name === 'mitre-attack')?.external_id;

    if (!mitreId) return;

    const group: AttackGroup = {
      id: mitreId,
      name: obj.name,
      description: obj.description || '',
      aliases: obj.aliases || [],
      techniques: [],
      software: [],
      created: obj.created,
      modified: obj.modified,
      externalReferences: obj.external_references?.map((ref: any) => ({
        sourceName: ref.source_name,
        externalId: ref.external_id,
        url: ref.url,
        description: ref.description,
      })) || [],
    };

    this.groups.set(mitreId, group);
  }

  /**
   * Process STIX software object
   */
  private processSoftware(obj: any): void {
    const mitreId = obj.external_references?.find((ref: any) => ref.source_name === 'mitre-attack')?.external_id;

    if (!mitreId) return;

    const software: AttackSoftware = {
      id: mitreId,
      name: obj.name,
      description: obj.description || '',
      type: obj.type === 'malware' ? 'malware' : 'tool',
      aliases: obj.x_mitre_aliases || [],
      platforms: obj.x_mitre_platforms || [],
      techniques: [],
      groups: [],
      labels: obj.labels || [],
      created: obj.created,
      modified: obj.modified,
      externalReferences: obj.external_references?.map((ref: any) => ({
        sourceName: ref.source_name,
        externalId: ref.external_id,
        url: ref.url,
        description: ref.description,
      })) || [],
    };

    this.software.set(mitreId, software);
  }

  /**
   * Process STIX mitigation object
   */
  private processMitigation(obj: any): void {
    const mitreId = obj.external_references?.find((ref: any) => ref.source_name === 'mitre-attack')?.external_id;

    if (!mitreId) return;

    const mitigation: Mitigation = {
      id: mitreId,
      name: obj.name,
      description: obj.description || '',
      techniques: [],
      created: obj.created,
      modified: obj.modified,
      externalReferences: obj.external_references?.map((ref: any) => ({
        sourceName: ref.source_name,
        externalId: ref.external_id,
        url: ref.url,
        description: ref.description,
      })) || [],
    };

    this.mitigations.set(mitreId, mitigation);
  }

  /**
   * Process STIX tactic object
   */
  private processTactic(obj: any): void {
    const mitreId = obj.x_mitre_shortname;

    if (!mitreId) return;

    const tactic: AttackTactic = {
      id: mitreId,
      name: obj.name,
      description: obj.description || '',
      shortName: obj.x_mitre_shortname,
      techniques: [],
      externalReferences: obj.external_references?.map((ref: any) => ({
        sourceName: ref.source_name,
        externalId: ref.external_id,
        url: ref.url,
        description: ref.description,
      })) || [],
    };

    this.tactics.set(mitreId, tactic);
  }

  /**
   * Process STIX relationship
   */
  private processRelationship(obj: any): void {
    const sourceType = obj.source_ref?.split('--')[0];
    const targetType = obj.target_ref?.split('--')[0];
    const relationshipType = obj.relationship_type;

    // Map STIX IDs to MITRE IDs (simplified - in production would need full mapping)
    const sourceId = this.findMitreId(obj.source_ref);
    const targetId = this.findMitreId(obj.target_ref);

    if (!sourceId || !targetId) return;

    if (relationshipType === 'uses') {
      if (sourceType === 'intrusion-set' && targetType === 'attack-pattern') {
        const group = this.groups.get(sourceId);
        const technique = this.techniques.get(targetId);
        if (group && technique) {
          group.techniques.push(targetId);
          technique.groups?.push(sourceId);
        }
      } else if (sourceType === 'intrusion-set' && (targetType === 'malware' || targetType === 'tool')) {
        const group = this.groups.get(sourceId);
        const software = this.software.get(targetId);
        if (group && software) {
          group.software?.push(targetId);
          software.groups?.push(sourceId);
        }
      } else if ((sourceType === 'malware' || sourceType === 'tool') && targetType === 'attack-pattern') {
        const software = this.software.get(sourceId);
        const technique = this.techniques.get(targetId);
        if (software && technique) {
          software.techniques.push(targetId);
          technique.software?.push(sourceId);
        }
      }
    } else if (relationshipType === 'mitigates') {
      if (sourceType === 'course-of-action' && targetType === 'attack-pattern') {
        const mitigation = this.mitigations.get(sourceId);
        const technique = this.techniques.get(targetId);
        if (mitigation && technique) {
          mitigation.techniques.push(targetId);
          technique.mitigations?.push(mitigation);
        }
      }
    } else if (relationshipType === 'subtechnique-of') {
      const subtechnique = this.techniques.get(sourceId);
      const parent = this.techniques.get(targetId);
      if (subtechnique && parent) {
        if (!parent.subtechniques) parent.subtechniques = [];
        parent.subtechniques.push(subtechnique as any);
      }
    }
  }

  /**
   * Find MITRE ID from STIX ID (simplified)
   */
  private findMitreId(stixId: string): string | null {
    // In production, maintain a full mapping of STIX IDs to MITRE IDs
    // For now, try to find by STIX ID prefix
    for (const [mitreId, technique] of this.techniques) {
      if (stixId.includes(mitreId.toLowerCase().replace('.', ''))) {
        return mitreId;
      }
    }
    for (const [mitreId, group] of this.groups) {
      if (stixId.includes(mitreId.toLowerCase().replace('.', ''))) {
        return mitreId;
      }
    }
    for (const [mitreId, software] of this.software) {
      if (stixId.includes(mitreId.toLowerCase().replace('.', ''))) {
        return mitreId;
      }
    }
    for (const [mitreId, mitigation] of this.mitigations) {
      if (stixId.includes(mitreId.toLowerCase().replace('.', ''))) {
        return mitreId;
      }
    }
    return null;
  }

  /**
   * Build ATT&CK matrix
   */
  private buildMatrix(): void {
    const tactics = Array.from(this.tactics.values());

    // Associate techniques with tactics
    for (const tactic of tactics) {
      tactic.techniques = Array.from(this.techniques.values())
        .filter(t => t.tactics.includes(tactic.shortName))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    this.matrix = {
      id: 'enterprise-attack',
      name: 'Enterprise ATT&CK',
      description: 'MITRE ATT&CK Enterprise Matrix',
      tactics,
      version: '14.0', // Update as needed
    };
  }

  /**
   * Get all techniques
   */
  getTechniques(filter?: TechniqueFilter): AttackTechnique[] {
    let techniques = Array.from(this.techniques.values());

    if (filter) {
      if (filter.tactics && filter.tactics.length > 0) {
        techniques = techniques.filter(t =>
          t.tactics.some(tactic => filter.tactics!.includes(tactic))
        );
      }

      if (filter.platforms && filter.platforms.length > 0) {
        techniques = techniques.filter(t =>
          t.platforms.some(platform => filter.platforms!.includes(platform))
        );
      }

      if (filter.groups && filter.groups.length > 0) {
        techniques = techniques.filter(t =>
          t.groups?.some(group => filter.groups!.includes(group))
        );
      }

      if (filter.software && filter.software.length > 0) {
        techniques = techniques.filter(t =>
          t.software?.some(software => filter.software!.includes(software))
        );
      }

      if (filter.isSubtechnique !== undefined) {
        techniques = techniques.filter(t => t.isSubtechnique === filter.isSubtechnique);
      }

      if (filter.search) {
        const search = filter.search.toLowerCase();
        techniques = techniques.filter(t =>
          t.id.toLowerCase().includes(search) ||
          t.name.toLowerCase().includes(search) ||
          t.description.toLowerCase().includes(search)
        );
      }
    }

    return techniques;
  }

  /**
   * Get technique by ID
   */
  getTechnique(id: string): AttackTechnique | undefined {
    return this.techniques.get(id);
  }

  /**
   * Get all groups
   */
  getGroups(filter?: GroupFilter): AttackGroup[] {
    let groups = Array.from(this.groups.values());

    if (filter) {
      if (filter.techniques && filter.techniques.length > 0) {
        groups = groups.filter(g =>
          g.techniques.some(t => filter.techniques!.includes(t))
        );
      }

      if (filter.software && filter.software.length > 0) {
        groups = groups.filter(g =>
          g.software?.some(s => filter.software!.includes(s))
        );
      }

      if (filter.search) {
        const search = filter.search.toLowerCase();
        groups = groups.filter(g =>
          g.id.toLowerCase().includes(search) ||
          g.name.toLowerCase().includes(search) ||
          g.description.toLowerCase().includes(search) ||
          g.aliases?.some(a => a.toLowerCase().includes(search))
        );
      }
    }

    return groups;
  }

  /**
   * Get group by ID
   */
  getGroup(id: string): AttackGroup | undefined {
    return this.groups.get(id);
  }

  /**
   * Get all software
   */
  getSoftware(filter?: SoftwareFilter): AttackSoftware[] {
    let software = Array.from(this.software.values());

    if (filter) {
      if (filter.type && filter.type.length > 0) {
        software = software.filter(s => filter.type!.includes(s.type));
      }

      if (filter.platforms && filter.platforms.length > 0) {
        software = software.filter(s =>
          s.platforms.some(p => filter.platforms!.includes(p))
        );
      }

      if (filter.groups && filter.groups.length > 0) {
        software = software.filter(s =>
          s.groups?.some(g => filter.groups!.includes(g))
        );
      }

      if (filter.techniques && filter.techniques.length > 0) {
        software = software.filter(s =>
          s.techniques.some(t => filter.techniques!.includes(t))
        );
      }

      if (filter.search) {
        const search = filter.search.toLowerCase();
        software = software.filter(s =>
          s.id.toLowerCase().includes(search) ||
          s.name.toLowerCase().includes(search) ||
          s.description.toLowerCase().includes(search) ||
          s.aliases?.some(a => a.toLowerCase().includes(search))
        );
      }
    }

    return software;
  }

  /**
   * Get software by ID
   */
  getSoftwareById(id: string): AttackSoftware | undefined {
    return this.software.get(id);
  }

  /**
   * Get ATT&CK matrix
   */
  getMatrix(): AttackMatrix | null {
    return this.matrix;
  }

  /**
   * Generate TTP fingerprint from techniques
   */
  generateTTPFingerprint(techniqueIds: string[]): TTPFingerprint {
    const techniques = techniqueIds
      .map(id => this.techniques.get(id))
      .filter(t => t !== undefined) as AttackTechnique[];

    // Extract unique tactics
    const tactics = Array.from(new Set(techniques.flatMap(t => t.tactics)));

    // Find groups that use these techniques
    const groupMatches = new Map<string, number>();
    for (const group of this.groups.values()) {
      const matchCount = techniqueIds.filter(tid => group.techniques.includes(tid)).length;
      if (matchCount > 0) {
        groupMatches.set(group.id, matchCount);
      }
    }

    // Sort groups by match count
    const sortedGroups = Array.from(groupMatches.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => this.groups.get(id)!)
      .filter(g => g !== undefined);

    // Find software that uses these techniques
    const softwareMatches = new Map<string, number>();
    for (const sw of this.software.values()) {
      const matchCount = techniqueIds.filter(tid => sw.techniques.includes(tid)).length;
      if (matchCount > 0) {
        softwareMatches.set(sw.id, matchCount);
      }
    }

    const sortedSoftware = Array.from(softwareMatches.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => this.software.get(id)!)
      .filter(s => s !== undefined);

    // Calculate confidence based on match quality
    const confidence = sortedGroups.length > 0
      ? Math.min(100, (groupMatches.get(sortedGroups[0].id)! / techniqueIds.length) * 100)
      : 0;

    const reasoning: string[] = [];
    if (sortedGroups.length > 0) {
      reasoning.push(`Matched ${groupMatches.get(sortedGroups[0].id)} techniques with ${sortedGroups[0].name}`);
    }
    if (sortedSoftware.length > 0) {
      reasoning.push(`Consistent with ${sortedSoftware[0].name} usage patterns`);
    }

    return {
      techniques: techniqueIds,
      tactics,
      confidence,
      groups: sortedGroups.slice(0, 5),
      software: sortedSoftware.slice(0, 5),
      reasoning,
    };
  }

  /**
   * Build threat actor profile
   */
  buildThreatActorProfile(groupIds: string[]): ThreatActorProfile {
    const primaryGroups = groupIds
      .map(id => this.groups.get(id))
      .filter(g => g !== undefined) as AttackGroup[];

    // Collect all techniques used by these groups
    const techniqueIds = Array.from(new Set(primaryGroups.flatMap(g => g.techniques)));
    const techniques = techniqueIds
      .map(id => this.techniques.get(id))
      .filter(t => t !== undefined) as AttackTechnique[];

    // Collect all software used by these groups
    const softwareIds = Array.from(new Set(primaryGroups.flatMap(g => g.software || [])));
    const software = softwareIds
      .map(id => this.software.get(id))
      .filter(s => s !== undefined) as AttackSoftware[];

    // Generate TTP fingerprint
    const ttpFingerprint = this.generateTTPFingerprint(techniqueIds);

    // Find related groups with similar TTPs
    const relatedGroups = this.findRelatedGroups(techniqueIds).filter(
      g => !groupIds.includes(g.id)
    );

    return {
      primaryGroups,
      relatedGroups: relatedGroups.slice(0, 5),
      techniques,
      software,
      campaigns: [],
      ttpFingerprint,
      confidence: ttpFingerprint.confidence,
    };
  }

  /**
   * Find groups with similar TTPs
   */
  private findRelatedGroups(techniqueIds: string[]): AttackGroup[] {
    const matches = new Map<string, number>();

    for (const group of this.groups.values()) {
      const matchCount = techniqueIds.filter(tid => group.techniques.includes(tid)).length;
      if (matchCount > 0) {
        matches.set(group.id, matchCount);
      }
    }

    return Array.from(matches.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => this.groups.get(id)!)
      .filter(g => g !== undefined);
  }

  /**
   * Generate coverage matrix
   */
  generateCoverageMatrix(coveredTechniqueIds: string[]): CoverageMatrix {
    const tactics = Array.from(this.tactics.values());
    const tacticCoverages: TacticCoverage[] = [];

    let totalTechniques = 0;
    let totalCovered = 0;

    for (const tactic of tactics) {
      const techniques = Array.from(this.techniques.values())
        .filter(t => t.tactics.includes(tactic.shortName) && !t.isSubtechnique);

      const techniqueCoverages = techniques.map(technique => ({
        technique,
        covered: coveredTechniqueIds.includes(technique.id),
        detectionCount: 1,
        mitigationCount: technique.mitigations?.length || 0,
      }));

      const coveredCount = techniqueCoverages.filter(tc => tc.covered).length;

      tacticCoverages.push({
        tactic,
        totalTechniques: techniques.length,
        coveredTechniques: coveredCount,
        coveragePercentage: techniques.length > 0 ? (coveredCount / techniques.length) * 100 : 0,
        techniques: techniqueCoverages,
      });

      totalTechniques += techniques.length;
      totalCovered += coveredCount;
    }

    return {
      tactics: tacticCoverages,
      totalTechniques,
      coveredTechniques: totalCovered,
      coveragePercentage: totalTechniques > 0 ? (totalCovered / totalTechniques) * 100 : 0,
    };
  }
}
