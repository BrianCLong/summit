
export interface FinanceRecord {
  id: string;
  amount: number;
  currency: string;
  date: string;
  invoiceId?: string;
  description?: string;
}

export interface SSOLog {
  id: string;
  userId: string;
  timestamp: string;
  action: 'login' | 'logout' | 'failed_login';
}

export interface ExpenseRecord {
  id: string;
  employeeId: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  description?: string;
}

export interface DataAccess {
  systems: string[];
  dataTypes: string[]; // e.g., "PII", "Financial", "Health"
  accessMethods: string[]; // e.g., "API", "Portal", "SFTP"
}

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

  // Epic 1 additions
  owner?: string;
  purpose?: string;
  costCenter?: string;
  renewalDate?: string;
  usageLevel?: 'high' | 'medium' | 'low';
  criticality?: 'Tier 0' | 'Tier 1' | 'Tier 2';

  dataAccess?: DataAccess;

  // Inventory data
  financeRecords?: FinanceRecord[];
  ssoLogs?: SSOLog[];
  expenseData?: ExpenseRecord[];

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
