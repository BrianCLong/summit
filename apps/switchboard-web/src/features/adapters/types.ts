export type AdapterStatus = "available" | "installed" | "enabled" | "disabled" | "error";

export interface AdapterReceipt {
  url: string;
  createdAt: string;
  action: "install" | "enable" | "disable" | "uninstall" | "verify";
}

export interface AdapterConfig {
  [key: string]:
    | string
    | number
    | boolean
    | null
    | AdapterConfig
    | Array<string | number | boolean | null>;
}

export interface Adapter {
  id: string;
  name: string;
  description?: string;
  status: AdapterStatus;
  version: string;
  config: AdapterConfig | string;
  lastRunAt?: string;
  lastError?: string | null;
  highPrivilege?: boolean;
  policyErrors?: string[];
  verificationErrors?: string[];
  receipts?: AdapterReceipt[];
}

export interface SwitchboardApiError extends Error {
  status?: number;
  policyErrors?: string[];
  verificationErrors?: string[];
}

export interface AdaptersResponse {
  adapters: Adapter[];
}

export interface AdapterActionPayload {
  dualControl?: {
    approver: string;
    justification: string;
  };
}

export interface AdapterActionResult {
  adapter: Adapter;
  receipt?: AdapterReceipt;
}
