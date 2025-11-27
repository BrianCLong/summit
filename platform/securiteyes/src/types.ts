export interface SuspiciousEvent {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: Date;
  source: string;
  details: Record<string, any>;
}

export interface Incident {
  id: string;
  title: string;
  events: SuspiciousEvent[];
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: Date;
}
