export interface LREGRequest {
  runId: string;
  caseId: string;
  kpwBundle: any;
  aer?: any;
  policyLogs: any[];
  dissentCoverage: number;
  attachments?: { name: string; path: string }[];
}
