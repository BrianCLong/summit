export type InferenceProfile = 'civilian_safe' | 'defense_restricted' | 'research_unrestricted';

export const allowedUseMatrix: Record<InferenceProfile, string[]> = {
  civilian_safe: ['general_inquiry', 'content_creation', 'data_analysis', 'software_development'],
  defense_restricted: ['intelligence_analysis', 'logistics_planning', 'cyber_defense_simulation', 'scenario_modeling'],
  research_unrestricted: ['experimental_models', 'unverified_data_processing', 'synthetic_data_generation']
};

export const isAllowedUse = (profile: InferenceProfile, useCase: string): boolean => {
  return allowedUseMatrix[profile]?.includes(useCase) ?? false;
};
