export const REDLINES = [
  "autonomous_lethal_action",
  "mass_surveillance",
  "unauthorized_biometric_identification",
  "social_scoring",
  "critical_infrastructure_disruption",
  "CBRN_material_generation"
];

export const isRedline = (intent: string): boolean => {
  return REDLINES.includes(intent);
};
