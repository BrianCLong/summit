export const features = {
  policyReasoner:
    process.env.FEATURES_POLICY_REASONER === 'false' ? false : true,
};

export interface FeatureOverrides {
  policyReasoner?: boolean;
}

export function setFeatureOverrides(overrides: FeatureOverrides) {
  if (typeof overrides.policyReasoner === 'boolean') {
    features.policyReasoner = overrides.policyReasoner;
  }
}
