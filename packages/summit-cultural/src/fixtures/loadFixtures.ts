import populationsRaw from "./populations.fixture.json" with { type: "json" };
import narrativesRaw from "./narratives.fixture.json" with { type: "json" };
import fingerprintsRaw from "./linguisticSignals.fixture.json" with { type: "json" };
import { validateCulturalFixtures } from "../validation/validateFixtures.js";
import type {
  LinguisticFingerprint,
  NarrativeSignal,
  PopulationGroup
} from "../types.js";

export function loadValidatedFixtures(): {
  populations: PopulationGroup[];
  narratives: NarrativeSignal[];
  fingerprints: LinguisticFingerprint[];
} {
  const result = validateCulturalFixtures({
    populations: populationsRaw as unknown[],
    narratives: narrativesRaw as unknown[],
    fingerprints: fingerprintsRaw as unknown[]
  });

  return {
    populations: result.populations as PopulationGroup[],
    narratives: result.narratives as NarrativeSignal[],
    fingerprints: result.fingerprints as LinguisticFingerprint[]
  };
}
