export type CesFlagKey =
  | 'CES_ENABLED'
  | 'ECE_ENABLED'
  | 'CES_RAW_CONTENT_ENABLED'
  | 'CES_ENFORCEMENT_ENABLED'
  | 'CES_EXPORTS_ENABLED';

export interface CesFlagDefinition {
  key: CesFlagKey;
  defaultValue: boolean;
  description: string;
}

export const CES_FLAGS: Record<CesFlagKey, CesFlagDefinition> = {
  CES_ENABLED: {
    key: 'CES_ENABLED',
    defaultValue: false,
    description: 'Master kill-switch for Copilot Espionage Sentinel features.',
  },
  ECE_ENABLED: {
    key: 'ECE_ENABLED',
    defaultValue: false,
    description: 'Master kill-switch for Executive Comms Equilibrium simulations.',
  },
  CES_RAW_CONTENT_ENABLED: {
    key: 'CES_RAW_CONTENT_ENABLED',
    defaultValue: false,
    description: 'Allow raw content ingestion for CES. Defaults to disabled.',
  },
  CES_ENFORCEMENT_ENABLED: {
    key: 'CES_ENFORCEMENT_ENABLED',
    defaultValue: false,
    description: 'Enable CES enforcement actions. Defaults to disabled.',
  },
  CES_EXPORTS_ENABLED: {
    key: 'CES_EXPORTS_ENABLED',
    defaultValue: false,
    description: 'Enable CES signal exports. Defaults to disabled.',
  },
};

export const CES_FLAG_KEYS: CesFlagKey[] = Object.keys(CES_FLAGS) as CesFlagKey[];
