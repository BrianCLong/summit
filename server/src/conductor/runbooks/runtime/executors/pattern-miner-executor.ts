/**
 * Pattern Miner Step Executor
 *
 * Handles campaign and TTP pattern matching for CTI attribution.
 *
 * @module runbooks/runtime/executors/pattern-miner-executor
 */

import { BaseStepExecutor } from './base';
import {
  StepExecutorContext,
  StepExecutorResult,
  RunbookActionType,
  PatternMinerService,
} from '../types';

/**
 * Campaign match result
 */
export interface CampaignMatch {
  campaignId: string;
  campaignName: string;
  score: number;
  matchedIndicators: number;
  matchedTTPs: string[];
  actorProfile?: {
    id: string;
    name: string;
    aliases: string[];
    motivation: string;
    sophistication: 'low' | 'medium' | 'high' | 'advanced';
    targetSectors: string[];
    geographicFocus: string[];
  };
  confidence: 'low' | 'medium' | 'high' | 'very_high';
}

/**
 * Known threat actor profiles for simulation
 */
const KNOWN_THREAT_ACTORS = [
  {
    id: 'apt28',
    name: 'APT28',
    aliases: ['Fancy Bear', 'Sofacy', 'Sednit', 'Pawn Storm'],
    motivation: 'espionage',
    sophistication: 'advanced' as const,
    targetSectors: ['government', 'military', 'aerospace', 'defense'],
    geographicFocus: ['US', 'EU', 'NATO', 'Ukraine'],
    knownTTPs: ['T1566', 'T1078', 'T1059', 'T1071', 'T1027'],
  },
  {
    id: 'apt29',
    name: 'APT29',
    aliases: ['Cozy Bear', 'The Dukes', 'Nobelium'],
    motivation: 'espionage',
    sophistication: 'advanced' as const,
    targetSectors: ['government', 'think_tanks', 'healthcare', 'technology'],
    geographicFocus: ['US', 'EU', 'Five Eyes'],
    knownTTPs: ['T1195', 'T1078', 'T1098', 'T1136', 'T1550'],
  },
  {
    id: 'lazarus',
    name: 'Lazarus Group',
    aliases: ['Hidden Cobra', 'Zinc', 'Labyrinth Chollima'],
    motivation: 'financial_espionage',
    sophistication: 'advanced' as const,
    targetSectors: ['financial', 'cryptocurrency', 'media', 'aerospace'],
    geographicFocus: ['Global', 'South Korea', 'US'],
    knownTTPs: ['T1486', 'T1496', 'T1059', 'T1055', 'T1547'],
  },
  {
    id: 'fin7',
    name: 'FIN7',
    aliases: ['Carbanak', 'Navigator Group'],
    motivation: 'financial',
    sophistication: 'high' as const,
    targetSectors: ['retail', 'hospitality', 'financial'],
    geographicFocus: ['US', 'EU'],
    knownTTPs: ['T1566', 'T1059', 'T1055', 'T1003', 'T1021'],
  },
  {
    id: 'apt41',
    name: 'APT41',
    aliases: ['Winnti', 'Barium', 'Wicked Panda'],
    motivation: 'espionage_financial',
    sophistication: 'advanced' as const,
    targetSectors: ['gaming', 'healthcare', 'technology', 'telecommunications'],
    geographicFocus: ['Global'],
    knownTTPs: ['T1195', 'T1059', 'T1105', 'T1055', 'T1027'],
  },
];

/**
 * Default pattern miner service implementation
 */
export class DefaultPatternMinerService implements PatternMinerService {
  async findMatchingCampaigns(input: {
    infraNodeIds: string[];
    indicatorNodeIds?: string[];
    minConfidence?: number;
  }): Promise<{
    campaignIds: string[];
    matches: CampaignMatch[];
  }> {
    const minConfidence = input.minConfidence ?? 0.3;
    const matches: CampaignMatch[] = [];

    // Simulate pattern matching against known threat actors
    for (const actor of KNOWN_THREAT_ACTORS) {
      const score = this.calculateMatchScore(
        input.infraNodeIds,
        input.indicatorNodeIds || [],
        actor
      );

      if (score >= minConfidence) {
        const matchedTTPs = this.selectRandomTTPs(actor.knownTTPs, score);

        matches.push({
          campaignId: `campaign-${actor.id}-${Date.now()}`,
          campaignName: `${actor.name} Campaign ${new Date().getFullYear()}`,
          score,
          matchedIndicators: Math.floor(
            (input.indicatorNodeIds?.length || input.infraNodeIds.length) * score
          ),
          matchedTTPs,
          actorProfile: {
            id: actor.id,
            name: actor.name,
            aliases: actor.aliases,
            motivation: actor.motivation,
            sophistication: actor.sophistication,
            targetSectors: actor.targetSectors,
            geographicFocus: actor.geographicFocus,
          },
          confidence: this.scoreToConfidence(score),
        });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    return {
      campaignIds: matches.map((m) => m.campaignId),
      matches,
    };
  }

  private calculateMatchScore(
    infraNodeIds: string[],
    indicatorNodeIds: string[],
    actor: typeof KNOWN_THREAT_ACTORS[0]
  ): number {
    // Simulate scoring based on various factors
    const baseScore = Math.random() * 0.5 + 0.2; // 0.2 to 0.7
    const infraBonus = Math.min(infraNodeIds.length * 0.02, 0.2);
    const indicatorBonus = Math.min(indicatorNodeIds.length * 0.01, 0.1);

    return Math.min(baseScore + infraBonus + indicatorBonus, 1.0);
  }

  private selectRandomTTPs(ttps: string[], score: number): string[] {
    const count = Math.max(1, Math.floor(ttps.length * score));
    const shuffled = [...ttps].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private scoreToConfidence(score: number): 'low' | 'medium' | 'high' | 'very_high' {
    if (score >= 0.85) return 'very_high';
    if (score >= 0.7) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }
}

/**
 * Pattern miner step executor for campaign matching
 */
export class PatternMinerStepExecutor extends BaseStepExecutor {
  readonly actionType: RunbookActionType = 'PATTERN_MINER';

  constructor(
    private readonly patternService: PatternMinerService = new DefaultPatternMinerService()
  ) {
    super();
  }

  async execute(ctx: StepExecutorContext): Promise<StepExecutorResult> {
    try {
      // Get infrastructure and indicator node IDs from previous steps
      const infraNodeIds =
        this.findPreviousOutput<string[]>(ctx, 'infraNodeIds') ||
        this.getInput<string[]>(ctx, 'infraNodeIds', []);

      const indicatorNodeIds =
        this.findPreviousOutput<string[]>(ctx, 'indicatorNodeIds') ||
        this.getInput<string[]>(ctx, 'indicatorNodeIds', []);

      if (infraNodeIds.length === 0 && indicatorNodeIds.length === 0) {
        return this.failure('No infrastructure or indicator node IDs provided for pattern mining');
      }

      const minConfidence = this.getConfig<number>(ctx, 'minConfidence', 0.3);

      // Call pattern miner service
      const result = await this.patternService.findMatchingCampaigns({
        infraNodeIds,
        indicatorNodeIds,
        minConfidence,
      });

      // Create citations for threat intelligence sources
      const citations = [
        this.createCitation(
          'MITRE ATT&CK Framework',
          'https://attack.mitre.org/',
          'MITRE Corporation',
          { version: 'v14', queryTime: new Date().toISOString() }
        ),
        this.createCitation(
          'Threat Actor Encyclopedia',
          'https://malpedia.caad.fkie.fraunhofer.de/',
          'Fraunhofer FKIE',
        ),
        this.createCitation(
          'MISP Threat Intelligence',
          'https://www.misp-project.org/',
          'MISP Project',
        ),
      ];

      // Create evidence
      const evidence = this.createEvidence(
        'campaign_matches',
        {
          matches: result.matches,
          totalMatches: result.matches.length,
          topMatch: result.matches[0] || null,
        },
        citations,
        {
          matchCount: result.matches.length,
          topScore: result.matches[0]?.score || 0,
          qualityScore: this.calculateQualityScore(result.matches),
        }
      );

      // Create proof
      const proof = this.createProof({
        infraNodeIds,
        indicatorNodeIds,
        matchCount: result.matches.length,
        timestamp: new Date().toISOString(),
      });
      evidence.proofs.push(proof);

      // Prepare campaign matches for output
      const campaignMatches = result.matches.map((m) => ({
        campaignId: m.campaignId,
        campaignName: m.campaignName,
        score: m.score,
        confidence: m.confidence,
        actorName: m.actorProfile?.name,
        actorId: m.actorProfile?.id,
      }));

      return this.success(
        {
          campaignIds: result.campaignIds,
          campaignMatches,
          matches: result.matches,
          matchCount: result.matches.length,
          topMatch: result.matches[0] || null,
        },
        {
          evidence: [evidence],
          citations,
          proofs: [proof],
          kpis: {
            matchedActors: result.matches.length,
            topConfidenceScore: result.matches[0]?.score || 0,
            highConfidenceMatches: result.matches.filter((m) => m.score >= 0.7).length,
            totalTTPsMatched: result.matches.reduce(
              (acc, m) => acc + m.matchedTTPs.length,
              0
            ),
          },
        }
      );
    } catch (error) {
      return this.failure(
        error instanceof Error ? error.message : 'Failed to mine patterns'
      );
    }
  }

  private calculateQualityScore(matches: CampaignMatch[]): number {
    if (matches.length === 0) return 0;

    let score = 0;
    for (const match of matches) {
      score += match.score * 0.4;
      if (match.actorProfile) score += 0.3;
      if (match.matchedTTPs.length > 0) score += 0.3;
    }
    return Math.min(score / matches.length, 1.0);
  }
}
