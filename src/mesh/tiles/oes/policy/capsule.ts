export interface PolicyCapsule {
  version: string;
  classification: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
  exportControl: {
    jurisdiction: string;
    restrictions: string[];
  };
  audit: {
    enabled: boolean;
    logLevel: "INFO" | "DEBUG" | "WARN" | "ERROR";
  };
}

export const DEFAULT_POLICY: PolicyCapsule = {
  version: "1.0.0",
  classification: "INTERNAL",
  exportControl: {
    jurisdiction: "US",
    restrictions: ["NO_FOREIGN_NATIONALS"],
  },
  audit: {
    enabled: true,
    logLevel: "INFO",
  },
};
