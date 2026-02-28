export interface AuditLogEntry {
  timestamp: string;
  userId: string;
  requestId: string;
  action: string;
  intentClassification?: {
      intent: string;
      confidence: number;
      isRedline: boolean;
  };
  details: Record<string, any>;
  status: 'allowed' | 'denied' | 'flagged';
}

export const emitAuditLog = (entry: AuditLogEntry): void => {
  console.log(JSON.stringify(entry));
};
