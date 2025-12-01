import {
  ThreatActorProfile,
  ThreatActorCategory,
  ThreatActorMotivation,
  EmulationPlan,
  EmulationPhase,
  EmulationTechnique
} from '../types';

/**
 * APT Library - Threat Actor Profiles
 */
export class APTLibrary {
  private actors: Map<string, ThreatActorProfile> = new Map();

  constructor() {
    this.initializeActors();
  }

  private initializeActors(): void {
    // APT29 - Cozy Bear
    this.addActor({
      id: 'apt29',
      names: ['APT29', 'Cozy Bear', 'The Dukes', 'Nobelium'],
      category: ThreatActorCategory.APT,
      motivation: [ThreatActorMotivation.ESPIONAGE],
      attribution: {
        country: 'Russia',
        confidence: 'high',
        sponsorship: 'state-sponsored',
        evidence: ['Government attribution', 'Technical indicators']
      },
      capabilities: {
        sophistication: 'advanced',
        resources: 'extensive',
        persistence: 'persistent',
        stealthLevel: 'high',
        zeroDayUsage: true,
        customTooling: true
      },
      targetedSectors: ['Government', 'Think Tanks', 'Defense', 'Healthcare'],
      targetedRegions: ['United States', 'Europe', 'NATO members'],
      ttps: {
        tactics: [
          { tacticId: 'TA0001', name: 'Initial Access', frequency: 'always' },
          { tacticId: 'TA0003', name: 'Persistence', frequency: 'always' },
          { tacticId: 'TA0005', name: 'Defense Evasion', frequency: 'always' },
          { tacticId: 'TA0006', name: 'Credential Access', frequency: 'often' },
          { tacticId: 'TA0007', name: 'Discovery', frequency: 'always' },
          { tacticId: 'TA0008', name: 'Lateral Movement', frequency: 'often' },
          { tacticId: 'TA0009', name: 'Collection', frequency: 'always' },
          { tacticId: 'TA0010', name: 'Exfiltration', frequency: 'always' }
        ],
        techniques: [
          { techniqueId: 'T1566.001', name: 'Spearphishing Attachment', frequency: 'often', variants: [], tools: [] },
          { techniqueId: 'T1195.002', name: 'Supply Chain Compromise', frequency: 'sometimes', variants: ['SolarWinds'], tools: [] },
          { techniqueId: 'T1078', name: 'Valid Accounts', frequency: 'always', variants: [], tools: [] },
          { techniqueId: 'T1059.001', name: 'PowerShell', frequency: 'often', variants: [], tools: ['PowerShell Empire'] },
          { techniqueId: 'T1027', name: 'Obfuscated Files', frequency: 'always', variants: [], tools: [] },
          { techniqueId: 'T1003', name: 'OS Credential Dumping', frequency: 'often', variants: [], tools: ['Mimikatz'] },
          { techniqueId: 'T1071.001', name: 'Web Protocols', frequency: 'always', variants: [], tools: [] }
        ],
        procedures: [
          {
            id: 'proc_1',
            techniqueId: 'T1566.001',
            description: 'Send targeted phishing emails with malicious attachments',
            artifacts: ['Email headers', 'Attachment hashes']
          },
          {
            id: 'proc_2',
            techniqueId: 'T1059.001',
            description: 'Execute encoded PowerShell commands for C2',
            commands: ['powershell -enc [Base64]'],
            artifacts: ['PowerShell logs', 'Script block logging']
          }
        ],
        signatures: [
          {
            id: 'sig_1',
            type: 'network',
            description: 'WellMess C2 beacon pattern',
            pattern: 'HTTP POST with specific User-Agent',
            confidence: 'high'
          }
        ]
      },
      campaigns: [
        {
          id: 'camp_solarwinds',
          name: 'SolarWinds Supply Chain Attack',
          description: 'Supply chain compromise via SolarWinds Orion software',
          startDate: new Date('2020-03-01'),
          endDate: new Date('2020-12-13'),
          targetedSectors: ['Government', 'Technology'],
          targetedRegions: ['United States', 'Global'],
          objectives: ['Espionage', 'Intelligence Collection'],
          techniques: ['T1195.002', 'T1078', 'T1071.001'],
          malware: ['SUNBURST', 'TEARDROP'],
          iocs: []
        }
      ],
      infrastructure: {
        c2Patterns: [
          { protocol: 'HTTPS', port: 443, encryption: true, beaconInterval: 300, jitter: 20, description: 'Standard HTTPS C2' }
        ],
        domains: [{ pattern: 'typosquat', tlds: ['com', 'org'], registrationPattern: 'privacy protected' }],
        hosting: ['Cloud providers', 'Compromised infrastructure'],
        registrars: ['Various'],
        vpnUsage: true,
        torUsage: false,
        bulletproofHosting: false
      },
      tools: [
        { name: 'WellMess', type: 'custom', category: 'backdoor', description: 'Custom .NET backdoor', techniques: ['T1071.001'] },
        { name: 'WellMail', type: 'custom', category: 'backdoor', description: 'Email-based backdoor', techniques: ['T1071.003'] }
      ],
      malware: [
        { name: 'SUNBURST', type: 'backdoor', variants: [], capabilities: ['C2', 'File Operations'], techniques: ['T1195.002'] },
        { name: 'TEARDROP', type: 'loader', variants: [], capabilities: ['Memory-only execution'], techniques: ['T1055'] }
      ],
      aliases: ['YTTRIUM', 'Iron Hemlock', 'Dark Halo'],
      references: [
        { title: 'APT29 Profile', url: 'https://attack.mitre.org/groups/G0016/', source: 'MITRE', date: new Date() }
      ],
      firstSeen: new Date('2008-01-01'),
      lastSeen: new Date(),
      active: true
    });

    // APT28 - Fancy Bear
    this.addActor({
      id: 'apt28',
      names: ['APT28', 'Fancy Bear', 'Sofacy', 'Strontium'],
      category: ThreatActorCategory.APT,
      motivation: [ThreatActorMotivation.ESPIONAGE, ThreatActorMotivation.DISRUPTION],
      attribution: {
        country: 'Russia',
        confidence: 'high',
        sponsorship: 'state-sponsored',
        evidence: ['Technical indicators', 'Government attribution']
      },
      capabilities: {
        sophistication: 'advanced',
        resources: 'extensive',
        persistence: 'persistent',
        stealthLevel: 'medium',
        zeroDayUsage: true,
        customTooling: true
      },
      targetedSectors: ['Government', 'Military', 'Media', 'Political Organizations'],
      targetedRegions: ['NATO countries', 'Ukraine', 'Georgia'],
      ttps: {
        tactics: [
          { tacticId: 'TA0001', name: 'Initial Access', frequency: 'always' },
          { tacticId: 'TA0002', name: 'Execution', frequency: 'always' },
          { tacticId: 'TA0003', name: 'Persistence', frequency: 'always' },
          { tacticId: 'TA0006', name: 'Credential Access', frequency: 'always' }
        ],
        techniques: [
          { techniqueId: 'T1566.001', name: 'Spearphishing Attachment', frequency: 'always', variants: [], tools: [] },
          { techniqueId: 'T1566.002', name: 'Spearphishing Link', frequency: 'often', variants: [], tools: [] },
          { techniqueId: 'T1190', name: 'Exploit Public-Facing Application', frequency: 'sometimes', variants: [], tools: [] },
          { techniqueId: 'T1059.001', name: 'PowerShell', frequency: 'often', variants: [], tools: [] },
          { techniqueId: 'T1003', name: 'OS Credential Dumping', frequency: 'always', variants: [], tools: ['Mimikatz', 'XTunnel'] }
        ],
        procedures: [],
        signatures: []
      },
      campaigns: [],
      infrastructure: {
        c2Patterns: [
          { protocol: 'HTTPS', port: 443, encryption: true, description: 'Encrypted HTTPS C2' }
        ],
        domains: [{ pattern: 'typosquat', tlds: ['com', 'net'], registrationPattern: 'bulk registration' }],
        hosting: ['Compromised websites', 'Cloud providers'],
        registrars: ['Various'],
        vpnUsage: true,
        torUsage: true,
        bulletproofHosting: false
      },
      tools: [
        { name: 'X-Agent', type: 'custom', category: 'backdoor', description: 'Modular backdoor', techniques: ['T1071'] },
        { name: 'XTunnel', type: 'custom', category: 'utility', description: 'Network tunneling tool', techniques: ['T1090'] }
      ],
      malware: [
        { name: 'Seduploader', type: 'dropper', variants: [], capabilities: ['Reconnaissance', 'Download'], techniques: [] },
        { name: 'Zebrocy', type: 'backdoor', variants: ['Delphi', 'AutoIt', 'Go'], capabilities: ['C2', 'Screenshot'], techniques: [] }
      ],
      aliases: ['Sednit', 'Pawn Storm', 'TG-4127'],
      references: [],
      firstSeen: new Date('2004-01-01'),
      lastSeen: new Date(),
      active: true
    });

    // Lazarus Group
    this.addActor({
      id: 'lazarus',
      names: ['Lazarus Group', 'Hidden Cobra', 'Zinc'],
      category: ThreatActorCategory.NATION_STATE,
      motivation: [ThreatActorMotivation.FINANCIAL, ThreatActorMotivation.ESPIONAGE, ThreatActorMotivation.DESTRUCTION],
      attribution: {
        country: 'North Korea',
        confidence: 'high',
        sponsorship: 'state-sponsored',
        evidence: ['Technical indicators', 'Government attribution']
      },
      capabilities: {
        sophistication: 'advanced',
        resources: 'extensive',
        persistence: 'persistent',
        stealthLevel: 'medium',
        zeroDayUsage: true,
        customTooling: true
      },
      targetedSectors: ['Financial', 'Cryptocurrency', 'Defense', 'Entertainment'],
      targetedRegions: ['Global', 'South Korea', 'United States'],
      ttps: {
        tactics: [
          { tacticId: 'TA0001', name: 'Initial Access', frequency: 'always' },
          { tacticId: 'TA0002', name: 'Execution', frequency: 'always' },
          { tacticId: 'TA0040', name: 'Impact', frequency: 'often' }
        ],
        techniques: [
          { techniqueId: 'T1566.001', name: 'Spearphishing Attachment', frequency: 'always', variants: [], tools: [] },
          { techniqueId: 'T1059', name: 'Command and Scripting Interpreter', frequency: 'always', variants: [], tools: [] },
          { techniqueId: 'T1486', name: 'Data Encrypted for Impact', frequency: 'sometimes', variants: [], tools: [] }
        ],
        procedures: [],
        signatures: []
      },
      campaigns: [],
      infrastructure: {
        c2Patterns: [
          { protocol: 'HTTP', port: 80, encryption: false, description: 'Custom HTTP C2' },
          { protocol: 'HTTPS', port: 443, encryption: true, description: 'Encrypted C2' }
        ],
        domains: [{ pattern: 'compromised', tlds: ['com', 'net'], registrationPattern: 'varied' }],
        hosting: ['Compromised infrastructure', 'Bulletproof hosting'],
        registrars: ['Various'],
        vpnUsage: true,
        torUsage: true,
        bulletproofHosting: true
      },
      tools: [],
      malware: [
        { name: 'Manuscrypt', type: 'backdoor', variants: [], capabilities: ['C2', 'Data theft'], techniques: [] },
        { name: 'WannaCry', type: 'ransomware', variants: [], capabilities: ['Encryption', 'Propagation'], techniques: ['T1486'] }
      ],
      aliases: ['ZINC', 'Labyrinth Chollima', 'Whois Hacking Team'],
      references: [],
      firstSeen: new Date('2009-01-01'),
      lastSeen: new Date(),
      active: true
    });
  }

  private addActor(actor: ThreatActorProfile): void {
    this.actors.set(actor.id, actor);
  }

  getActor(id: string): ThreatActorProfile | undefined {
    return this.actors.get(id);
  }

  getActorByName(name: string): ThreatActorProfile | undefined {
    const nameLower = name.toLowerCase();
    for (const actor of this.actors.values()) {
      if (actor.names.some(n => n.toLowerCase() === nameLower) ||
          actor.aliases.some(a => a.toLowerCase() === nameLower)) {
        return actor;
      }
    }
    return undefined;
  }

  getAllActors(): ThreatActorProfile[] {
    return Array.from(this.actors.values());
  }

  getActorsByCategory(category: ThreatActorCategory): ThreatActorProfile[] {
    return Array.from(this.actors.values()).filter(a => a.category === category);
  }

  getActorsBySector(sector: string): ThreatActorProfile[] {
    const sectorLower = sector.toLowerCase();
    return Array.from(this.actors.values()).filter(a =>
      a.targetedSectors.some(s => s.toLowerCase().includes(sectorLower))
    );
  }

  getActorsByRegion(region: string): ThreatActorProfile[] {
    const regionLower = region.toLowerCase();
    return Array.from(this.actors.values()).filter(a =>
      a.targetedRegions.some(r => r.toLowerCase().includes(regionLower))
    );
  }

  searchActors(query: string): ThreatActorProfile[] {
    const queryLower = query.toLowerCase();
    return Array.from(this.actors.values()).filter(a =>
      a.names.some(n => n.toLowerCase().includes(queryLower)) ||
      a.aliases.some(al => al.toLowerCase().includes(queryLower)) ||
      a.targetedSectors.some(s => s.toLowerCase().includes(queryLower))
    );
  }
}

/**
 * Emulation Plan Generator
 */
export class EmulationPlanGenerator {
  private aptLibrary: APTLibrary;

  constructor() {
    this.aptLibrary = new APTLibrary();
  }

  /**
   * Generate emulation plan for threat actor
   */
  generatePlan(
    actorId: string,
    objectives: string[],
    scope: {
      targetSystems: string[];
      targetNetworks: string[];
      excludedSystems: string[];
      duration: number; // days
    }
  ): EmulationPlan {
    const actor = this.aptLibrary.getActor(actorId);
    if (!actor) throw new Error(`Actor not found: ${actorId}`);

    // Build phases from actor TTPs
    const phases = this.buildPhases(actor, scope.duration);

    // Build technique list
    const techniques = this.buildTechniques(actor);

    // Generate timeline
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + scope.duration * 24 * 60 * 60 * 1000);

    // Create safety checks
    const safetyChecks = this.createSafetyChecks();

    // Create rollback plan
    const rollback = this.createRollbackPlan();

    return {
      id: this.generateId(),
      name: `${actor.names[0]} Emulation`,
      description: `Emulation plan based on ${actor.names[0]} TTPs`,
      threatActor: actorId,
      objectives,
      phases,
      techniques,
      timeline: {
        startDate,
        endDate,
        phases: phases.map((p, idx) => ({
          phaseId: p.id,
          start: new Date(startDate.getTime() + (idx * scope.duration / phases.length) * 24 * 60 * 60 * 1000),
          end: new Date(startDate.getTime() + ((idx + 1) * scope.duration / phases.length) * 24 * 60 * 60 * 1000)
        }))
      },
      scope: {
        targetSystems: scope.targetSystems,
        targetNetworks: scope.targetNetworks,
        excludedSystems: scope.excludedSystems,
        excludedNetworks: [],
        authorization: 'Required before execution'
      },
      safetyChecks,
      rollback,
      metrics: {
        techniquesExecuted: 0,
        techniquesSuccessful: 0,
        detectionsCaused: 0,
        meanTimeToDetect: 0,
        coverageScore: 0
      }
    };
  }

  private buildPhases(actor: ThreatActorProfile, durationDays: number): EmulationPhase[] {
    const phases: EmulationPhase[] = [];
    const phaseDuration = durationDays / 5;

    // Initial Access Phase
    phases.push({
      id: 'phase_1',
      name: 'Initial Access',
      order: 1,
      techniques: actor.ttps.techniques
        .filter(t => t.techniqueId.startsWith('T1566') || t.techniqueId === 'T1190')
        .map(t => t.techniqueId),
      duration: phaseDuration,
      checkpoints: ['Initial compromise achieved', 'Foothold established']
    });

    // Execution & Persistence Phase
    phases.push({
      id: 'phase_2',
      name: 'Execution & Persistence',
      order: 2,
      techniques: actor.ttps.techniques
        .filter(t => t.techniqueId.startsWith('T1059') || t.techniqueId.startsWith('T1547'))
        .map(t => t.techniqueId),
      duration: phaseDuration,
      checkpoints: ['Persistence mechanism installed', 'Execution confirmed']
    });

    // Credential Access & Discovery
    phases.push({
      id: 'phase_3',
      name: 'Credential Access & Discovery',
      order: 3,
      techniques: actor.ttps.techniques
        .filter(t => t.techniqueId.startsWith('T1003') || t.techniqueId.startsWith('T1087'))
        .map(t => t.techniqueId),
      duration: phaseDuration,
      checkpoints: ['Credentials obtained', 'Environment mapped']
    });

    // Lateral Movement
    phases.push({
      id: 'phase_4',
      name: 'Lateral Movement',
      order: 4,
      techniques: actor.ttps.techniques
        .filter(t => t.techniqueId.startsWith('T1021') || t.techniqueId === 'T1078')
        .map(t => t.techniqueId),
      duration: phaseDuration,
      checkpoints: ['Access to additional systems', 'Network traversal confirmed']
    });

    // Collection & Exfiltration
    phases.push({
      id: 'phase_5',
      name: 'Collection & Exfiltration',
      order: 5,
      techniques: actor.ttps.techniques
        .filter(t => t.techniqueId.startsWith('T1005') || t.techniqueId.startsWith('T1041'))
        .map(t => t.techniqueId),
      duration: phaseDuration,
      checkpoints: ['Data collected', 'Exfiltration simulated']
    });

    return phases;
  }

  private buildTechniques(actor: ThreatActorProfile): EmulationTechnique[] {
    return actor.ttps.techniques.map(t => ({
      techniqueId: t.techniqueId,
      name: t.name,
      procedure: actor.ttps.procedures.find(p => p.techniqueId === t.techniqueId)?.description || 'Standard procedure',
      tools: t.tools,
      commands: actor.ttps.procedures.find(p => p.techniqueId === t.techniqueId)?.commands || [],
      expectedOutcome: `Successful execution of ${t.name}`,
      detectionOpportunities: [`Monitor for ${t.name} indicators`],
      safeMode: true
    }));
  }

  private createSafetyChecks(): Array<{ id: string; description: string; condition: string; action: 'pause' | 'abort' | 'notify' }> {
    return [
      {
        id: 'check_1',
        description: 'Production system accessed',
        condition: 'Target system is in production scope',
        action: 'abort'
      },
      {
        id: 'check_2',
        description: 'Unexpected system impact',
        condition: 'System availability degraded',
        action: 'pause'
      },
      {
        id: 'check_3',
        description: 'Out of scope detection',
        condition: 'Activity detected outside authorized scope',
        action: 'abort'
      },
      {
        id: 'check_4',
        description: 'Time boundary exceeded',
        condition: 'Exercise duration exceeded planned window',
        action: 'notify'
      }
    ];
  }

  private createRollbackPlan(): { steps: string[]; timeEstimate: number; contacts: string[] } {
    return {
      steps: [
        'Stop all active attack simulations',
        'Remove persistence mechanisms',
        'Delete created files and registry entries',
        'Restore modified configurations',
        'Verify system integrity',
        'Document all changes made'
      ],
      timeEstimate: 60, // minutes
      contacts: ['Red Team Lead', 'Blue Team Lead', 'IT Security']
    };
  }

  private generateId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
