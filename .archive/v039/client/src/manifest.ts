// Resolved manifest (replace hashes from CI artifact out/persisted-manifest.resolved.json)
export const PERSISTED: Record<string, string> = {
  setFeatureFlags: '<sha256>',
  setCanaryWeights: '<sha256>',
  setSloThresholds: '<sha256>',
  proposeRemediation: '<sha256>',
  canaryPromote: '<sha256>',
  canaryHold: '<sha256>',
  evidencePack: '<sha256>',
  evidenceVerify: '<sha256>',
  regulatorExport: '<sha256>',
  podrRun: '<sha256>',
};
