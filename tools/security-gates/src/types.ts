export type GateResult = {
  gate: string;
  ok: boolean;
  details: string[];
};

export type WorkflowGateConfig = {
  workflowGlobs: string[];
  enforcePinnedActions: boolean;
  enforceMinimumPermissions: Record<string, 'read' | 'write'>;
};

export type ImageRequirement = {
  name: string;
  digest: string;
  signaturePath: string;
  provenancePath: string;
};

export type ImageGateConfig = {
  stageImages: ImageRequirement[];
};

export type SecretScanConfig = {
  paths: string[];
  excludedGlobs?: string[];
  allowPatterns?: string[];
};

export type PolicyGateConfig = {
  inputPath: string;
  denyWildcardIam: boolean;
  allowPublicEndpoints: boolean;
};

export type GateConfig = {
  workflowGate: WorkflowGateConfig;
  imageGate: ImageGateConfig;
  secretScan: SecretScanConfig;
  policyGate: PolicyGateConfig;
};
