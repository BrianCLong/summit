export type PGUseCase =
  | 'detection'
  | 'attribution'
  | 'forecasting'
  | 'training';

export type PGContentSafety = {
  forbidPrescriptiveContent: true;
  forbidRecommendedActionsInOutputs: true;
  prescriptiveLanguageHeuristics: {
    forbiddenPhrases: string[];
  };
};

export const DEFAULT_PG_CONTENT_SAFETY: PGContentSafety = {
  forbidPrescriptiveContent: true,
  forbidRecommendedActionsInOutputs: true,
  prescriptiveLanguageHeuristics: {
    forbiddenPhrases: [
      'you should',
      'do this',
      'next step',
      'optimal',
      'to achieve',
      'how to',
      'instructions',
      'execute',
      'deploy',
      'weaponize',
      'exploit',
      'bypass'
    ]
  }
};
