import type { CogBattleStorage } from '../storage';
import type {
  Belief,
  BeliefClaimLink,
  Narrative,
  NarrativeClaimLink,
  RealityClaim,
} from '../types';

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const intersection = Array.from(a).filter((item) => b.has(item)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function bestClaimMatch(
  text: string,
  claims: RealityClaim[],
): { claim?: RealityClaim; score: number } {
  const tokens = tokenize(text);
  let bestScore = 0;
  let best: RealityClaim | undefined;

  for (const claim of claims) {
    const claimScore = jaccard(tokens, tokenize(claim.statement));
    if (claimScore > bestScore) {
      bestScore = claimScore;
      best = claim;
    }
  }

  return { claim: best, score: bestScore };
}

export async function linkNarrativesToReality(
  _store: CogBattleStorage,
  narratives: Narrative[],
  claims: RealityClaim[],
): Promise<NarrativeClaimLink[]> {
  const now = new Date().toISOString();
  const links: NarrativeClaimLink[] = [];

  for (const narrative of narratives) {
    const match = bestClaimMatch(`${narrative.label} ${narrative.summary}`, claims);
    if (!match.claim || match.score < 0.08) {
      continue;
    }

    const contradictoryLanguage = /hoax|fake|lie|cover[- ]up|not true/i.test(
      narrative.summary,
    );

    links.push({
      id: `ncl_${narrative.id}_${match.claim.id}`,
      narrativeId: narrative.id,
      claimId: match.claim.id,
      type: contradictoryLanguage ? 'contradicts' : 'references',
      score: Math.min(
        1,
        Number((match.score + narrative.metrics.velocity * 0.02).toFixed(2)),
      ),
      observedAt: now,
      provenance: {
        method: 'lexical-linker-v1',
        artifactIds: narrative.provenance.derivedFromArtifacts,
      },
    });
  }

  return links;
}

export async function linkBeliefsToReality(
  _store: CogBattleStorage,
  beliefs: Belief[],
  claims: RealityClaim[],
): Promise<BeliefClaimLink[]> {
  const asOf = new Date().toISOString();
  const links: BeliefClaimLink[] = [];

  for (const belief of beliefs) {
    const match = bestClaimMatch(belief.proposition, claims);
    if (!match.claim || match.score < 0.08) {
      continue;
    }

    links.push({
      id: `bcl_${belief.id}_${match.claim.id}`,
      beliefId: belief.id,
      claimId: match.claim.id,
      type: belief.polarity === 'oppose' ? 'diverges' : 'aligned',
      gap:
        belief.polarity === 'oppose'
          ? Number((1 - belief.confidence).toFixed(2))
          : Number((1 - match.score).toFixed(2)),
      asOf,
      provenance: {
        method: 'belief-gap-v1',
      },
    });
  }

  return links;
}
