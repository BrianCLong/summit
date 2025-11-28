
export interface Vendor {
  id: string;
  name: string;
  domain: string;
  tier: 'strategic' | 'preferred' | 'tactical' | 'commodity';
  status: 'active' | 'probation' | 'inactive';
  complianceStatus: {
    soc2: boolean;
    iso27001: boolean;
    gdpr: boolean;
    lastAuditDate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Component {
  name: string;
  version: string;
  purl?: string; // Package URL
  license?: string;
}

export interface Vulnerability {
  cveId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number; // CVSS
  description: string;
  affectedComponent: string;
}

export interface SBOM {
  id: string;
  vendorId: string;
  productName: string;
  version: string;
  components: Component[];
  vulnerabilities: Vulnerability[];
  uploadedAt: string;
}

export interface ContractAnalysis {
  id: string;
  vendorId: string;
  hasIndemnification: boolean;
  hasSLA: boolean;
  hasSecurityRequirements: boolean;
  hasIncidentReporting: boolean;
  riskFactors: string[];
  analyzedAt: string;
}

export interface SupplyChainRiskScore {
  vendorId: string;
  overallScore: number; // 0-100, where 100 is safe, 0 is critical risk
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  breakdown: {
    vulnerabilityRisk: number;
    complianceRisk: number;
    contractRisk: number;
  };
  evaluatedAt: string;
}
