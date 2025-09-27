export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export interface CveRecord {
  id: string;
  severity: Severity;
  published: string;
  summary: string;
  score: number;
}

export interface ToolRiskProfile {
  tool: string;
  version: string;
  sbomDigest: string;
  dataAccessScope: 'none' | 'read' | 'write' | 'admin';
  networkEgressClasses: Array<'none' | 'restricted' | 'unrestricted'>;
  cves: CveRecord[];
  riskScore: number;
  lastUpdated: string;
}

export interface ToolProfileInput {
  tool: string;
  version: string;
  sbomDigest: string;
  dataAccessScope: ToolRiskProfile['dataAccessScope'];
  networkEgressClasses: ToolRiskProfile['networkEgressClasses'];
}

export interface AllowlistEntry {
  tool: string;
  version: string;
  riskScore: number;
  sbomDigest: string;
  dataAccessScope: ToolRiskProfile['dataAccessScope'];
  networkEgressClasses: ToolRiskProfile['networkEgressClasses'];
}

export interface AllowlistManifest {
  environment: string;
  generatedAt: string;
  entries: AllowlistEntry[];
  signature: string;
  signer: string;
}

export interface NvdFeedCveItem {
  cve: {
    id: string;
    descriptions: Array<{ lang: string; value: string }>;
    metrics?: {
      cvssMetricV31?: Array<{ cvssData: { baseScore: number; baseSeverity: string } }>;
      cvssMetricV30?: Array<{ cvssData: { baseScore: number; baseSeverity: string } }>;
      cvssMetricV2?: Array<{ cvssData: { baseScore: number; baseSeverity: string } }>;
    };
    weaknesses?: Array<unknown>;
    configurations?: {
      nodes: Array<{
        cpeMatch?: Array<{
          vulnerable: boolean;
          criteria: string;
        }>;
      }>;
    };
  };
  published: string;
}

export interface NvdFeed {
  vulnerabilities: Array<{ cve: NvdFeedCveItem['cve']; published: string }>;
}

export interface RiskComputationOptions {
  cveWeightOverride?: Partial<Record<Severity, number>>;
  dataAccessWeights?: Record<ToolRiskProfile['dataAccessScope'], number>;
  networkWeights?: Record<'none' | 'restricted' | 'unrestricted', number>;
  baseScore?: number;
}

export interface AllowlistOptions {
  environment: string;
  riskThreshold: number;
  includeTools?: string[];
  excludeTools?: string[];
}
