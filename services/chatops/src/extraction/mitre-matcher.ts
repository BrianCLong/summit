/**
 * MITRE ATT&CK Pattern Matcher
 *
 * Extracts and links MITRE ATT&CK references from text:
 * - Technique IDs (T1234, T1234.001)
 * - Tactic names
 * - Technique names
 * - Software/malware names
 * - Group names
 *
 * Features:
 * - Pattern-based extraction
 * - Fuzzy name matching
 * - ATT&CK Navigator export
 * - Technique relationships
 * - Detection coverage analysis
 */

import Anthropic from '@anthropic-ai/sdk';

// =============================================================================
// MITRE ATT&CK DATA
// =============================================================================

// Tactic definitions (ordered by kill chain)
const TACTICS = [
  { id: 'TA0043', name: 'Reconnaissance', shortName: 'recon' },
  { id: 'TA0042', name: 'Resource Development', shortName: 'resource-development' },
  { id: 'TA0001', name: 'Initial Access', shortName: 'initial-access' },
  { id: 'TA0002', name: 'Execution', shortName: 'execution' },
  { id: 'TA0003', name: 'Persistence', shortName: 'persistence' },
  { id: 'TA0004', name: 'Privilege Escalation', shortName: 'privilege-escalation' },
  { id: 'TA0005', name: 'Defense Evasion', shortName: 'defense-evasion' },
  { id: 'TA0006', name: 'Credential Access', shortName: 'credential-access' },
  { id: 'TA0007', name: 'Discovery', shortName: 'discovery' },
  { id: 'TA0008', name: 'Lateral Movement', shortName: 'lateral-movement' },
  { id: 'TA0009', name: 'Collection', shortName: 'collection' },
  { id: 'TA0011', name: 'Command and Control', shortName: 'command-and-control' },
  { id: 'TA0010', name: 'Exfiltration', shortName: 'exfiltration' },
  { id: 'TA0040', name: 'Impact', shortName: 'impact' },
];

// Common techniques (subset for demonstration)
const COMMON_TECHNIQUES: TechniqueDefinition[] = [
  { id: 'T1566', name: 'Phishing', tactic: 'TA0001', keywords: ['phishing', 'spear phishing', 'spearphishing'] },
  { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'TA0001', keywords: ['attachment', 'malicious document'] },
  { id: 'T1566.002', name: 'Spearphishing Link', tactic: 'TA0001', keywords: ['malicious link', 'phishing link'] },
  { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'TA0001', keywords: ['exploit', 'vulnerability', 'CVE'] },
  { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'TA0002', keywords: ['powershell', 'bash', 'script'] },
  { id: 'T1059.001', name: 'PowerShell', tactic: 'TA0002', keywords: ['powershell', 'ps1'] },
  { id: 'T1059.003', name: 'Windows Command Shell', tactic: 'TA0002', keywords: ['cmd', 'command shell', 'bat'] },
  { id: 'T1053', name: 'Scheduled Task/Job', tactic: 'TA0003', keywords: ['scheduled task', 'cron', 'persistence'] },
  { id: 'T1547', name: 'Boot or Logon Autostart Execution', tactic: 'TA0003', keywords: ['autorun', 'startup', 'registry run'] },
  { id: 'T1078', name: 'Valid Accounts', tactic: 'TA0004', keywords: ['valid accounts', 'compromised credentials'] },
  { id: 'T1027', name: 'Obfuscated Files or Information', tactic: 'TA0005', keywords: ['obfuscation', 'encoding', 'packing'] },
  { id: 'T1562', name: 'Impair Defenses', tactic: 'TA0005', keywords: ['disable security', 'disable antivirus'] },
  { id: 'T1003', name: 'OS Credential Dumping', tactic: 'TA0006', keywords: ['credential dump', 'mimikatz', 'lsass'] },
  { id: 'T1003.001', name: 'LSASS Memory', tactic: 'TA0006', keywords: ['lsass', 'memory dump'] },
  { id: 'T1110', name: 'Brute Force', tactic: 'TA0006', keywords: ['brute force', 'password spray', 'credential stuffing'] },
  { id: 'T1087', name: 'Account Discovery', tactic: 'TA0007', keywords: ['account enumeration', 'user discovery'] },
  { id: 'T1046', name: 'Network Service Discovery', tactic: 'TA0007', keywords: ['port scan', 'network scan', 'nmap'] },
  { id: 'T1021', name: 'Remote Services', tactic: 'TA0008', keywords: ['rdp', 'ssh', 'remote desktop'] },
  { id: 'T1021.001', name: 'Remote Desktop Protocol', tactic: 'TA0008', keywords: ['rdp', 'remote desktop'] },
  { id: 'T1570', name: 'Lateral Tool Transfer', tactic: 'TA0008', keywords: ['lateral movement', 'tool transfer'] },
  { id: 'T1005', name: 'Data from Local System', tactic: 'TA0009', keywords: ['data collection', 'file collection'] },
  { id: 'T1071', name: 'Application Layer Protocol', tactic: 'TA0011', keywords: ['c2', 'command and control', 'http', 'dns'] },
  { id: 'T1071.001', name: 'Web Protocols', tactic: 'TA0011', keywords: ['http c2', 'https c2', 'web traffic'] },
  { id: 'T1048', name: 'Exfiltration Over Alternative Protocol', tactic: 'TA0010', keywords: ['exfiltration', 'data theft'] },
  { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'TA0040', keywords: ['ransomware', 'encryption', 'crypto'] },
  { id: 'T1489', name: 'Service Stop', tactic: 'TA0040', keywords: ['service stop', 'disable service'] },
];

// Common threat groups
const THREAT_GROUPS: GroupDefinition[] = [
  { id: 'G0016', name: 'APT29', aliases: ['Cozy Bear', 'The Dukes', 'YTTRIUM'] },
  { id: 'G0007', name: 'APT28', aliases: ['Fancy Bear', 'Sofacy', 'STRONTIUM'] },
  { id: 'G0032', name: 'Lazarus Group', aliases: ['Hidden Cobra', 'ZINC', 'APT38'] },
  { id: 'G0034', name: 'Sandworm', aliases: ['Voodoo Bear', 'IRIDIUM', 'BlackEnergy'] },
  { id: 'G0046', name: 'FIN7', aliases: ['Carbanak', 'CARBON SPIDER'] },
  { id: 'G0059', name: 'Magic Hound', aliases: ['APT35', 'Phosphorus', 'Charming Kitten'] },
  { id: 'G0010', name: 'Turla', aliases: ['Snake', 'Venomous Bear', 'KRYPTON'] },
  { id: 'G0096', name: 'APT41', aliases: ['Wicked Panda', 'Barium', 'Winnti'] },
];

// =============================================================================
// TYPES
// =============================================================================

interface TechniqueDefinition {
  id: string;
  name: string;
  tactic: string;
  keywords: string[];
}

interface GroupDefinition {
  id: string;
  name: string;
  aliases: string[];
}

export interface MITREMatch {
  type: 'technique' | 'tactic' | 'group' | 'software';
  id: string;
  name: string;
  confidence: number;
  matchedText: string;
  position: {
    start: number;
    end: number;
  };
  metadata?: Record<string, unknown>;
}

export interface MITREExtractionResult {
  techniques: MITREMatch[];
  tactics: MITREMatch[];
  groups: MITREMatch[];
  software: MITREMatch[];
  killChainPhases: string[];
  navigatorLayer?: NavigatorLayer;
}

export interface NavigatorLayer {
  name: string;
  version: string;
  domain: string;
  description: string;
  techniques: Array<{
    techniqueID: string;
    score: number;
    comment?: string;
    color?: string;
  }>;
}

export interface MITREMatcherConfig {
  anthropicApiKey?: string;
  useLLMExtraction?: boolean;
  confidenceThreshold?: number;
}

// =============================================================================
// MITRE MATCHER
// =============================================================================

export class MITREMatcher {
  private config: Required<MITREMatcherConfig>;
  private anthropic?: Anthropic;

  constructor(config: MITREMatcherConfig = {}) {
    this.config = {
      anthropicApiKey: config.anthropicApiKey ?? '',
      useLLMExtraction: config.useLLMExtraction ?? false,
      confidenceThreshold: config.confidenceThreshold ?? 0.6,
    };

    if (this.config.anthropicApiKey && this.config.useLLMExtraction) {
      this.anthropic = new Anthropic({
        apiKey: this.config.anthropicApiKey,
      });
    }
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Extract MITRE ATT&CK references from text
   */
  async extract(text: string): Promise<MITREExtractionResult> {
    const techniques = this.extractTechniques(text);
    const tactics = this.extractTactics(text);
    const groups = this.extractGroups(text);
    const software = this.extractSoftware(text);

    // Optionally enhance with LLM
    if (this.config.useLLMExtraction && this.anthropic) {
      const llmMatches = await this.extractWithLLM(text);
      this.mergeMatches(techniques, llmMatches.techniques);
      this.mergeMatches(tactics, llmMatches.tactics);
      this.mergeMatches(groups, llmMatches.groups);
    }

    // Determine kill chain phases
    const killChainPhases = this.getKillChainPhases(techniques);

    // Generate Navigator layer
    const navigatorLayer = this.generateNavigatorLayer(techniques, text);

    return {
      techniques: techniques.filter((t) => t.confidence >= this.config.confidenceThreshold),
      tactics: tactics.filter((t) => t.confidence >= this.config.confidenceThreshold),
      groups: groups.filter((t) => t.confidence >= this.config.confidenceThreshold),
      software: software.filter((t) => t.confidence >= this.config.confidenceThreshold),
      killChainPhases,
      navigatorLayer,
    };
  }

  /**
   * Get technique details by ID
   */
  getTechniqueById(id: string): TechniqueDefinition | undefined {
    return COMMON_TECHNIQUES.find((t) => t.id === id);
  }

  /**
   * Get tactic details by ID
   */
  getTacticById(id: string): (typeof TACTICS)[0] | undefined {
    return TACTICS.find((t) => t.id === id);
  }

  /**
   * Get group details by ID or name
   */
  getGroup(idOrName: string): GroupDefinition | undefined {
    const normalized = idOrName.toLowerCase();
    return THREAT_GROUPS.find(
      (g) =>
        g.id.toLowerCase() === normalized ||
        g.name.toLowerCase() === normalized ||
        g.aliases.some((a) => a.toLowerCase() === normalized),
    );
  }

  /**
   * Get all techniques for a tactic
   */
  getTechniquesByTactic(tacticId: string): TechniqueDefinition[] {
    return COMMON_TECHNIQUES.filter((t) => t.tactic === tacticId);
  }

  // ===========================================================================
  // EXTRACTION METHODS
  // ===========================================================================

  private extractTechniques(text: string): MITREMatch[] {
    const matches: MITREMatch[] = [];

    // Pattern 1: Direct technique IDs (T1234, T1234.001)
    const idPattern = /\bT\d{4}(?:\.\d{3})?\b/gi;
    let match;

    while ((match = idPattern.exec(text)) !== null) {
      const id = match[0].toUpperCase();
      const technique = this.getTechniqueById(id);

      matches.push({
        type: 'technique',
        id,
        name: technique?.name ?? 'Unknown Technique',
        confidence: 0.99,
        matchedText: match[0],
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
        metadata: {
          tactic: technique?.tactic,
        },
      });
    }

    // Pattern 2: Keyword matching
    const lowerText = text.toLowerCase();

    for (const technique of COMMON_TECHNIQUES) {
      for (const keyword of technique.keywords) {
        const keywordLower = keyword.toLowerCase();
        let pos = 0;

        while ((pos = lowerText.indexOf(keywordLower, pos)) !== -1) {
          // Check if already matched by ID
          if (!matches.some((m) => m.position.start === pos)) {
            matches.push({
              type: 'technique',
              id: technique.id,
              name: technique.name,
              confidence: 0.7 + keyword.length * 0.01, // Longer keywords = higher confidence
              matchedText: text.substring(pos, pos + keyword.length),
              position: {
                start: pos,
                end: pos + keyword.length,
              },
              metadata: {
                tactic: technique.tactic,
                keyword,
              },
            });
          }
          pos += keyword.length;
        }
      }
    }

    // Deduplicate by ID, keeping highest confidence
    return this.deduplicateMatches(matches);
  }

  private extractTactics(text: string): MITREMatch[] {
    const matches: MITREMatch[] = [];
    const lowerText = text.toLowerCase();

    for (const tactic of TACTICS) {
      // Match by ID
      const idPattern = new RegExp(`\\b${tactic.id}\\b`, 'gi');
      let match;

      while ((match = idPattern.exec(text)) !== null) {
        matches.push({
          type: 'tactic',
          id: tactic.id,
          name: tactic.name,
          confidence: 0.99,
          matchedText: match[0],
          position: {
            start: match.index,
            end: match.index + match[0].length,
          },
        });
      }

      // Match by name
      const nameLower = tactic.name.toLowerCase();
      let pos = 0;

      while ((pos = lowerText.indexOf(nameLower, pos)) !== -1) {
        matches.push({
          type: 'tactic',
          id: tactic.id,
          name: tactic.name,
          confidence: 0.9,
          matchedText: text.substring(pos, pos + tactic.name.length),
          position: {
            start: pos,
            end: pos + tactic.name.length,
          },
        });
        pos += tactic.name.length;
      }
    }

    return this.deduplicateMatches(matches);
  }

  private extractGroups(text: string): MITREMatch[] {
    const matches: MITREMatch[] = [];
    const lowerText = text.toLowerCase();

    for (const group of THREAT_GROUPS) {
      // Match by primary name
      const nameLower = group.name.toLowerCase();
      let pos = 0;

      while ((pos = lowerText.indexOf(nameLower, pos)) !== -1) {
        matches.push({
          type: 'group',
          id: group.id,
          name: group.name,
          confidence: 0.95,
          matchedText: text.substring(pos, pos + group.name.length),
          position: {
            start: pos,
            end: pos + group.name.length,
          },
          metadata: {
            aliases: group.aliases,
          },
        });
        pos += group.name.length;
      }

      // Match by aliases
      for (const alias of group.aliases) {
        const aliasLower = alias.toLowerCase();
        pos = 0;

        while ((pos = lowerText.indexOf(aliasLower, pos)) !== -1) {
          if (!matches.some((m) => m.position.start === pos)) {
            matches.push({
              type: 'group',
              id: group.id,
              name: group.name,
              confidence: 0.9,
              matchedText: text.substring(pos, pos + alias.length),
              position: {
                start: pos,
                end: pos + alias.length,
              },
              metadata: {
                matchedAlias: alias,
                aliases: group.aliases,
              },
            });
          }
          pos += alias.length;
        }
      }
    }

    return this.deduplicateMatches(matches);
  }

  private extractSoftware(text: string): MITREMatch[] {
    // Common malware/tools
    const software = [
      { id: 'S0002', name: 'Mimikatz', keywords: ['mimikatz'] },
      { id: 'S0154', name: 'Cobalt Strike', keywords: ['cobalt strike', 'beacon'] },
      { id: 'S0367', name: 'Emotet', keywords: ['emotet'] },
      { id: 'S0446', name: 'Ryuk', keywords: ['ryuk'] },
      { id: 'S0483', name: 'TrickBot', keywords: ['trickbot'] },
      { id: 'S0650', name: 'QakBot', keywords: ['qakbot', 'qbot'] },
    ];

    const matches: MITREMatch[] = [];
    const lowerText = text.toLowerCase();

    for (const sw of software) {
      for (const keyword of sw.keywords) {
        let pos = 0;
        while ((pos = lowerText.indexOf(keyword, pos)) !== -1) {
          matches.push({
            type: 'software',
            id: sw.id,
            name: sw.name,
            confidence: 0.9,
            matchedText: text.substring(pos, pos + keyword.length),
            position: {
              start: pos,
              end: pos + keyword.length,
            },
          });
          pos += keyword.length;
        }
      }
    }

    return this.deduplicateMatches(matches);
  }

  private async extractWithLLM(text: string): Promise<{
    techniques: MITREMatch[];
    tactics: MITREMatch[];
    groups: MITREMatch[];
  }> {
    if (!this.anthropic) {
      return { techniques: [], tactics: [], groups: [] };
    }

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Analyze this text and extract MITRE ATT&CK references.

Text: "${text.slice(0, 2000)}"

Return JSON with arrays for techniques, tactics, and groups found. Include confidence scores.
Format: {"techniques": [{"id": "T1234", "name": "...", "confidence": 0.9}], "tactics": [...], "groups": [...]}`,
        },
      ],
    });

    try {
      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { techniques: [], tactics: [], groups: [] };

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        techniques: (parsed.techniques ?? []).map((t: any) => ({
          type: 'technique' as const,
          id: t.id,
          name: t.name,
          confidence: t.confidence ?? 0.8,
          matchedText: t.id,
          position: { start: 0, end: 0 },
        })),
        tactics: (parsed.tactics ?? []).map((t: any) => ({
          type: 'tactic' as const,
          id: t.id,
          name: t.name,
          confidence: t.confidence ?? 0.8,
          matchedText: t.id,
          position: { start: 0, end: 0 },
        })),
        groups: (parsed.groups ?? []).map((g: any) => ({
          type: 'group' as const,
          id: g.id,
          name: g.name,
          confidence: g.confidence ?? 0.8,
          matchedText: g.name,
          position: { start: 0, end: 0 },
        })),
      };
    } catch {
      return { techniques: [], tactics: [], groups: [] };
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private deduplicateMatches(matches: MITREMatch[]): MITREMatch[] {
    const byId = new Map<string, MITREMatch>();

    for (const match of matches) {
      const existing = byId.get(match.id);
      if (!existing || match.confidence > existing.confidence) {
        byId.set(match.id, match);
      }
    }

    return Array.from(byId.values());
  }

  private mergeMatches(target: MITREMatch[], source: MITREMatch[]): void {
    for (const match of source) {
      const existing = target.find((t) => t.id === match.id);
      if (!existing) {
        target.push(match);
      } else if (match.confidence > existing.confidence) {
        Object.assign(existing, match);
      }
    }
  }

  private getKillChainPhases(techniques: MITREMatch[]): string[] {
    const tacticIds = new Set<string>();

    for (const tech of techniques) {
      const technique = this.getTechniqueById(tech.id);
      if (technique) {
        tacticIds.add(technique.tactic);
      }
    }

    return TACTICS.filter((t) => tacticIds.has(t.id)).map((t) => t.name);
  }

  private generateNavigatorLayer(techniques: MITREMatch[], description: string): NavigatorLayer {
    return {
      name: 'ChatOps Extraction',
      version: '4.5',
      domain: 'enterprise-attack',
      description: `Auto-extracted from: ${description.slice(0, 100)}`,
      techniques: techniques.map((t) => ({
        techniqueID: t.id,
        score: Math.round(t.confidence * 100),
        comment: t.matchedText,
        color: this.getConfidenceColor(t.confidence),
      })),
    };
  }

  private getConfidenceColor(confidence: number): string {
    if (confidence >= 0.9) return '#ff6666'; // High confidence - red
    if (confidence >= 0.7) return '#ffcc66'; // Medium - orange
    return '#ffff66'; // Low - yellow
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createMITREMatcher(config?: MITREMatcherConfig): MITREMatcher {
  return new MITREMatcher(config);
}
