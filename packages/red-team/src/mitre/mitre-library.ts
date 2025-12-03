import {
  AttackTechnique,
  MITRETactic,
  KillChainPhase,
  AttackScenario,
  TargetEnvironment,
  ScenarioTimeline,
  SuccessCriterion
} from '../types';

/**
 * MITRE ATT&CK Technique Library
 */
export class MITRELibrary {
  private techniques: Map<string, AttackTechnique> = new Map();

  constructor() {
    this.initializeTechniques();
  }

  private initializeTechniques(): void {
    // Initial Access techniques
    this.addTechnique({
      id: 'T1566',
      name: 'Phishing',
      tactic: MITRETactic.INITIAL_ACCESS,
      description: 'Adversaries may send phishing messages to gain access to victim systems.',
      platforms: ['Windows', 'macOS', 'Linux'],
      dataSources: ['Application Log', 'Network Traffic'],
      detection: 'Monitor for suspicious email attachments and links',
      mitigation: 'User training, email filtering, sandboxing'
    });

    this.addTechnique({
      id: 'T1566.001',
      name: 'Spearphishing Attachment',
      tactic: MITRETactic.INITIAL_ACCESS,
      description: 'Adversaries send spearphishing emails with malicious attachment.',
      platforms: ['Windows', 'macOS', 'Linux'],
      dataSources: ['File', 'Network Traffic', 'Process'],
      detection: 'Monitor for unusual file types in email attachments',
      mitigation: 'Antivirus, user awareness training'
    });

    this.addTechnique({
      id: 'T1190',
      name: 'Exploit Public-Facing Application',
      tactic: MITRETactic.INITIAL_ACCESS,
      description: 'Adversaries may exploit vulnerabilities in internet-facing systems.',
      platforms: ['Windows', 'Linux', 'macOS', 'Network'],
      dataSources: ['Application Log', 'Network Traffic'],
      detection: 'Monitor application logs for exploitation attempts',
      mitigation: 'Regular patching, WAF, vulnerability scanning'
    });

    // Execution techniques
    this.addTechnique({
      id: 'T1059',
      name: 'Command and Scripting Interpreter',
      tactic: MITRETactic.EXECUTION,
      description: 'Adversaries may abuse command and script interpreters to execute commands.',
      platforms: ['Windows', 'macOS', 'Linux'],
      permissions: ['User'],
      dataSources: ['Command', 'Process', 'Script'],
      detection: 'Monitor command-line arguments and script execution',
      mitigation: 'Disable or restrict scripting, application whitelisting'
    });

    this.addTechnique({
      id: 'T1059.001',
      name: 'PowerShell',
      tactic: MITRETactic.EXECUTION,
      description: 'Adversaries may abuse PowerShell commands and scripts for execution.',
      platforms: ['Windows'],
      permissions: ['User', 'Administrator'],
      dataSources: ['Command', 'Module', 'Process', 'Script'],
      detection: 'Enable PowerShell logging, monitor for suspicious cmdlets',
      mitigation: 'Constrained Language Mode, Script Block Logging'
    });

    // Persistence techniques
    this.addTechnique({
      id: 'T1547',
      name: 'Boot or Logon Autostart Execution',
      tactic: MITRETactic.PERSISTENCE,
      description: 'Adversaries configure system settings to run programs at startup.',
      platforms: ['Windows', 'macOS', 'Linux'],
      permissions: ['User', 'Administrator'],
      dataSources: ['Command', 'File', 'Process', 'Windows Registry'],
      detection: 'Monitor startup locations and registry keys',
      mitigation: 'Restrict write access to startup locations'
    });

    this.addTechnique({
      id: 'T1053',
      name: 'Scheduled Task/Job',
      tactic: MITRETactic.PERSISTENCE,
      description: 'Adversaries may create scheduled tasks to execute malicious code.',
      platforms: ['Windows', 'Linux', 'macOS'],
      permissions: ['Administrator', 'SYSTEM', 'User'],
      dataSources: ['Command', 'File', 'Process', 'Scheduled Job'],
      detection: 'Monitor task scheduler logs and cron jobs',
      mitigation: 'Restrict permissions for task scheduling'
    });

    // Privilege Escalation
    this.addTechnique({
      id: 'T1068',
      name: 'Exploitation for Privilege Escalation',
      tactic: MITRETactic.PRIVILEGE_ESCALATION,
      description: 'Adversaries exploit software vulnerabilities to elevate privileges.',
      platforms: ['Windows', 'Linux', 'macOS'],
      permissions: ['User'],
      dataSources: ['Process'],
      detection: 'Monitor for exploitation attempts and unusual process behavior',
      mitigation: 'Regular patching, exploit protection features'
    });

    // Defense Evasion
    this.addTechnique({
      id: 'T1070',
      name: 'Indicator Removal',
      tactic: MITRETactic.DEFENSE_EVASION,
      description: 'Adversaries may delete or modify artifacts to remove evidence.',
      platforms: ['Windows', 'Linux', 'macOS'],
      dataSources: ['Command', 'File', 'Process', 'Windows Registry'],
      detection: 'Monitor for file deletion and log clearing',
      mitigation: 'Centralized logging, file integrity monitoring'
    });

    this.addTechnique({
      id: 'T1027',
      name: 'Obfuscated Files or Information',
      tactic: MITRETactic.DEFENSE_EVASION,
      description: 'Adversaries may obfuscate content to evade detection.',
      platforms: ['Windows', 'Linux', 'macOS'],
      dataSources: ['Command', 'File', 'Process', 'Script'],
      detection: 'Deobfuscation tools, behavioral analysis',
      mitigation: 'Antivirus with heuristic detection'
    });

    // Credential Access
    this.addTechnique({
      id: 'T1003',
      name: 'OS Credential Dumping',
      tactic: MITRETactic.CREDENTIAL_ACCESS,
      description: 'Adversaries may dump credentials from OS credential storage.',
      platforms: ['Windows', 'Linux', 'macOS'],
      permissions: ['Administrator', 'SYSTEM'],
      dataSources: ['Command', 'File', 'Process'],
      detection: 'Monitor for credential dumping tools (mimikatz, etc.)',
      mitigation: 'Credential Guard, restrict LSASS access'
    });

    // Discovery
    this.addTechnique({
      id: 'T1087',
      name: 'Account Discovery',
      tactic: MITRETactic.DISCOVERY,
      description: 'Adversaries may enumerate accounts on a system or domain.',
      platforms: ['Windows', 'Linux', 'macOS'],
      permissions: ['User'],
      dataSources: ['Command', 'Process'],
      detection: 'Monitor for enumeration commands',
      mitigation: 'Limit account visibility'
    });

    // Lateral Movement
    this.addTechnique({
      id: 'T1021',
      name: 'Remote Services',
      tactic: MITRETactic.LATERAL_MOVEMENT,
      description: 'Adversaries may use remote services to move laterally.',
      platforms: ['Windows', 'Linux', 'macOS'],
      dataSources: ['Command', 'Logon Session', 'Network Traffic', 'Process'],
      detection: 'Monitor remote service usage',
      mitigation: 'Network segmentation, MFA'
    });

    // Collection
    this.addTechnique({
      id: 'T1005',
      name: 'Data from Local System',
      tactic: MITRETactic.COLLECTION,
      description: 'Adversaries may search and collect sensitive data from local system.',
      platforms: ['Windows', 'Linux', 'macOS'],
      dataSources: ['Command', 'File', 'Process'],
      detection: 'Monitor file access patterns',
      mitigation: 'Data loss prevention, access controls'
    });

    // Command and Control
    this.addTechnique({
      id: 'T1071',
      name: 'Application Layer Protocol',
      tactic: MITRETactic.COMMAND_AND_CONTROL,
      description: 'Adversaries communicate using application layer protocols.',
      platforms: ['Windows', 'Linux', 'macOS'],
      dataSources: ['Network Traffic'],
      detection: 'Monitor network traffic for anomalies',
      mitigation: 'Network filtering, SSL inspection'
    });

    // Exfiltration
    this.addTechnique({
      id: 'T1041',
      name: 'Exfiltration Over C2 Channel',
      tactic: MITRETactic.EXFILTRATION,
      description: 'Adversaries may exfiltrate data over existing C2 channel.',
      platforms: ['Windows', 'Linux', 'macOS'],
      dataSources: ['Command', 'File', 'Network Traffic'],
      detection: 'Monitor outbound data transfers',
      mitigation: 'DLP, network monitoring'
    });

    // Impact
    this.addTechnique({
      id: 'T1486',
      name: 'Data Encrypted for Impact',
      tactic: MITRETactic.IMPACT,
      description: 'Adversaries may encrypt data to disrupt availability.',
      platforms: ['Windows', 'Linux', 'macOS'],
      dataSources: ['Command', 'File', 'Process'],
      detection: 'Monitor for mass file encryption',
      mitigation: 'Backups, endpoint protection'
    });
  }

  private addTechnique(technique: AttackTechnique): void {
    this.techniques.set(technique.id, technique);
  }

  getTechnique(id: string): AttackTechnique | undefined {
    return this.techniques.get(id);
  }

  getTechniquesByTactic(tactic: MITRETactic): AttackTechnique[] {
    return Array.from(this.techniques.values()).filter(t => t.tactic === tactic);
  }

  getAllTechniques(): AttackTechnique[] {
    return Array.from(this.techniques.values());
  }

  searchTechniques(query: string): AttackTechnique[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.techniques.values()).filter(
      t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.id.toLowerCase().includes(lowerQuery)
    );
  }
}

/**
 * Attack Scenario Generator
 */
export class ScenarioGenerator {
  private mitreLibrary: MITRELibrary;

  constructor() {
    this.mitreLibrary = new MITRELibrary();
  }

  /**
   * Generate attack scenario based on objectives
   */
  generateScenario(
    name: string,
    objectives: string[],
    targetEnvironment: TargetEnvironment,
    options: {
      sophistication?: 'low' | 'medium' | 'high';
      stealthLevel?: 'low' | 'medium' | 'high';
      duration?: number;
    } = {}
  ): AttackScenario {
    const { sophistication = 'medium', stealthLevel = 'medium', duration = 7 } = options;

    // Select techniques based on objectives and sophistication
    const techniques = this.selectTechniques(objectives, sophistication, stealthLevel);

    // Build kill chain phases
    const killChainPhases = this.buildKillChain(techniques);

    // Generate timeline
    const timeline = this.generateTimeline(techniques, duration);

    // Define success criteria
    const successCriteria = this.defineSuccessCriteria(objectives);

    return {
      id: this.generateId(),
      name,
      description: `Attack scenario targeting: ${objectives.join(', ')}`,
      objectives,
      techniques,
      killChainPhases,
      targetEnvironment,
      timeline,
      successCriteria,
      metadata: {
        sophistication,
        stealthLevel,
        generatedAt: new Date().toISOString()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Generate APT-style campaign
   */
  generateAPTCampaign(
    aptGroup: string,
    targetSector: string,
    targetEnvironment: TargetEnvironment
  ): AttackScenario {
    // APT-specific technique selection
    const aptTechniques = this.getAPTTechniques(aptGroup);

    return this.generateScenario(
      `${aptGroup} Campaign Emulation - ${targetSector}`,
      ['Initial Access', 'Persistence', 'Data Exfiltration'],
      targetEnvironment,
      { sophistication: 'high', stealthLevel: 'high', duration: 30 }
    );
  }

  private selectTechniques(
    objectives: string[],
    sophistication: string,
    stealthLevel: string
  ): AttackTechnique[] {
    const techniques: AttackTechnique[] = [];

    // Always include reconnaissance and initial access
    techniques.push(...this.mitreLibrary.getTechniquesByTactic(MITRETactic.INITIAL_ACCESS).slice(0, 2));

    // Add execution techniques
    techniques.push(...this.mitreLibrary.getTechniquesByTactic(MITRETactic.EXECUTION).slice(0, 2));

    // Add persistence for long-term access objectives
    if (objectives.some(o => o.toLowerCase().includes('persist'))) {
      techniques.push(...this.mitreLibrary.getTechniquesByTactic(MITRETactic.PERSISTENCE).slice(0, 2));
    }

    // Add privilege escalation for admin access objectives
    if (objectives.some(o => o.toLowerCase().includes('admin') || o.toLowerCase().includes('privilege'))) {
      techniques.push(...this.mitreLibrary.getTechniquesByTactic(MITRETactic.PRIVILEGE_ESCALATION).slice(0, 1));
    }

    // Add credential access for credential objectives
    if (objectives.some(o => o.toLowerCase().includes('credential'))) {
      techniques.push(...this.mitreLibrary.getTechniquesByTactic(MITRETactic.CREDENTIAL_ACCESS).slice(0, 1));
    }

    // Add lateral movement for network objectives
    if (objectives.some(o => o.toLowerCase().includes('lateral') || o.toLowerCase().includes('network'))) {
      techniques.push(...this.mitreLibrary.getTechniquesByTactic(MITRETactic.LATERAL_MOVEMENT).slice(0, 1));
    }

    // Add collection and exfiltration for data objectives
    if (objectives.some(o => o.toLowerCase().includes('data') || o.toLowerCase().includes('exfil'))) {
      techniques.push(...this.mitreLibrary.getTechniquesByTactic(MITRETactic.COLLECTION).slice(0, 1));
      techniques.push(...this.mitreLibrary.getTechniquesByTactic(MITRETactic.EXFILTRATION).slice(0, 1));
    }

    // Add defense evasion for stealthy operations
    if (stealthLevel === 'high') {
      techniques.push(...this.mitreLibrary.getTechniquesByTactic(MITRETactic.DEFENSE_EVASION).slice(0, 2));
    }

    // Add C2 techniques
    techniques.push(...this.mitreLibrary.getTechniquesByTactic(MITRETactic.COMMAND_AND_CONTROL).slice(0, 1));

    return techniques;
  }

  private buildKillChain(techniques: AttackTechnique[]): KillChainPhase[] {
    const phases: Set<KillChainPhase> = new Set();

    for (const technique of techniques) {
      switch (technique.tactic) {
        case MITRETactic.RECONNAISSANCE:
          phases.add(KillChainPhase.RECONNAISSANCE);
          break;
        case MITRETactic.INITIAL_ACCESS:
          phases.add(KillChainPhase.DELIVERY);
          phases.add(KillChainPhase.EXPLOITATION);
          break;
        case MITRETactic.EXECUTION:
        case MITRETactic.PERSISTENCE:
          phases.add(KillChainPhase.INSTALLATION);
          break;
        case MITRETactic.COMMAND_AND_CONTROL:
          phases.add(KillChainPhase.COMMAND_AND_CONTROL);
          break;
        case MITRETactic.EXFILTRATION:
        case MITRETactic.IMPACT:
          phases.add(KillChainPhase.ACTIONS_ON_OBJECTIVES);
          break;
      }
    }

    return Array.from(phases);
  }

  private generateTimeline(
    techniques: AttackTechnique[],
    durationDays: number
  ): ScenarioTimeline {
    const phases: Array<{
      name: string;
      startTime: number;
      endTime: number;
      techniques: string[];
      objectives: string[];
    }> = [];

    const totalHours = durationDays * 24;
    const phaseCount = 5;
    const phaseDuration = totalHours / phaseCount;

    // Group techniques by phase
    const phaseNames = ['Reconnaissance', 'Initial Access', 'Establish Foothold', 'Move & Discover', 'Achieve Objectives'];

    for (let i = 0; i < phaseCount; i++) {
      const startIdx = Math.floor((i / phaseCount) * techniques.length);
      const endIdx = Math.floor(((i + 1) / phaseCount) * techniques.length);
      const phaseTechniques = techniques.slice(startIdx, endIdx);

      phases.push({
        name: phaseNames[i],
        startTime: i * phaseDuration,
        endTime: (i + 1) * phaseDuration,
        techniques: phaseTechniques.map(t => t.id),
        objectives: [`Complete ${phaseNames[i]} phase`]
      });
    }

    return {
      phases,
      totalDuration: totalHours,
      milestones: [
        { name: 'Initial Compromise', time: phaseDuration, criteria: ['Gain initial access'] },
        { name: 'Persistence Established', time: 2 * phaseDuration, criteria: ['Establish persistence mechanism'] },
        { name: 'Objective Achieved', time: totalHours, criteria: ['Complete primary objectives'] }
      ]
    };
  }

  private defineSuccessCriteria(objectives: string[]): SuccessCriterion[] {
    return objectives.map((objective, index) => ({
      id: `criterion_${index + 1}`,
      description: objective,
      metric: 'completion',
      target: 100,
      achieved: false
    }));
  }

  private getAPTTechniques(_aptGroup: string): AttackTechnique[] {
    // Return techniques commonly used by APT groups
    return this.mitreLibrary.getAllTechniques().slice(0, 10);
  }

  private generateId(): string {
    return `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
