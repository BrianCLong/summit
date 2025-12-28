
export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  type: 'RECOMMENDED' | 'AVAILABLE' | 'RESTRICTED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  constraints: string[]; // Reasons why this might be restricted or recommended
}

export interface DecisionContext {
  id: string; // e.g., "psyops-threat-response"
  name: string;
  description: string;
  inputs: {
    label: string;
    value: string | number | boolean;
    source?: string;
  }[];
  evidence: {
    sourceId: string; // Traceability to Provenance Ledger
    confidence: number; // 0.0 to 1.0
    uncertainties: string[];
    missingData: string[];
  };
  options: DecisionOption[];
}
