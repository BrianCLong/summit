import type { CogBattleStorage } from '../storage';
import type {
  Belief,
  BeliefClaimLink,
  Narrative,
  NarrativeClaimLink,
} from '../types';

export async function linkNarrativesToReality(
  _store: CogBattleStorage,
  _narratives: Narrative[],
): Promise<NarrativeClaimLink[]> {
  return [];
}

export async function linkBeliefsToReality(
  _store: CogBattleStorage,
  _beliefs: Belief[],
): Promise<BeliefClaimLink[]> {
  return [];
}
