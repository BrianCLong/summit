export type SwitchboardCapability = string;

export type SwitchboardRegistryEntry = {
  id: string;
  displayName: string;
  transport: 'stdio' | 'http';
  endpoint: string;
  capabilities: SwitchboardCapability[];
  authRef?: string;
  healthcheck?: { timeoutMs: number };
};

export type RoutingDecision = {
  requestedCapabilities: SwitchboardCapability[];
  chosenServerId?: string;
  deniedReason?: string;
};

export type SwitchboardAuthContext = {
  authRef: string;
  redacted: string;
};

export type SwitchboardHydratedConfig = {
  endpoint: string;
  transport: SwitchboardRegistryEntry['transport'];
  auth: SwitchboardAuthContext;
};
