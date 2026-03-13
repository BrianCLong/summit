export type PGUseCase =
  | "detection"      // early warning via indicator matching
  | "attribution"    // explain observed outcomes via candidate playbooks
  | "forecasting"    // bounded scenario evaluation (non-prescriptive)
  | "training";      // analyst training / tabletop exercises

export type PGContentSafety = {
  // Hard rule: PG is not a recommendation engine.
  forbidPrescriptiveContent: true;

  // Hard rule: outputs cannot contain "recommended actions"
  forbidRecommendedActionsInOutputs: true;

  // Soft heuristic: flag imperative/prescriptive wording for review
  prescriptiveLanguageHeuristics: {
    forbiddenPhrases: string[];
  };
};

export const DEFAULT_PG_CONTENT_SAFETY: PGContentSafety = {
  forbidPrescriptiveContent: true,
  forbidRecommendedActionsInOutputs: true,
  prescriptiveLanguageHeuristics: {
    forbiddenPhrases: [
      "you should",
      "do this",
      "next step",
      "optimal",
      "to achieve",
      "how to",
      "instructions",
      "execute",
      "deploy",
      "weaponize",
      "exploit",
      "bypass"
    ]
  }
};
