// server/src/security/soc/models.ts

/**
 * Represents a cluster of correlated security events that may constitute an incident.
 */
export interface IncidentCandidate {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'triaged' | 'closed';
  evidenceRefs: string[]; // References to event IDs in the audit log
  entityRefs: string[]; // References to agents, principals, tools, resources
  summary: string; // Human-readable summary of the potential incident
  rationale: Record<string, any>; // Machine-readable features and correlation logic
}

/**
 * Represents a recommendation for an IncidentCandidate, such as a triage note or a remediation playbook.
 */
export interface Recommendation {
  id: string;
  incidentId: string;
  type: 'triage_note' | 'remediation_playbook';
  content: Record<string, any>; // Structured plan (steps, prerequisites, expected outcomes)
  confidence: number;
  riskRating: 'low' | 'medium' | 'high';
  provenance: {
    model?: string;
    prompt?: string;
    evidenceRefs: string[];
  };
  status: 'proposed' | 'approved' | 'rejected' | 'executed';
}

/**
 * Represents an approval or rejection of a Recommendation.
 */
export interface Approval {
  id: string;
  recommendationId: string;
  approver: string; // Principal chain
  timestamp: Date;
  decision: 'approved' | 'rejected';
  justification?: string;
}
